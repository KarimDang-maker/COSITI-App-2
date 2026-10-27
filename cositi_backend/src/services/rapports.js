import { repos } from '../db/repository.js';
import { sumMoney, groupSumMoney, round2 } from '../utils/money.js';
import { resolveOrigineDecaissement } from '../utils/business.js';
import { MOIS_FR } from '../utils/dates.js';
import { estStatutImmatricule } from '../utils/business.js';

/**
 * Modèles de lecture des écrans de rapports : TOUS les agrégats (totaux, ventilations, réserve CNPS, flux de trésorerie,
 * état nominatif) sont calculés ici à partir de MySQL — le front ne fait plus que les afficher, filtrer et imprimer.
 */

const ORIGINE_CNPS = 'Exploitation (Cotisations CNPS)';
const ORIGINE_PCA = 'Apport personnel du PCA';
const pct = (a, b) => (b > 0 ? round2((a / b) * 100) : a > 0 ? 100 : 0);

/** Index id / matricule → adhérent, et affectation de chaque cotisation à son adhérent (une seule fois). */
function indexerCotisations(adherents, cotisations) {
  const byId = new Map(adherents.map((a) => [a.id, a]));
  const byMat = new Map(adherents.map((a) => [a.matricule, a]));
  const parAdherent = new Map(adherents.map((a) => [a.id, []]));
  for (const c of cotisations) {
    const a = byId.get(c.adherentId) || byMat.get(c.matricule);
    if (a) parAdherent.get(a.id).push(c);
  }
  return parAdherent;
}

function cotisationsNonAffectees(adherents, cotisations) {
  const ids = new Set(adherents.map((a) => a.id));
  const matricules = new Set(adherents.map((a) => a.matricule).filter(Boolean));
  return cotisations.filter((c) => !ids.has(c.adherentId) && (!c.matricule || !matricules.has(c.matricule)));
}

const prefixeMois = (mois, annee) => {
  const idx = MOIS_FR.indexOf(mois);
  return idx < 0 ? null : `${annee}-${String(idx + 1).padStart(2, '0')}`;
};

const champsDepense = (d) => ({
  id: d.id, date: d.date, numeroPiece: d.numeroPiece, motif: d.motif, montant: d.montant,
  beneficiaire: d.beneficiaire, modePaiement: d.modePaiement, categorie: d.categorie, origineFonds: resolveOrigineDecaissement(d),
});

/**
 * Rapprochement bancaire & réserve CNPS + flux de trésorerie.
 *  periode 'GLOBAL' : tout l'historique ; 'MOIS' : cotisations de la période concernée (mois + année), versements et dépenses de ce mois.
 *  base 'COTISATIONS_PERCUES' : la réserve = cotisations perçues ; 'SEUIL' : réserve plafonnée au seuil d'immatriculation par adhérent.
 *  FORMULE : solde réel en banque = fonds versés en banque − réserve cotisations CNPS.
 */
