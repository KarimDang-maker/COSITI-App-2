import { repos } from '../db/repository.js';
import { tx } from '../db/database.js';
import { newId, nowIso, today, frDateTime } from '../utils/ids.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { calculateAdherentStats, generateNextMatricule } from '../utils/business.js';
import { DEFAULT_PIECES_DOSSIER, OFFRE_ALLOCATIONS, getPiecesForOffre } from '../data/cnps.js';
import { logOperation } from './journal.js';
import { sumMoney } from '../utils/money.js';
import { recalculerBulletinsAdherent } from './paie.js';

const nomComplet = (a) => `${a.nom} ${a.prenom}`;
const gestionnaireLabel = (g) => `${g.nom} ${g.prenom} (${g.code})`;

export async function getAdherentOrFail(idOrMatricule) {
  const a = (await repos.adherents.get(idOrMatricule)) || (await repos.adherents.findOne({ where: { matricule: idOrMatricule } }));
  if (!a) throw notFound('Adhérent introuvable.');
  return a;
}

export const cotisationsOf = (adh) => repos.cotisations.all({ or: [{ adherentId: adh.id }, { matricule: adh.matricule }] });
export const dossiersOf = (adh) => repos.dossiers.all({ or: [{ adherentId: adh.id }, { matricule: adh.matricule }] });

export async function adherentWithStats(adh, params, cotisations) {
  const p = params || (await repos.parametres.get('main'));
  const c = cotisations || (await cotisationsOf(adh));
  return { ...adh, stats: calculateAdherentStats(adh, c, p) };
}

async function ensureUniqueIdentity(data, selfId) {
  if (data.cni) {
    const dup = await repos.adherents.findOne({ where: { cni: data.cni } });
    if (dup && dup.id !== selfId) throw conflict(`Un adhérent (${dup.matricule}) possède déjà cette CNI.`);
  }
  if (data.numeroCnps) {
    const dup = await repos.adherents.findOne({ where: { numeroCnps: data.numeroCnps } });
    if (dup && dup.id !== selfId) throw conflict(`Le numéro CNPS ${data.numeroCnps} est déjà attribué à ${dup.matricule}.`);
  }
}

async function resolveGestionnaire(gestionnaireId) {
  if (!gestionnaireId) return undefined;
  const g = await repos.gestionnaires.get(gestionnaireId);
  if (!g) throw badRequest('Gestionnaire de portefeuille introuvable.');
  return g;
}

