import { repos } from '../db/repository.js';
import { sumMoney, groupSumMoney, round2, addMoney } from '../utils/money.js';
import { resolveOrigineDecaissement } from '../utils/business.js';
import { calculerBulletinPaie } from '../utils/paie.js';
import { cotisationsEnAttente } from './versements.js';
import { adherentInput } from './paie.js';

/**
 * Traitement financier côté serveur : TOUS les totaux, ventilations et soldes affichés par le front sont calculés ici,
 * à partir des données stockées en MySQL, avec une arithmétique exacte au centime (utils/money.js).
 */

const MODES_MOBILE = ['Orange Money', 'Wave', 'Moov Money', 'MTN MoMo'];
const ORIGINE_CNPS = 'Exploitation (Cotisations CNPS)';
const ORIGINE_PCA = 'Apport personnel du PCA';
const parMois = (list, dateKey, valKey = 'montant') => groupSumMoney(list, (x) => String(x[dateKey] || '').slice(0, 7) || 'Sans date', (x) => x[valKey]);
const pct = (a, b) => (b > 0 ? round2((a / b) * 100) : a > 0 ? 100 : 0);

/** Agrège un jeu de cotisations / dépenses / versements / frais. */
function agreger({ cotisations, depenses, versements, frais }) {
  const totalCotisations = sumMoney(cotisations);
  const totalVersements = sumMoney(versements);
  const exploitation = depenses.filter((d) => resolveOrigineDecaissement(d) === ORIGINE_CNPS);
  const apport = depenses.filter((d) => resolveOrigineDecaissement(d) === ORIGINE_PCA);
  const mobile = cotisations.filter((c) => MODES_MOBILE.includes(c.modePaiement));

  return {
    cotisations: {
      nombre: cotisations.length,
      total: totalCotisations,
      mobileMoney: sumMoney(mobile),
      especes: sumMoney(cotisations.filter((c) => c.modePaiement === 'Espèces')),
      parMode: groupSumMoney(cotisations, (c) => c.modePaiement),
      parMois: parMois(cotisations, 'datePaiement'),
    },
    depenses: {
      nombre: depenses.length,
      total: sumMoney(depenses),
      payees: sumMoney(depenses.filter((d) => d.statut !== 'En attente')),
      enAttente: sumMoney(depenses.filter((d) => d.statut === 'En attente')),
      exploitationCnps: { nombre: exploitation.length, total: sumMoney(exploitation) },
      apportPca: { nombre: apport.length, total: sumMoney(apport) },
      parCategorie: groupSumMoney(depenses, (d) => d.categorie),
      parModePaiement: groupSumMoney(depenses, (d) => d.modePaiement),
      parMois: parMois(depenses, 'date'),
    },
    versements: {
      nombre: versements.length,
      total: totalVersements,
      parBanque: groupSumMoney(versements, (v) => v.banque),
      parSourceFonds: groupSumMoney(versements, (v) => v.sourceFonds),
      parMois: parMois(versements, 'date'),
    },
    fraisMobileMoney: {
      nombre: frais.length,
      totalFrais: sumMoney(frais, 'fraisPreleves'),
      totalTransactions: sumMoney(frais, 'montantTransaction'),
      totalNet: sumMoney(frais, 'montantNet'),
      parOperateur: groupSumMoney(frais, (f) => f.operateur, (f) => f.fraisPreleves),
      parTypeFrais: groupSumMoney(frais, (f) => f.typeFrais, (f) => f.fraisPreleves),
    },
    // La réserve CNPS = tout ce qui a été encaissé des adhérents ; elle doit être couverte par les versements en banque
    reserveCnps: {
      totalReserve: totalCotisations,
      totalVersementsBanque: totalVersements,
      soldeReelBanque: round2(totalVersements - totalCotisations),
      tauxCouverture: pct(totalVersements, totalCotisations),
    },
  };
}

const inRange = (value, du, au) => {
  const d = String(value || '').slice(0, 10);
  return (!du || d >= du) && (!au || d <= au);
};

