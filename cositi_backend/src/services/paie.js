import { repos } from '../db/repository.js';
import { tx } from '../db/database.js';
import { newId, nowIso, today } from '../utils/ids.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { calculerBulletinPaie } from '../utils/paie.js';
import { sumMoney, round2 } from '../utils/money.js';
import { logOperation, fmtMoney } from './journal.js';

const VERROUILLE = ['Validé DAF', 'Payé'];

export const adherentInput = (a) => ({
  id: a.id,
  matricule: a.matricule,
  nom: a.nom,
  prenom: a.prenom,
  numeroCnps: a.numeroCnps,
  profession: a.profession,
  telephone: a.telephone,
  sansEnfant: a.sansEnfant,
  nombreEnfants: a.nombreEnfants,
  tarifJournalier: a.tarifJournalier,
});

/** Bulletin d'un adhérent immatriculé (assiette cotisable CNPS, 60 000 FCFA par défaut). */
export function bulletinAdherent(adh, mois, salaireDefaut, existing, user) {
  return calculerBulletinPaie({
    adherent: adherentInput(adh),
    typeBeneficiaire: 'ADHERENT_CNPS',
    salaireBaseOptionnel: adh.salaireCotisableCnps || salaireDefaut || 60000,
    mois,
    dateEdition: `${mois}-28`,
    bulletinNumero: existing?.bulletinNumero,
    statut: 'Brouillon',
    validePar: user?.nom,
  });
}

export function bulletinEmploye(emp, mois, existing, user) {
  return calculerBulletinPaie({
    employe: emp,
    mois,
    dateEdition: `${mois}-28`,
    bulletinNumero: existing?.bulletinNumero,
    statut: 'Brouillon',
    validePar: user?.nom,
  });
}

const findBulletin = (mois, id) => repos.bulletins_paie.findOne({ where: { mois, employeId: id } });

/** Génère les bulletins du personnel actif pour un mois (YYYY-MM). Les bulletins validés ne sont jamais écrasés. */
export function genererPaieMois(user, mois, { ecraserExistant = false } = {}) {
  return tx(async () => {
    const staff = await repos.employes.all({ where: { actif: true } });
    if (staff.length === 0) throw badRequest('Aucun salarié actif enregistré dans le personnel.');
    let count = 0;
    let ignores = 0;
    for (const emp of staff) {
      const existing = await findBulletin(mois, emp.id);
      if (existing) {
        if (!ecraserExistant || VERROUILLE.includes(existing.statut)) {
          ignores++;
          continue;
        }
        await repos.bulletins_paie.replace({ ...bulletinEmploye(emp, mois, existing, user), createdAt: existing.createdAt });
      } else {
        await repos.bulletins_paie.insert(bulletinEmploye(emp, mois, null, user));
      }
      count++;
    }
    await logOperation(user, {
      typeOperation: 'GENERATION_BULLETIN_PAIE',
      entite: 'Paie & Salaires',
      description: `Génération de la paie pour le mois ${mois} : ${count} bulletins calculés selon les tranches légales (${ignores} ignoré(s))`,
    });
    return { count, ignores };
  });
}

export function genererPaieAdherentsCnps(user, mois, salaireDefaut = 60000) {
  return tx(async () => {
    const immat = (await repos.adherents.all()).filter((a) => a.statutImmatriculation === 'Immatriculé' || (a.numeroCnps && a.numeroCnps.trim().length > 0));
    if (immat.length === 0) throw badRequest('Aucun adhérent immatriculé avec un numéro CNPS officiel trouvé.');
    let count = 0;
    let ignores = 0;
    for (const adh of immat) {
      const existing = await findBulletin(mois, adh.id);
      if (existing && VERROUILLE.includes(existing.statut)) {
        ignores++;
        continue;
      }
      const b = bulletinAdherent(adh, mois, salaireDefaut, existing, user);
      if (existing) await repos.bulletins_paie.replace({ ...b, createdAt: existing.createdAt });
      else await repos.bulletins_paie.insert(b);
      count++;
    }
    await logOperation(user, {
      typeOperation: 'GENERATION_PAIE_ADHERENTS_CNPS',
      entite: 'Paie Adhérents CNPS',
      description: `Génération paie et déclarations CNPS pour ${count} adhérents immatriculés (assiette ${salaireDefaut.toLocaleString('fr-FR')} FCFA par défaut, ${ignores} bulletin(s) validé(s) conservé(s))`,
    });
    return { count, ignores };
  });
}