export async function rapprochement({ periode = 'GLOBAL', mois, annee, banque, base = 'COTISATIONS_PERCUES' } = {}) {
  const prefixe = periode === 'MOIS' ? prefixeMois(mois, annee) : null;
  const [versementsAll, cotisAll, depAll, adherents, params] = await Promise.all([
    repos.versements.all({ orderBy: [['date', 'asc']] }),
    repos.cotisations.all(),
    repos.depenses.all({ orderBy: [['date', 'asc']] }),
    repos.adherents.all({ orderBy: [['matricule', 'asc']] }),
    repos.parametres.get('main'),
  ]);

  const versements = versementsAll.filter((v) => (!banque || v.banque === banque) && (!prefixe || String(v.date || '').startsWith(prefixe)));
  const cotisations = cotisAll.filter((c) => periode !== 'MOIS' || (c.mois === mois && Number(c.annee) === Number(annee)));
  const depenses = depAll.filter((d) => !prefixe || String(d.date || '').startsWith(prefixe));
  const seuil = params?.seuilImmatriculation || 15000;

  const periodeParAdh = indexerCotisations(adherents, cotisations);
  const toutesParAdh = indexerCotisations(adherents, cotisAll);

  const reserve = adherents
    .map((a) => {
      const cotisationsPercues = sumMoney(periodeParAdh.get(a.id));
      const totalCumuleGlobal = sumMoney(toutesParAdh.get(a.id));
      let montantReserve;
      let affectation;
      if (base === 'COTISATIONS_PERCUES') {
        montantReserve = cotisationsPercues;
        affectation = 'Sanctuarisation 100% Cotisations CNPS';
      } else if (totalCumuleGlobal >= seuil) {
        montantReserve = seuil;
        affectation = `Seuil CNPS ${seuil.toLocaleString('fr-FR')} F validé`;
      } else {
        montantReserve = totalCumuleGlobal;
        affectation = "En cours d'atteinte seuil CNPS";
      }
      return {
        id: a.id, matricule: a.matricule, nomComplet: `${a.nom} ${a.prenom}`, telephone: a.telephone,
        statutCnps: a.statutImmatriculation || 'Non immatriculé', numeroCnps: a.numeroCnps || '',
        cotisationsPercues, totalCumuleGlobal, montantReserve, affectation,
      };
    })
    .filter((r) => r.montantReserve > 0 || r.cotisationsPercues > 0);

  const totalFondsBanque = sumMoney(versements);
  const cotisationsNonAffecteesMois = cotisationsNonAffectees(adherents, cotisations);
  const totalReserveCnps = base === 'COTISATIONS_PERCUES'
    ? sumMoney(cotisations)
    : sumMoney(reserve, 'montantReserve');

  const exploitation = depenses.filter((d) => resolveOrigineDecaissement(d) === ORIGINE_CNPS);
  const apportPca = depenses.filter((d) => resolveOrigineDecaissement(d) === ORIGINE_PCA);
  const totalEncaissements = sumMoney(cotisations);
  const totalDecaissements = round2(sumMoney(exploitation) + sumMoney(apportPca));

  return {
    periode: { mode: periode, mois: mois ?? null, annee: annee ?? null, banque: banque ?? null, base },
    fondsBanque: { total: totalFondsBanque, nombre: versements.length, versements },
    reserveCnps: {
      total: totalReserveCnps,
      nombreAdherents: reserve.length,
      adherents: reserve,
      cotisationsNonAffectees: {
        nombre: cotisationsNonAffecteesMois.length,
        total: sumMoney(cotisationsNonAffecteesMois),
        cotisations: cotisationsNonAffecteesMois.map(({ id, adherentId, matricule, adherentNomPrenom, datePaiement, montant }) => ({
          id, adherentId, matricule, adherentNomPrenom, datePaiement, montant,
        })),
      },
    },
    soldeReelBanque: round2(totalFondsBanque - totalReserveCnps),
    tauxCouverture: pct(totalFondsBanque, totalReserveCnps),
    flux: {
      encaissements: { total: totalEncaissements, nombre: cotisations.length },
      decaissementsExploitation: { total: sumMoney(exploitation), nombre: exploitation.length, depenses: exploitation.map(champsDepense) },
      decaissementsApportPca: { total: sumMoney(apportPca), nombre: apportPca.length, depenses: apportPca.map(champsDepense) },
      totalDecaissements,
      soldeNet: round2(totalEncaissements - totalDecaissements),
    },
  };
}

/**
 * État mensuel de clôture (période concernée = mois + année portés par les cotisations).
 * `finances` n'est calculé que pour les profils habilités.
 */