/**
 * Synthèse financière. `global` : tout l'historique (réserve, solde réel en banque) ;
 * `periode` : la même agrégation limitée à [du, au] quand une période est demandée.
 */
export async function syntheseFinanciere({ du, au, detail } = {}) {
  const [cotisations, depenses, versements, frais, adherents, bulletins] = await Promise.all([
    repos.cotisations.all(),
    repos.depenses.all(),
    repos.versements.all(),
    repos.frais_mobile_money.all(),
    detail === 'reserves' ? repos.adherents.all() : Promise.resolve([]),
    repos.bulletins_paie.all(),
  ]);

  const out = { genereLe: new Date().toISOString(), global: agreger({ cotisations, depenses, versements, frais }) };

  if (du || au) {
    out.periode = {
      du: du || null,
      au: au || null,
      ...agreger({
        cotisations: cotisations.filter((c) => inRange(c.datePaiement, du, au)),
        depenses: depenses.filter((d) => inRange(d.date, du, au)),
        versements: versements.filter((v) => inRange(v.date, du, au)),
        frais: frais.filter((f) => inRange(f.date, du, au)),
      }),
    };
  }

  const personnel = bulletins.filter((b) => b.typeBeneficiaire !== 'ADHERENT_CNPS');
  const valides = personnel.filter((b) => b.statut !== 'Brouillon');
  out.paie = {
    bulletinsPersonnel: personnel.length,
    masseSalarialeNetteValidee: sumMoney(valides, 'netAPayer'),
    masseSalarialeNetteBrouillon: sumMoney(personnel.filter((b) => b.statut === 'Brouillon'), 'netAPayer'),
    chargesPatronalesValidees: sumMoney(valides, 'totalChargesPatronales'),
    parMois: groupSumMoney(valides, (b) => b.mois, (b) => b.netAPayer),
  };

  const attente = await cotisationsEnAttente();
  out.suiviVersements = {
    dernierVersement: attente.dernierVersement,
    reperePrecedent: attente.reperePrecedent,
    cotisationsEnAttente: { nombre: attente.nombre, total: attente.totalMontant },
  };

  if (detail === 'reserves') {
    const adherentById = new Map(adherents.map((a) => [a.id, a]));
    const adherentByMatricule = new Map(adherents.map((a) => [a.matricule, a]));
    const affecter = (c) => adherentById.get(c.adherentId) || adherentByMatricule.get(c.matricule);
    const parAdherent = new Map(adherents.map((a) => [a.id, []]));
    const nonAffectees = [];
    for (const c of cotisations) {
      const adherent = affecter(c);
      if (adherent) parAdherent.get(adherent.id).push(c);
      else nonAffectees.push(c);
    }
    out.reservesAdherents = adherents
      .map((a) => {
        const total = sumMoney(parAdherent.get(a.id));
        return {
          id: a.id,
          matricule: a.matricule,
          nomComplet: `${a.nom} ${a.prenom}`,
          telephone: a.telephone,
          statutCnps: a.statutImmatriculation || 'Non immatriculé',
          numeroCnps: a.numeroCnps || '',
          cotisationsPercues: total,
          montantReserve: total,
          affectation: 'Réserve Cotisations CNPS',
        };
      })
      .filter((x) => x.montantReserve > 0);
    // Les cotisations orphelines sont conservées dans la réserve globale, mais ne
    // doivent pas être attribuées arbitrairement à un adhérent.
    out.reservesNonAffectees = {
      nombreCotisations: nonAffectees.length,
      montant: sumMoney(nonAffectees),
      cotisations: nonAffectees.map(({ id, adherentId, matricule, adherentNomPrenom, datePaiement, montant }) => ({
        id, adherentId, matricule, adherentNomPrenom, datePaiement, montant,
      })),
    };
  }
  return out;
}

/* ------------------------------------------------------------------ contrôle d'intégrité */

/**
 * Recoupe les données financières stockées : montants incohérents, orphelins, doublons, écarts de calcul.
 * Lecture seule : ne corrige rien. `ok` est faux dès qu'une anomalie de gravité « erreur » existe.
 */