/** Recalcule les bulletins non validés d'un adhérent après changement d'assiette. Retourne le nombre recalculé. */
export async function recalculerBulletinsAdherent(adh) {
  let n = 0;
  for (const b of await repos.bulletins_paie.all({ where: { employeId: adh.id } })) {
    if (b.typeBeneficiaire !== 'ADHERENT_CNPS' || VERROUILLE.includes(b.statut)) continue;
    const fresh = bulletinAdherent(adh, b.mois, 60000, b, null);
    await repos.bulletins_paie.replace({ ...fresh, createdAt: b.createdAt, validePar: b.validePar });
    n++;
  }
  return n;
}

/** Recalcule un bulletin à partir de ses éléments (valeurs saisies, sinon valeurs actuelles) : barème CNPS / CGI. */
async function recalculerBulletin(cur, input) {
  const common = {
      mois: cur.mois,
      dateEdition: cur.dateEdition,
      bulletinNumero: cur.bulletinNumero,
      salaireBaseOptionnel: input.salaireBase ?? cur.salaireBase,
      sursalaire: input.sursalaire ?? cur.sursalaire,
      primeAnciennete: input.primeAnciennete ?? cur.primeAnciennete,
      primeRendement: input.primeRendement ?? cur.primeRendement,
      indemniteTransport: input.indemniteTransport ?? cur.indemniteTransport,
      indemniteLogement: input.indemniteLogement ?? cur.indemniteLogement,
      autresPrimes: input.autresPrimes ?? cur.autresPrimes,
      acomptesAvances: input.acomptesAvances ?? cur.acomptesAvances,
      retenuesDiverses: input.retenuesDiverses ?? cur.retenuesDiverses,
      heuresTravaillees: input.heuresTravaillees ?? cur.heuresTravaillees,
      joursTravailles: input.joursTravailles ?? cur.joursTravailles,
      notesCommentaires: input.notesCommentaires ?? cur.notesCommentaires,
    };

  if (cur.typeBeneficiaire === 'ADHERENT_CNPS') {
    const adh = await repos.adherents.get(cur.adherentId || cur.employeId);
    if (!adh) throw notFound("L'adhérent rattaché à ce bulletin n'existe plus.");
    return calculerBulletinPaie({ ...common, adherent: adherentInput(adh), typeBeneficiaire: 'ADHERENT_CNPS' });
  }
  const emp = await repos.employes.get(cur.employeId);
  if (!emp) throw notFound("Le salarié rattaché à ce bulletin n'existe plus.");
  return calculerBulletinPaie({ ...common, employe: emp });
}

/** Aperçu en direct (aucune écriture) : le bulletin tel que le serveur le calculerait avec ces éléments. */
export async function apercuBulletinExistant(id, input) {
  const cur = await repos.bulletins_paie.get(id);
  if (!cur) throw notFound('Bulletin introuvable.');
  const fresh = await recalculerBulletin(cur, input);
  return { ...fresh, id: cur.id, statut: input.statut ?? cur.statut, datePaiement: input.datePaiement ?? cur.datePaiement };
}

/**
 * Enregistre les modifications d'un bulletin. Le serveur RECALCULE tous les montants à partir des éléments
 * saisis : on ne fait jamais confiance aux totaux envoyés par le client.
 */
export function saveBulletin(user, id, input) {
  return tx(async () => {
    const cur = await repos.bulletins_paie.get(id);
    if (!cur) throw notFound('Bulletin introuvable.');
    if (VERROUILLE.includes(cur.statut) && input.statut === undefined) {
      throw conflict('Ce bulletin est validé : repassez-le en brouillon avant de le modifier.');
    }
    const fresh = await recalculerBulletin(cur, input);

    const statut = input.statut ?? cur.statut;
    await repos.bulletins_paie.replace({
      ...fresh,
      statut,
      validePar: statut === 'Brouillon' ? null : cur.validePar,
      dateValidation: statut === 'Brouillon' ? null : cur.dateValidation,
      datePaiement: input.datePaiement ?? cur.datePaiement,
      depenseAssocieeId: cur.depenseAssocieeId,
      createdAt: cur.createdAt,
      updatedAt: nowIso(),
    });
    const saved = await repos.bulletins_paie.get(id);
    await logOperation(user, {
      typeOperation: 'MODIFICATION_BULLETIN_PAIE',
      entite: 'Paie & Salaires',
      description: `Enregistrement du bulletin ${saved.bulletinNumero} (${saved.employeNomComplet}) - Net : ${fmtMoney(saved.netAPayer)}`,
      nouvellesInformations: `Tranche légale: ${saved.trancheLibelle} | Brut: ${fmtMoney(saved.totalGainsBruts)} | Net: ${fmtMoney(saved.netAPayer)}`,
    });
    return saved;
  });
}