function newDossier(user, adh, { branche, offre, numeroCnps, dateImmatriculation, pieces, note, extra = {} }) {
  const now = nowIso();
  return {
    id: newId('dos'),
    adherentId: adh.id,
    matricule: adh.matricule,
    adherentNomPrenom: nomComplet(adh),
    numeroCnps: numeroCnps || adh.numeroCnps || 'En attente',
    branche: branche || 'PRESTATIONS_FAMILIALES',
    sousRubriqueOffre: offre,
    dateImmatriculation: dateImmatriculation || adh.dateImmatriculation || today(),
    statut: 'Dossier non commencé',
    pieces: pieces.map((p) => ({ ...p, recu: false })),
    nombreEnfants: 0,
    certificatsScolariteFournis: false,
    historique: [{ date: frDateTime(), auteur: user.nom, action: note }],
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

/**
 * Crée un adhérent. `options.matricule` (import Excel / reprise de données) impose un matricule existant au lieu d'en générer un :
 * il doit être au format COSITI-nnnn et libre ; la séquence est alors avancée si nécessaire (jamais reculée).
 */
export function createAdherent(user, data, options = {}) {
  return tx(async () => {
    await ensureUniqueIdentity(data);
    const gest = await resolveGestionnaire(data.gestionnaireId);
    // lecture avec verrou de ligne : la séquence de matricules est incrémentée de façon atomique
    const params = await repos.parametres.get('main', { forUpdate: true });
    let { matricule, sequence } = generateNextMatricule(params.dernierNumeroMatricule);
    if (options.matricule) {
      const m = /^COSITI-(\d{4,})$/.exec(options.matricule);
      if (!m) throw badRequest(`Matricule « ${options.matricule} » invalide (format attendu : COSITI-0001).`);
      if (await repos.adherents.findOne({ where: { matricule: options.matricule } })) throw conflict(`Le matricule ${options.matricule} existe déjà.`);
      matricule = options.matricule;
      sequence = Math.max(params.dernierNumeroMatricule || 0, Number(m[1]));
    }
    const now = nowIso();
    const hasCnps = Boolean(data.numeroCnps);

    const adh = {
      ...data,
      id: options.id || newId('adh'),
      matricule,
      statut: data.statut || 'Actif',
      tarifJournalier: data.tarifJournalier || 700,
      gestionnaireId: gest?.id,
      gestionnaireNom: gest ? gestionnaireLabel(gest) : undefined,
      statutImmatriculation: hasCnps ? 'Immatriculé' : data.statutImmatriculation || 'Non immatriculé',
      dateImmatriculation: hasCnps ? data.dateImmatriculation || today() : data.dateImmatriculation,
      salaireCotisableCnps: data.salaireCotisableCnps ?? 60000,
      nombreEnfants: data.nombreEnfants ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    adh.matricule = matricule;
    await repos.adherents.insert(adh);
    await repos.parametres.patch('main', { dernierNumeroMatricule: sequence });

    if (hasCnps) {
      await repos.dossiers.insert(
        newDossier(user, adh, {
          branche: 'PRESTATIONS_FAMILIALES',
          offre: OFFRE_ALLOCATIONS,
          numeroCnps: adh.numeroCnps,
          pieces: getPiecesForOffre(OFFRE_ALLOCATIONS),
          note: "Création automatique du dossier CNPS suite à la saisie du N° CNPS par l'agent enregistreur",
        })
      );
    }

    await logOperation(user, {
      typeOperation: 'CREATION_ADHERENT',
      entite: 'Adhérent',
      adherentMatricule: matricule,
      adherentNom: nomComplet(adh),
      description: `Création du nouvel adhérent ${matricule} (${nomComplet(adh)})${hasCnps ? ` avec N° CNPS ${adh.numeroCnps} renseigné par l'agent enregistreur` : ''}`,
      nouvellesInformations: `Profession: ${adh.profession}, Tél: ${adh.telephone}, N° CNPS: ${adh.numeroCnps || 'Non renseigné'}`,
    });
    return repos.adherents.get(adh.id);
  });
}

export function updateAdherent(user, id, data) {
  return tx(async () => {
    const cur = await getAdherentOrFail(id);
    const patch = { ...data };
    delete patch.salaireCotisableCnps; // assiette CNPS : uniquement par updateSalaireCotisable (droit financier + recalcul des bulletins)
    delete patch.matricule; // le matricule ne change JAMAIS
    delete patch.id;
    await ensureUniqueIdentity(patch, cur.id);

    if ('gestionnaireId' in data) {
      const gest = await resolveGestionnaire(data.gestionnaireId);
      patch.gestionnaireId = gest?.id ?? null;
      patch.gestionnaireNom = gest ? gestionnaireLabel(gest) : null;
    }
    if (patch.numeroCnps) {
      patch.statutImmatriculation = 'Immatriculé';
      patch.dateImmatriculation = cur.dateImmatriculation || patch.dateImmatriculation || today();
    }
    patch.updatedAt = nowIso();

    const upd = await repos.adherents.patch(cur.id, patch);
    const slim = (a) => ({ nom: a.nom, prenom: a.prenom, tel: a.telephone, statut: a.statut, statutImmatriculation: a.statutImmatriculation, numeroCnps: a.numeroCnps });
    await logOperation(user, {
      typeOperation: 'MODIFICATION_ADHERENT',
      entite: 'Adhérent',
      adherentMatricule: cur.matricule,
      adherentNom: nomComplet(upd),
      codeSecuriteValide: true,
      description: `Mise à jour des informations de l'adhérent ${cur.matricule} (validé par code)`,
      anciennesInformations: slim(cur),
      nouvellesInformations: slim(upd),
    });
    return upd;
  });
}

export function updateStatut(user, id, statut, motif) {
  return tx(async () => {
    const cur = await getAdherentOrFail(id);
    if (cur.statut === statut) return cur;
    const upd = await repos.adherents.patch(cur.id, { statut, updatedAt: nowIso() });
    await logOperation(user, {
      action: 'MODIFICATION_STATUT',
      typeOperation: 'MODIFICATION_STATUT_ADHERENT',
      entite: 'Adhérent',
      adherentMatricule: cur.matricule,
      adherentNom: nomComplet(cur),
      description: `Changement de statut pour ${cur.matricule} : ${cur.statut} ➔ ${statut}${motif ? ` (Motif : ${motif})` : ''}`,
      details: `Statut modifié de "${cur.statut}" vers "${statut}" par ${user.nom} (${user.role}). Motif : ${motif || 'Non précisé'}.`,
      anciennesInformations: `Statut: ${cur.statut}`,
      nouvellesInformations: `Statut: ${statut}`,
    });
    return upd;
  });
}

export function deleteAdherent(user, id) {
  return tx(async () => {
    const cur = await getAdherentOrFail(id);
    const nbCot = await repos.cotisations.count({ or: [{ adherentId: cur.id }, { matricule: cur.matricule }] });
    if (nbCot > 0) {
      throw conflict(
        `Suppression impossible : ${cur.matricule} a ${nbCot} cotisation(s) enregistrée(s). Pour préserver la comptabilité, passez son statut à « Radié » ou « Inactif ».`
      );
    }
    for (const d of await dossiersOf(cur)) await repos.dossiers.delete(d.id);
    await repos.adherents.delete(cur.id);
    await logOperation(user, {
      typeOperation: 'SUPPRESSION_ADHERENT',
      entite: 'Adhérent',
      adherentMatricule: cur.matricule,
      adherentNom: nomComplet(cur),
      codeSecuriteValide: true,
      description: `Suppression définitive de l'adhérent ${cur.matricule} (${nomComplet(cur)})`,
      anciennesInformations: `Matricule: ${cur.matricule}, CNI: ${cur.cni}, Tél: ${cur.telephone}`,
    });
    return cur;
  });
}

export function immatriculer(user, id, { numeroCnps, dateImmatriculation, observations }) {
  return tx(async () => {
    const adh = await getAdherentOrFail(id);
    await ensureUniqueIdentity({ numeroCnps }, adh.id);
    const upd = await repos.adherents.patch(adh.id, {
      statutImmatriculation: 'Immatriculé',
      numeroCnps,
      dateImmatriculation,
      observations: observations || adh.observations,
      updatedAt: nowIso(),
    });

    if ((await dossiersOf(adh)).length === 0) {
      await repos.dossiers.insert(
        newDossier(user, upd, {
          numeroCnps,
          dateImmatriculation,
          pieces: DEFAULT_PIECES_DOSSIER,
          note: `Création du dossier suite à l'immatriculation CNPS (${numeroCnps})`,
        })
      );
    }
    await logOperation(user, {
      typeOperation: 'IMMATRICULATION',
      entite: 'Adhérent',
      adherentMatricule: adh.matricule,
      adherentNom: nomComplet(adh),
      description: `Immatriculation CNPS validée pour ${adh.matricule} : N° ${numeroCnps}`,
      nouvellesInformations: `N° CNPS: ${numeroCnps}, Date: ${dateImmatriculation}`,
    });
    return upd;
  });
}

const isEnfantPiece = (p) => {
  const n = p.nom.toLowerCase();
  return ['p5', 'p6', 'p7', 'pf-2', 'pf-5', 'pf-6'].includes(p.id) || n.includes('enfant') || n.includes('scolarit');
};

export function marquerSansEnfant(user, id, motif) {
  return tx(async () => {
    const adh = await getAdherentOrFail(id);
    const now = nowIso();
    const append = (obs, txt) => `${obs ? `${obs} | ` : ''}${txt}`;

    const upd = await repos.adherents.patch(adh.id, {
      sansEnfant: true,
      nombreEnfants: 0,
      observations: append(adh.observations, motif ? `Déclaré sans enfant: ${motif}` : 'Travailleur sans enfant à charge (non éligible prestations familiales)'),
      updatedAt: now,
    });

    const statut = 'Sans enfant (Non éligible allocations)';
    const [existing] = await dossiersOf(adh);
    if (existing) {
      await repos.dossiers.patch(existing.id, {
        sansEnfant: true,
        nombreEnfants: 0,
        statut,
        certificatsScolariteFournis: false,
        pieces: existing.pieces.map((p) => (isEnfantPiece(p) ? { ...p, obligatoire: false, notes: 'Non requis : Travailleur sans enfant' } : p)),
        observations: append(existing.observations, motif ? `Travailleur sans enfant: ${motif}` : "Travailleur sans enfant à charge (dispense d'allocations familiales)"),
        historique: [{ date: frDateTime(), auteur: user.nom, action: 'Déclaration de situation familiale : Travailleur sans enfant à charge' }, ...(existing.historique || [])],
        updatedAt: now,
      });
    } else {
      await repos.dossiers.insert(
        newDossier(user, upd, {
          branche: 'PRESTATIONS_FAMILIALES',
          offre: 'Allocations Familiales (Non applicable - Sans enfant)',
          pieces: DEFAULT_PIECES_DOSSIER.map((p) => ({ ...p, obligatoire: !isEnfantPiece(p) })),
          note: 'Création du dossier - Travailleur sans enfant à charge',
          extra: {
            statut,
            sansEnfant: true,
            observations: 'Travailleur sans enfant à charge. Allocations familiales non applicables.',
          },
        })
      );
    }
    await logOperation(user, {
      typeOperation: 'DECLARATION_TRAVAILLEUR_SANS_ENFANT',
      entite: 'Dossier Allocations',
      adherentMatricule: adh.matricule,
      adherentNom: nomComplet(adh),
      description: `Déclaration travailleur sans enfant pour ${adh.matricule} : dispense de dossier d'allocations familiales`,
      nouvellesInformations: `Sans enfant: OUI, Nombre enfants: 0, Statut: ${statut}`,
    });
    return upd;
  });
}

export function assignerPortefeuille(user, adherentId, gestionnaireId) {
  return tx(async () => {
    const adh = await getAdherentOrFail(adherentId);
    const gest = await resolveGestionnaire(gestionnaireId);
    const upd = await repos.adherents.patch(adh.id, {
      gestionnaireId: gest?.id ?? null,
      gestionnaireNom: gest ? gestionnaireLabel(gest) : null,
      updatedAt: nowIso(),
    });
    await logOperation(user, {
      typeOperation: 'AFFECTATION_PORTEFEUILLE',
      entite: 'Gestionnaires de Portefeuille',
      adherentMatricule: adh.matricule,
      adherentNom: nomComplet(adh),
      description: gest
        ? `Affectation de l'adhérent ${adh.matricule} (${nomComplet(adh)}) au portefeuille de ${gestionnaireLabel(gest)}`
        : `Désaffectation du portefeuille pour l'adhérent ${adh.matricule}`,
    });
    return upd;
  });
}

export function updateSalaireCotisable(user, adherentId, montant) {
  return tx(async () => {
    const adh = await getAdherentOrFail(adherentId);
    const upd = await repos.adherents.patch(adh.id, { salaireCotisableCnps: montant, updatedAt: nowIso() });
    const bulletinsRecalcules = await recalculerBulletinsAdherent(upd);
    await logOperation(user, {
      typeOperation: 'AJUSTEMENT_COTISABLE_ADHERENT',
      entite: 'Paie Adhérents CNPS',
      adherentMatricule: adh.matricule,
      adherentNom: nomComplet(adh),
      description: `Ajustement de l'assiette cotisable CNPS pour ${adh.matricule} à ${montant.toLocaleString('fr-FR')} FCFA`,
      nouvellesInformations: `Assiette cotisable CNPS: ${montant.toLocaleString('fr-FR')} FCFA (standard: 60 000 FCFA) — ${bulletinsRecalcules} bulletin(s) recalculé(s)`,
    });
    return upd;
  });
}

/** Seuil d'immatriculation : le cumul atteint => statut "Éligible (seuil atteint)" (jamais de rétrogradation). */
export async function appliquerSeuilImmatriculation(adh) {
  const params = await repos.parametres.get('main');
  const seuil = params.seuilImmatriculation || 15000;
  const total = sumMoney(await cotisationsOf(adh), 'montant');
  if (total >= seuil && adh.statutImmatriculation === 'Non immatriculé') {
    await repos.adherents.patch(adh.id, { statutImmatriculation: 'Éligible (seuil atteint)', updatedAt: nowIso() });
  }
}