export async function controleIntegrite() {
  const [cotisations, depenses, versements, frais, adherents, bulletins, employes, rapports] = await Promise.all([
    repos.cotisations.all(),
    repos.depenses.all(),
    repos.versements.all(),
    repos.frais_mobile_money.all(),
    repos.adherents.all(),
    repos.bulletins_paie.all(),
    repos.employes.all(),
    repos.rapports_agents.all(),
  ]);
  const anomalies = [];
  const add = (gravite, code, message, ref) => anomalies.push({ gravite, code, message, ref });
  const adhIds = new Set(adherents.flatMap((a) => [a.id, a.matricule]));

  // Cotisations
  const refs = new Map();
  for (const c of cotisations) {
    if (!(c.montant > 0)) add('erreur', 'COTISATION_MONTANT', `Cotisation ${c.id} : montant non positif (${c.montant}).`, c.id);
    if (!adhIds.has(c.adherentId) && !adhIds.has(c.matricule)) add('erreur', 'COTISATION_ORPHELINE', `Cotisation ${c.id} (${c.montant} FCFA) rattachée à un adhérent inexistant (${c.matricule}).`, c.id);
    if (c.reference) {
      if (refs.has(c.reference)) add('erreur', 'COTISATION_REFERENCE_DOUBLON', `Référence ${c.reference} utilisée par plusieurs cotisations (${refs.get(c.reference)}, ${c.id}).`, c.id);
      else refs.set(c.reference, c.id);
    }
  }

  // Dépenses
  for (const d of depenses) {
    if (!(d.montant > 0)) add('erreur', 'DEPENSE_MONTANT', `Dépense ${d.id} : montant non positif (${d.montant}).`, d.id);
  }

  // Frais Mobile Money : net = transaction − frais
  for (const f of frais) {
    if (f.fraisPreleves > f.montantTransaction) add('erreur', 'FRAIS_SUPERIEURS_TRANSACTION', `Frais ${f.referenceTransaction} : frais (${f.fraisPreleves}) > transaction (${f.montantTransaction}).`, f.id);
    if (round2(f.montantTransaction - f.fraisPreleves) !== f.montantNet) add('erreur', 'FRAIS_NET_INCOHERENT', `Frais ${f.referenceTransaction} : net ${f.montantNet} ≠ transaction − frais (${round2(f.montantTransaction - f.fraisPreleves)}).`, f.id);
  }

  // Versements : doublons de bordereau, tranche cohérente avec les cotisations
  const bordereaux = new Map();
  const chrono = [...cotisations].sort((a, b) => new Date(a.datePaiement) - new Date(b.datePaiement) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  for (const v of versements) {
    if (!(v.montant > 0)) add('erreur', 'VERSEMENT_MONTANT', `Versement ${v.numeroBordereau} : montant non positif (${v.montant}).`, v.id);
    const key = `${v.banque}|${v.numeroBordereau}`;
    if (bordereaux.has(key)) add('avertissement', 'VERSEMENT_BORDEREAU_DOUBLON', `Bordereau ${v.numeroBordereau} (${v.banque}) saisi deux fois (${bordereaux.get(key)}, ${v.id}).`, v.id);
    else bordereaux.set(key, v.id);
    if (v.arretCotisationId && !chrono.some((c) => c.id === v.arretCotisationId)) {
      add('avertissement', 'VERSEMENT_ARRET_INTROUVABLE', `Versement ${v.numeroBordereau} : la cotisation du point d'arrêt (${v.arretCotisationId}) n'existe plus.`, v.id);
    }
  }

  // Paie : écriture de dépense ↔ bulletins validés
  const parMoisPersonnel = new Map();
  for (const b of bulletins.filter((x) => x.typeBeneficiaire !== 'ADHERENT_CNPS')) {
    if (!parMoisPersonnel.has(b.mois)) parMoisPersonnel.set(b.mois, []);
    parMoisPersonnel.get(b.mois).push(b);
  }
  for (const d of depenses.filter((x) => x.numeroPiece?.startsWith('PAIE-'))) {
    const mois = d.numeroPiece.slice(5);
    const liste = (parMoisPersonnel.get(mois) || []).filter((b) => b.statut !== 'Brouillon');
    if (!liste.length) {
      add('avertissement', 'PAIE_DEPENSE_SANS_BULLETIN', `Dépense ${d.numeroPiece} (${d.montant} FCFA) sans bulletin validé pour ${mois}.`, d.id);
      continue;
    }
    const attendu = sumMoney(liste, 'netAPayer');
    if (attendu !== d.montant) {
      // Des bulletins repassés en brouillon : situation transitoire, il suffit de revalider la paie du mois (la dépense est alors resynchronisée)
      const enRevision = (parMoisPersonnel.get(mois) || []).some((b) => b.statut === 'Brouillon');
      add(enRevision ? 'avertissement' : 'erreur', 'PAIE_DEPENSE_ECART',
        `Dépense ${d.numeroPiece} : ${d.montant} FCFA ≠ somme des nets des bulletins validés (${attendu} FCFA).${enRevision ? ' Paie du mois en cours de révision : revalidez-la pour resynchroniser la dépense.' : ''}`, d.id);
    }
  }

  // Paie : recalcul de chaque bulletin du personnel à partir de ses propres éléments
  const empById = new Map(employes.map((e) => [e.id, e]));
  const adhById = new Map(adherents.map((a) => [a.id, a]));
  for (const b of bulletins) {
    const common = {
      mois: b.mois, dateEdition: b.dateEdition, bulletinNumero: b.bulletinNumero, salaireBaseOptionnel: b.salaireBase,
      sursalaire: b.sursalaire, primeAnciennete: b.primeAnciennete, primeRendement: b.primeRendement,
      indemniteTransport: b.indemniteTransport, indemniteLogement: b.indemniteLogement, autresPrimes: b.autresPrimes,
      acomptesAvances: b.acomptesAvances, retenuesDiverses: b.retenuesDiverses, heuresTravaillees: b.heuresTravaillees, joursTravailles: b.joursTravailles,
    };
    let fresh;
    if (b.typeBeneficiaire === 'ADHERENT_CNPS') {
      const adh = adhById.get(b.adherentId || b.employeId);
      if (!adh) continue;
      fresh = calculerBulletinPaie({ ...common, adherent: adherentInput(adh), typeBeneficiaire: 'ADHERENT_CNPS' });
    } else {
      const emp = empById.get(b.employeId);
      if (!emp) continue;
      fresh = calculerBulletinPaie({ ...common, employe: emp });
    }
    if (fresh.netAPayer !== b.netAPayer || fresh.totalGainsBruts !== b.totalGainsBruts) {
      add(b.statut === 'Brouillon' ? 'information' : 'avertissement', 'BULLETIN_RECALCUL_DIFFERENT',
        `Bulletin ${b.bulletinNumero} (${b.statut}) : net stocké ${b.netAPayer} ≠ net recalculé ${fresh.netAPayer}.`, b.id);
    }
  }

  // Rapports d'agents : total = espèces + mobile money
  for (const r of rapports) {
    const attendu = addMoney(r.montantEspecesRemis, r.montantMobileMoneyDeclare);
    if (round2(r.montantTotalCollecte ?? 0) !== attendu) {
      add('erreur', 'RAPPORT_AGENT_TOTAL', `Rapport agent ${r.agentNom} du ${r.dateRapport} : total ${r.montantTotalCollecte} ≠ espèces + mobile money (${attendu}).`, r.id);
    }
  }

  return {
    ok: !anomalies.some((a) => a.gravite === 'erreur'),
    genereLe: new Date().toISOString(),
    verifie: {
      cotisations: cotisations.length, depenses: depenses.length, versements: versements.length,
      fraisMobileMoney: frais.length, bulletins: bulletins.length, rapportsAgents: rapports.length,
    },
    resume: {
      erreurs: anomalies.filter((a) => a.gravite === 'erreur').length,
      avertissements: anomalies.filter((a) => a.gravite === 'avertissement').length,
      informations: anomalies.filter((a) => a.gravite === 'information').length,
    },
    anomalies,
  };
}