export function deleteBulletin(user, id) {
  return tx(async () => {
    const b = await repos.bulletins_paie.get(id);
    if (!b) throw notFound('Bulletin introuvable.');
    if (b.depenseAssocieeId) throw conflict('Ce bulletin a déjà généré une écriture de dépense : suppression impossible.');
    await repos.bulletins_paie.delete(id);
    await logOperation(user, {
      typeOperation: 'MODIFICATION_BULLETIN_PAIE',
      entite: 'Paie & Salaires',
      description: `Suppression du bulletin de paie ${b.bulletinNumero} (${b.employeNomComplet})`,
    });
    return b;
  });
}

/**
 * Valide la paie du mois : tous les bulletins passent en « Validé DAF » et, si demandé, UNE écriture de dépense
 * « Primes & Salaires personnel » est créée pour la masse salariale NETTE DU PERSONNEL (les adhérents CNPS,
 * dont la cotisation n'est pas un salaire versé par COSITI, n'y entrent pas). Idempotent.
 */
export function validerPaieMois(user, mois, genererDepense = true) {
  return tx(async () => {
    // Verrou : deux validations simultanées (double clic) ne peuvent pas créer deux écritures de dépense
    await repos.parametres.get('main', { forUpdate: true });
    const bulletins = await repos.bulletins_paie.all({ where: { mois } });
    if (bulletins.length === 0) throw notFound(`Aucun bulletin trouvé pour le mois ${mois}.`);

    const personnel = bulletins.filter((b) => b.typeBeneficiaire !== 'ADHERENT_CNPS');
    const totalNet = sumMoney(personnel, 'netAPayer');
    const dejaGeneree = personnel.find((b) => b.depenseAssocieeId)?.depenseAssocieeId;

    let depenseId = dejaGeneree;
    let depenseResynchronisee = false;
    if (dejaGeneree) {
      // La paie a été revalidée après modification de bulletins : la dépense suit toujours la masse salariale réelle
      const dep = await repos.depenses.get(dejaGeneree);
      if (dep && dep.montant !== totalNet) {
        await repos.depenses.patch(dep.id, {
          montant: totalNet,
          beneficiaire: `Masse salariale personnel (${personnel.length} salariés)`,
          updatedAt: nowIso(),
        });
        depenseResynchronisee = true;
      }
    }
    if (genererDepense && !dejaGeneree && totalNet > 0) {
      depenseId = newId('dep-paie');
      await repos.depenses.insert({
        id: depenseId,
        date: today(),
        categorie: 'Primes & Salaires personnel',
        motif: `Paiement global de la masse salariale nette du personnel COSITI - Mois de ${bulletins[0].periodeLibelle || mois}`,
        montant: totalNet,
        modePaiement: 'Virement bancaire',
        beneficiaire: `Masse salariale personnel (${personnel.length} salariés)`,
        numeroPiece: `PAIE-${mois}`,
        statut: 'Payé',
        origineFonds: 'Apport personnel du PCA',
        enregistrePar: `${user.nom} (${user.role})`,
        observations: `Génération automatique depuis le module Paie & Salaires. Masse salariale répartie sur ${personnel.length} bulletins conformes aux tranches légales.`,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }

    const date = today();
    for (const b of bulletins) {
      await repos.bulletins_paie.patch(b.id, {
        statut: b.statut === 'Payé' ? 'Payé' : 'Validé DAF',
        validePar: `${user.nom} (${user.role})`,
        dateValidation: date,
        datePaiement: b.datePaiement || date,
        depenseAssocieeId: b.typeBeneficiaire === 'ADHERENT_CNPS' ? b.depenseAssocieeId : depenseId || b.depenseAssocieeId,
        updatedAt: nowIso(),
      });
    }

    await logOperation(user, {
      typeOperation: 'VALIDATION_PAIE_MOIS',
      entite: 'Paie & Salaires',
      description: `Validation officielle de la paie pour le mois ${mois} (${bulletins.length} bulletins, masse salariale nette du personnel : ${fmtMoney(totalNet)})`,
      nouvellesInformations: depenseId
        ? `Écriture comptable en Dépense (Réf: PAIE-${mois} - ${fmtMoney(totalNet)})${dejaGeneree ? (depenseResynchronisee ? ' — existante, montant resynchronisé' : ' — déjà existante, non dupliquée') : ''}`
        : 'Sans génération de dépense automatique',
    });
    return { bulletins: bulletins.length, totalNetPersonnel: totalNet, depenseId: depenseId || null };
  });
}

/** Aperçu de calcul (sans enregistrement) — utile aux formulaires. */
export async function apercuBulletin(input) {
  const emp = input.employeId ? await repos.employes.get(input.employeId) : null;
  if (input.employeId && !emp) throw notFound('Salarié introuvable.');
  return calculerBulletinPaie({
    ...input,
    employe: emp || undefined,
    salaireBaseOptionnel: input.salaireBase,
    mois: input.mois,
  });
}

/* ------------------------------------------------------------------ récapitulatifs & déclarations (calculés par le serveur) */

const alias = (b, nouveau, ancien) => b[nouveau] ?? b[ancien] ?? 0;

/** Ajoute à un bulletin calculé (non stocké) les totaux que la lecture d'un bulletin stocké fournit déjà. */
export function avecTotauxCnps(b) {
  const pat = round2(alias(b, 'cnpsPvidPatronale', 'cnpsRetraitePatronale') + alias(b, 'cnpsPfPatronale', 'cnpsPrestationsFamiliales') + alias(b, 'cnpsAtmpPatronale', 'cnpsAccidentTravail'));
  return { ...b, totalCnpsPatronale: pat, totalCotisationsCnps: round2(alias(b, 'cnpsPvidSalariale', 'cnpsRetraiteSalariale') + pat) };
}

/** Récapitulatif de la paie d'un mois : masse salariale, tranches légales, déclaration CNPS, déclaration fiscale DGI / communes. */
export async function recapPaie(mois) {
  const bulletins = await repos.bulletins_paie.all({ where: { mois } });
  const somme = (list, k) => sumMoney(list, k);
  const resume = (list) => ({
    nombre: list.length,
    totalGainsBruts: somme(list, 'totalGainsBruts'),
    totalRetenuesSalariales: somme(list, 'totalRetenuesSalariales'),
    totalNetAPayer: somme(list, 'netAPayer'),
    totalChargesPatronales: somme(list, 'totalChargesPatronales'),
    coutTotalEmployeur: somme(list, 'coutTotalEmployeur'),
    valides: list.filter((b) => b.statut !== 'Brouillon').length,
  });
  const adh = bulletins.filter((b) => b.typeBeneficiaire === 'ADHERENT_CNPS');
  const personnel = bulletins.filter((b) => b.typeBeneficiaire !== 'ADHERENT_CNPS');

  return {
    mois,
    personnel: resume(personnel),
    adherentsCnps: resume(adh),
    total: resume(bulletins),
    // indicateurs de l'écran Paie (tous les bulletins du mois)
    statsMois: {
      totalBrut: somme(bulletins, 'totalGainsBruts'),
      totalNet: somme(bulletins, 'netAPayer'),
      totalSocialSalarial: somme(bulletins, 'totalRetenuesSocialesSalariales'),
      totalFiscalSalarial: somme(bulletins, 'totalRetenuesFiscalesSalariales'),
      totalPatronal: somme(bulletins, 'totalChargesPatronales'),
      totalCoutEmployeur: somme(bulletins, 'coutTotalEmployeur'),
      nbMoins60k: bulletins.filter((b) => b.trancheLoi === 'MOINS_DE_60K').length,
      nbEgal60k: bulletins.filter((b) => b.trancheLoi === 'EGAL_60K').length,
      nbPlus60k: bulletins.filter((b) => b.trancheLoi === 'PLUS_DE_60K').length,
      count: bulletins.length,
      isAllValide: bulletins.length > 0 && bulletins.every((b) => b.statut === 'Validé DAF' || b.statut === 'Payé'),
    },
    declarations: {
      cnps: {
        masseSoumise: sumMoney(bulletins, (b) => Math.min(b.totalGainsBruts || 0, 750000)),
        pvidSalariale: sumMoney(bulletins, (b) => alias(b, 'cnpsPvidSalariale', 'cnpsRetraiteSalariale')),
        pvidPatronale: sumMoney(bulletins, (b) => alias(b, 'cnpsPvidPatronale', 'cnpsRetraitePatronale')),
        prestationsFamiliales: sumMoney(bulletins, (b) => alias(b, 'cnpsPfPatronale', 'cnpsPrestationsFamiliales')),
        accidentsTravail: sumMoney(bulletins, (b) => alias(b, 'cnpsAtmpPatronale', 'cnpsAccidentTravail')),
        total: somme(bulletins, 'totalCotisationsCnps'),
      },
      fiscal: {
        nombreBulletins: bulletins.length,
        exoneres: bulletins.filter((b) => b.salaireBase <= 60000).length,
        assujettis: bulletins.filter((b) => b.salaireBase > 60000).length,
        irpp: sumMoney(bulletins, (b) => alias(b, 'irppSalariale', 'itsSalariale')),
        cac: sumMoney(bulletins, (b) => alias(b, 'cacSalariale', 'cnSalariale')),
        cfc: sumMoney(bulletins, (b) => (b.cfcSalariale || 0) + (b.cfcPatronale || 0)),
        tdl: sumMoney(bulletins, (b) => b.tdlSalariale || 0),
        fne: sumMoney(bulletins, (b) => b.fnePatronale || 0),
        total: sumMoney(bulletins, (b) => alias(b, 'irppSalariale', 'itsSalariale') + alias(b, 'cacSalariale', 'cnSalariale') + (b.cfcSalariale || 0) + (b.cfcPatronale || 0) + (b.tdlSalariale || 0) + (b.fnePatronale || 0)),
      },
    },
  };
}

const estImmatricule = (a) => a.statutImmatriculation === 'Immatriculé' || Boolean(a.numeroCnps && a.numeroCnps.trim());
const adherentLigne = (a) => ({
  id: a.id, matricule: a.matricule, nom: a.nom, prenom: a.prenom, numeroCnps: a.numeroCnps, profession: a.profession,
  telephone: a.telephone, sansEnfant: !!a.sansEnfant, nombreEnfants: a.nombreEnfants ?? 0, salaireCotisableCnps: a.salaireCotisableCnps || 60000,
});

/**
 * Paie CNPS des adhérents immatriculés pour un mois : le bulletin enregistré s'il existe, sinon la projection calculée
 * (barème CNPS / CGI, assiette cotisable de l'adhérent). Une seule source pour les tableaux, les exports et les fiches.
 */
export async function adherentsCnpsDuMois(mois) {
  const [adherents, bulletins] = await Promise.all([repos.adherents.all({ orderBy: [['matricule', 'asc']] }), repos.bulletins_paie.all({ where: { mois } })]);
  const parAdherent = new Map();
  for (const b of bulletins) if (b.typeBeneficiaire === 'ADHERENT_CNPS') parAdherent.set(b.adherentId || b.employeId, b);

  const lignes = adherents.filter(estImmatricule).map((a) => {
    const stocke = parAdherent.get(a.id);
    const bulletin = stocke || avecTotauxCnps(bulletinAdherent(a, mois, 60000, null, null));
    return { adherent: adherentLigne(a), bulletin, genere: !!stocke };
  });
  const bs = lignes.map((l) => l.bulletin);
  return {
    mois,
    lignes,
    totaux: {
      count: lignes.length,
      masseCotisableTotal: sumMoney(lignes, (l) => l.adherent.salaireCotisableCnps),
      totalCnpsSalariale: sumMoney(bs, (b) => alias(b, 'cnpsPvidSalariale', 'cnpsRetraiteSalariale')),
      totalCfcSalarial: sumMoney(bs, 'cfcSalariale'),
      totalTdl: sumMoney(bs, 'tdlSalariale'),
      totalNet: sumMoney(bs, 'netAPayer'),
      totalPatronal: sumMoney(bs, 'totalChargesPatronales'),
      totalDeclareCnps: sumMoney(bs, 'totalCotisationsCnps'),
      bulletinsGeneresCount: lignes.filter((l) => l.genere).length,
    },
  };
}

/** Simulation (rien n'est enregistré) du bulletin CNPS d'un adhérent pour une assiette cotisable donnée. */
export async function apercuAdherentCnps(adherentId, mois, montant) {
  const adh = await repos.adherents.get(adherentId);
  if (!adh) throw notFound('Adhérent introuvable.');
  return avecTotauxCnps(bulletinAdherent({ ...adh, salaireCotisableCnps: montant }, mois, 60000, null, null));
}