export async function etatMensuel({ mois, annee, financesAutorisees }) {
  const prefixe = prefixeMois(mois, annee);
  const [cotisAll, adherents, gestionnaires, params] = await Promise.all([
    repos.cotisations.all(),
    repos.adherents.all({ orderBy: [['matricule', 'asc']] }),
    repos.gestionnaires.all(),
    repos.parametres.get('main'),
  ]);
  const seuil = params?.seuilImmatriculation || 15000;
  const cotisationsMois = cotisAll
    .filter((c) => c.mois === mois && Number(c.annee) === Number(annee))
    .sort((a, b) => new Date(b.datePaiement) - new Date(a.datePaiement));
  const totalCotisations = sumMoney(cotisationsMois);
  const cotisationsNonAffecteesMois = cotisationsNonAffectees(adherents, cotisationsMois);

  const moisParAdh = indexerCotisations(adherents, cotisationsMois);
  const toutesParAdh = indexerCotisations(adherents, cotisAll);
  const gest = new Map(gestionnaires.map((g) => [g.id, g]));

  const nominatif = adherents.map((a) => {
    const duMois = moisParAdh.get(a.id);
    const montantMois = sumMoney(duMois);
    const cumulTotal = sumMoney(toutesParAdh.get(a.id));
    return {
      adherent: {
        id: a.id, matricule: a.matricule, nom: a.nom, prenom: a.prenom, telephone: a.telephone,
        tarifJournalier: a.tarifJournalier, statutImmatriculation: a.statutImmatriculation, numeroCnps: a.numeroCnps,
      },
      montantMois,
      nbJoursMois: a.tarifJournalier > 0 ? Math.floor(montantMois / a.tarifJournalier) : 0,
      nbVersementsMois: duMois.length,
      cumulTotal,
      seuil15000Atteint: cumulTotal >= seuil,
      aCotiseCeMois: montantMois > 0,
      estImmatricule: estStatutImmatricule(a.statutImmatriculation) || Boolean(a.numeroCnps && a.numeroCnps.trim()),
      gestionnaireNom: gest.get(a.gestionnaireId)?.nom || 'Non affecté',
    };
  });

  const parMode = groupSumMoney(cotisationsMois, (c) => c.modePaiement);
  const agents = {};
  for (const c of cotisationsMois) {
    const k = c.agentEnregistreur || 'Non assigné';
    agents[k] ||= { c: 0, n: 0 };
    agents[k].c += Math.round(c.montant * 100);
    agents[k].n += 1;
  }

  const out = {
    periode: { mois, annee: Number(annee), prefixe },
    cotisations: {
      liste: cotisationsMois,
      total: totalCotisations,
      nombre: cotisationsMois.length,
      nonAffectees: { liste: cotisationsNonAffecteesMois, nombre: cotisationsNonAffecteesMois.length, total: sumMoney(cotisationsNonAffecteesMois) },
    },
    statsParMode: Object.entries(parMode).map(([mode, montant]) => ({ mode, montant, pourcentage: totalCotisations > 0 ? ((montant / totalCotisations) * 100).toFixed(1) : '0' })),
    statsParAgent: Object.entries(agents).map(([agent, v]) => ({ agent, montant: v.c / 100, count: v.n, pourcentage: totalCotisations > 0 ? ((v.c / 100 / totalCotisations) * 100).toFixed(1) : '0' })),
    nominatif,
    comptes: {
      tous: nominatif.length,
      cotisants: nominatif.filter((i) => i.aCotiseCeMois).length,
      nonCotisants: nominatif.filter((i) => !i.aCotiseCeMois).length,
      dejaImmatricules: nominatif.filter((i) => i.estImmatricule).length,
      tauxParticipation: nominatif.length ? Math.round((nominatif.filter((i) => i.aCotiseCeMois).length / nominatif.length) * 100) : 0,
    },
    franchissements: nominatif.filter((i) => i.seuil15000Atteint && i.aCotiseCeMois).map((i) => i.adherent.matricule),
    finances: null,
  };

  if (financesAutorisees) {
    const [depenses, versements] = await Promise.all([repos.depenses.all({ orderBy: [['date', 'desc']] }), repos.versements.all({ orderBy: [['date', 'desc']] })]);
    const depensesMois = depenses.filter((d) => String(d.date || '').startsWith(prefixe));
    const versementsMois = versements.filter((v) => String(v.date || '').startsWith(prefixe));
    const totalDepenses = sumMoney(depensesMois);
    out.finances = {
      depenses: { liste: depensesMois, total: totalDepenses, nombre: depensesMois.length },
      versements: { liste: versementsMois, total: sumMoney(versementsMois), nombre: versementsMois.length },
      soldeNet: round2(totalCotisations - totalDepenses),
      rapprochement: await rapprochement({ periode: 'MOIS', mois, annee }),
    };
  }
  return out;
}
