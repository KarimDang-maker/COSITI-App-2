import { Router } from 'express';
import { z } from 'zod';
import { repos } from '../db/repository.js';
import { tx } from '../db/database.js';
import { authenticate, authorize, requireRole } from '../middleware/auth.js';
import { validate, idParam, isoDate, opt, positiveMoney, money, MODES_PAIEMENT } from '../middleware/validate.js';
import { ok } from '../utils/respond.js';
import { nowIso } from '../utils/ids.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/httpError.js';
import { resolveOrigineDecaissement } from '../utils/business.js';
import { logOperation, fmtMoney } from '../services/journal.js';
import { round2, addMoney } from '../utils/money.js';
import { completerVersement, cotisationsEnAttente, decorerVersements } from '../services/versements.js';
import { crudRouter } from './crud.js';

const str = (max, min = 1) => z.string().trim().min(min).max(max);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure attendue au format HH:MM');
const isDirecteur = (u) => ['DG', 'DGA'].includes(u?.role);

/* ============================================================
 * GESTIONNAIRES DE PORTEFEUILLE
 * ============================================================ */
const gestionnaireBase = z.object({
  code: opt(str(50)),
  nom: str(100),
  prenom: str(100),
  telephone: str(50),
  email: opt(z.string().trim().email().max(150)),
  zoneSecteur: str(150),
  statut: z.enum(['Actif', 'Inactif', 'En congé']).optional(),
  objectifsRecouvrementMensuel: opt(money),
  notes: opt(str(2000)),
});

export const gestionnaires = crudRouter({
  collection: 'gestionnaires',
  prefix: 'gp',
  entite: 'Gestionnaires de Portefeuille',
  types: { create: 'CREATION_GESTIONNAIRE', update: 'MODIFICATION_GESTIONNAIRE', delete: 'SUPPRESSION_GESTIONNAIRE' },
  schemas: { create: gestionnaireBase },
  writePerm: 'canConfigure',
  filters: ['statut'],
  search: ['nom', 'prenom', 'code', 'zoneSecteur'],
  describe: (g, op) =>
    op === 'create'
      ? `Enregistrement du gestionnaire de portefeuille : ${g.nom} ${g.prenom} (${g.code}) - Zone: ${g.zoneSecteur}`
      : op === 'update'
      ? `Mise à jour du gestionnaire de portefeuille ${g.code} (${g.nom} ${g.prenom})`
      : `Suppression du gestionnaire de portefeuille : ${g.nom} ${g.prenom} (${g.code})`,
  prepare: async (_u, d) => {
    let n = (await repos.gestionnaires.count()) + 1;
    let code = d.code;
    while (!code || (await repos.gestionnaires.findOne({ where: { code } }))) code = `GP-${String(n++).padStart(3, '0')}`;
    return { ...d, code, statut: d.statut ?? 'Actif', objectifsRecouvrementMensuel: d.objectifsRecouvrementMensuel ?? 0 };
  },
  afterUpdate: async (g) => {
    // Le nom du gestionnaire est dénormalisé sur les fiches adhérents : on le tient à jour
    for (const a of await repos.adherents.all({ where: { gestionnaireId: g.id } })) {
      await repos.adherents.patch(a.id, { gestionnaireNom: `${g.nom} ${g.prenom} (${g.code})` });
    }
  },
  afterDelete: async (g) => {
    for (const a of await repos.adherents.all({ where: { gestionnaireId: g.id } })) {
      await repos.adherents.patch(a.id, { gestionnaireId: null, gestionnaireNom: null });
    }
  },
});

/* ============================================================
 * FINANCES DAF : dépenses, versements bancaires, frais mobile money
 * ============================================================ */
export const CATEGORIES_DEPENSES = [
  'Cotisations CNPS & Sécurité Sociale', 'Loyer & Charges locatives', 'Fournitures de bureau & Imprimés',
  'Carburant & Déplacements', 'Primes & Salaires personnel', 'Communication, Internet & Téléphonie',
  'Entretien, Réparations & Équipements', 'Frais bancaires & Tenue de compte', 'Restauration & Réceptions',
  "Autre dépense d'exploitation",
];
const MODES_DEPENSE = ['Espèces / Caisse', 'Virement bancaire', 'Chèque', 'Orange Money', 'Wave', 'MTN MoMo', 'Moov Money'];

const depenseBase = z.object({
  date: isoDate,
  categorie: z.enum(CATEGORIES_DEPENSES),
  motif: str(1000),
  montant: positiveMoney,
  modePaiement: z.enum(MODES_DEPENSE),
  beneficiaire: str(200),
  numeroPiece: str(100),
  statut: z.enum(['Payé', 'En attente']).optional(),
  observations: opt(str(2000)),
  origineFonds: opt(z.enum(['Exploitation (Cotisations CNPS)', 'Apport personnel du PCA'])),
});

export const depenses = crudRouter({
  collection: 'depenses',
  prefix: 'dep',
  entite: 'Dépense courante',
  types: { create: 'ENREGISTREMENT_DEPENSE', update: 'MODIFICATION_DEPENSE', delete: 'SUPPRESSION_DEPENSE' },
  schemas: { create: depenseBase },
  readPerm: 'canManageFinances',
  writePerm: 'canManageFinances',
  confirmDelete: true,
  filters: ['categorie', 'statut', 'modePaiement', 'origineFonds'],
  search: ['motif', 'beneficiaire', 'numeroPiece'],
  dateField: 'date',
  describe: (d, op) =>
    op === 'create'
      ? `Enregistrement dépense : ${fmtMoney(d.montant)} (${d.categorie}) - ${d.motif}`
      : op === 'update'
      ? `Mise à jour de la dépense ${d.id} (${fmtMoney(d.montant)} - ${d.motif})`
      : `Suppression de la dépense ${d.id} (${fmtMoney(d.montant)} - ${d.motif})`,
  prepare: (u, d) => ({
    ...d,
    statut: d.statut ?? 'Payé',
    enregistrePar: `${u.nom} (${u.role})`,
    origineFonds: resolveOrigineDecaissement(d),
  }),
  afterUpdate: async (upd, prev, req) => {
    if (prev.numeroPiece?.startsWith('PAIE-') && req.body.montant !== undefined && req.body.montant !== prev.montant) {
      throw conflict('Cette dépense a été générée par la validation de la paie : son montant ne peut pas être modifié.');
    }
    // L'origine des fonds suit la catégorie / le motif quand l'utilisateur ne la fixe pas explicitement
    const touche = ['categorie', 'motif', 'observations'].some((k) => req.body[k] !== undefined);
    if (touche && req.body.origineFonds === undefined) {
      const origine = resolveOrigineDecaissement({ ...upd, origineFonds: undefined });
      if (origine !== upd.origineFonds) return repos.depenses.patch(upd.id, { origineFonds: origine });
    }
  },
  beforeDelete: async (d) => {
    if ((await repos.bulletins_paie.count({ where: { depenseAssocieeId: d.id } })) > 0) {
      throw conflict('Cette dépense est liée à une paie validée : suppression impossible.');
    }
  },
});

const SOURCES_FONDS = ['Recettes Cotisations Adhérents', 'Retraits Mobile Money', 'Fonds propres / Apport', 'Autre'];
const versementBase = z.object({
  date: isoDate,
  banque: str(150),
  numeroCompte: opt(str(100)),
  numeroBordereau: str(100),
  montant: positiveMoney,
  sourceFonds: z.enum(SOURCES_FONDS),
  deposant: str(150),
  statut: z.enum(['Validé', 'En attente de relevé']).optional(),
  observations: opt(str(2000)),
  arretPrecedentDate: opt(isoDate),
  arretPrecedentNom: opt(str(150)),
  arretPrecedentMatricule: opt(str(50)),
  arretPrecedentMontant: opt(money),
  arretPrecedentBordereau: opt(str(100)),
  arretPrecedentCotisationId: opt(str(64)),
  arretCotisationDate: opt(isoDate),
  arretCotisationNom: opt(str(150)),
  arretCotisationMatricule: opt(str(50)),
  arretCotisationMontant: opt(money),
  arretCotisationId: opt(str(64)),
  arretCotisationRef: opt(str(100)),
  nbCotisationsIncluses: opt(z.coerce.number().int().min(0)),
  cumulCotisationsIncluses: opt(money),
});

export const versements = crudRouter({
  collection: 'versements',
  prefix: 'vrs',
  entite: 'Versement bancaire',
  types: { create: 'ENREGISTREMENT_VERSEMENT_BANCAIRE', update: 'MODIFICATION_VERSEMENT_BANCAIRE', delete: 'SUPPRESSION_VERSEMENT_BANCAIRE' },
  schemas: { create: versementBase },
  readPerm: 'canManageFinances',
  writePerm: 'canManageFinances',
  confirmDelete: true,
  filters: ['banque', 'statut', 'sourceFonds'],
  search: ['banque', 'numeroBordereau', 'deposant'],
  dateField: 'date',
  decorate: (docs) => decorerVersements(docs),
  describe: (v, op) =>
    op === 'create'
      ? `Versement bancaire de ${fmtMoney(v.montant)} sur ${v.banque} (Bordereau: ${v.numeroBordereau})${v.arretCotisationNom ? ` | Arrêté à : ${v.arretCotisationNom} (${fmtMoney(v.arretCotisationMontant)} le ${v.arretCotisationDate})` : ''}`
      : op === 'update'
      ? `Mise à jour du versement bancaire ${v.numeroBordereau}`
      : `Suppression du versement bancaire ${v.numeroBordereau} (${fmtMoney(v.montant)} - ${v.banque})`,
  prepare: async (u, d) => ({ ...(await completerVersement({ ...d, statut: d.statut ?? 'Validé' })), enregistrePar: `${u.nom} (${u.role})` }),
  // Si la date ou le point d'arrêt change, la tranche de cotisations couverte est recalculée par le serveur
  afterUpdate: async (upd, prev, req) => {
    const b = req.body;
    const change = (b.date !== undefined && b.date !== prev.date) || (b.arretCotisationId !== undefined && b.arretCotisationId !== prev.arretCotisationId);
    if (!change) return;
    const derives = ['arretPrecedentDate', 'arretPrecedentNom', 'arretPrecedentMatricule', 'arretPrecedentMontant', 'arretPrecedentBordereau', 'arretPrecedentCotisationId', 'arretCotisationDate', 'arretCotisationNom', 'arretCotisationMatricule', 'arretCotisationMontant', 'arretCotisationRef', 'nbCotisationsIncluses', 'cumulCotisationsIncluses'];
    const base = { ...upd };
    for (const k of derives) if (b[k] === undefined) delete base[k];
    if (b.arretCotisationId === undefined) delete base.arretCotisationId;
    const recalcule = await completerVersement(base, upd.id);
    return repos.versements.patch(upd.id, Object.fromEntries(derives.concat('arretCotisationId').filter((k) => recalcule[k] !== undefined).map((k) => [k, recalcule[k]])));
  },
});

const OPERATEURS = ['Orange Money', 'MTN MoMo', 'Moov Money', 'Wave'];
const TYPES_FRAIS = ['Frais de retrait marchand', 'Commission prélevée sur encaissement', 'Frais de transfert opérateur', 'Frais de compte pro'];
const fraisBase = z.object({
  date: isoDate,
  operateur: z.enum(OPERATEURS),
  typeFrais: z.enum(TYPES_FRAIS),
  montantTransaction: positiveMoney,
  fraisPreleves: money,
  referenceTransaction: str(100),
  cotisationIdLiee: opt(str(64)),
  adherentConcerne: opt(str(150)),
  observations: opt(str(2000)),
});

const verifierFrais = (f) => {
  if (f.fraisPreleves > f.montantTransaction) throw badRequest('Les frais prélevés ne peuvent pas dépasser le montant de la transaction.');
  return { ...f, montantNet: round2(f.montantTransaction - f.fraisPreleves) };
};

export const fraisMobileMoney = crudRouter({
  collection: 'frais_mobile_money',
  prefix: 'fmm',
  entite: 'Frais Mobile Money',
  types: { create: 'ENREGISTREMENT_FRAIS_MOBILE_MONEY', update: 'MODIFICATION_FRAIS_MOBILE_MONEY', delete: 'SUPPRESSION_FRAIS_MOBILE_MONEY' },
  schemas: { create: fraisBase },
  readPerm: 'canManageFinances',
  writePerm: 'canManageFinances',
  confirmDelete: true,
  filters: ['operateur', 'typeFrais'],
  search: ['referenceTransaction', 'adherentConcerne'],
  dateField: 'date',
  describe: (f, op) =>
    op === 'create'
      ? `Saisie frais opérateur ${f.operateur} : ${fmtMoney(f.fraisPreleves)} prélevés sur ${fmtMoney(f.montantTransaction)} (Réf: ${f.referenceTransaction})`
      : op === 'update'
      ? `Mise à jour des frais Mobile Money ${f.referenceTransaction}`
      : `Suppression enregistrement frais ${f.operateur} (${fmtMoney(f.fraisPreleves)} prélevés)`,
  prepare: (u, d) => ({ ...verifierFrais(d), enregistrePar: `${u.nom} (${u.role})` }),
  afterUpdate: (upd) => repos.frais_mobile_money.patch(upd.id, verifierFrais(upd)),
});

/** Routes complémentaires finances (montées sur /api/versements) */
export const versementsExtra = Router();
versementsExtra.use(authenticate, authorize('canManageFinances'));
/** GET /api/versements/suivi/en-attente — cotisations non encore versées depuis le dernier point d'arrêt */
versementsExtra.get('/suivi/en-attente', async (_req, res) => ok(res, await cotisationsEnAttente()));

/* ---- Banques partenaires ---- */
const BANQUES_DEFAUT = [
  'BICICI', "Ecobank Côte d'Ivoire", 'SGCI (Société Générale)', 'BOA CI (Bank of Africa)', 'NSIA Banque',
  "BNI (Banque Nationale d'Investissement)", 'Coris Bank', 'Autre institution bancaire',
];
export const banquesDefaut = BANQUES_DEFAUT;

export const banques = Router();
banques.use(authenticate);

const listBanques = async () => (await repos.banques.all({ orderBy: [['nom', 'asc']] })).map((b) => b.nom);

/** GET /api/banques — catalogue des banques partenaires (tous les utilisateurs : liste déroulante des versements) */
banques.get('/', async (_req, res) => ok(res, await listBanques()));

banques.post('/', authorize('canManageFinances'), validate({ body: z.object({ nom: str(150) }) }), async (req, res) => {
  const { nom } = req.body;
  const exists = (await repos.banques.all()).some((b) => b.nom.toLowerCase() === nom.toLowerCase());
  if (exists) throw conflict(`La banque "${nom}" est déjà présente dans la liste.`);
  await tx(async () => {
    await repos.banques.insert({ id: '0', nom, actif: true });
    await logOperation(req.user, { typeOperation: 'AJOUT_BANQUE', entite: 'Banque', description: `Ajout de la banque partenaire "${nom}" par ${req.user.nom} (${req.user.role})`, nouvellesInformations: `Banque ajoutée : ${nom}` });
  });
  res.status(201).json({ success: true, data: await listBanques() });
});

/** DELETE /api/banques/:nom (nom URL-encodé) */
banques.delete('/:nom', authorize('canManageFinances'), validate({ params: z.object({ nom: str(150) }) }), async (req, res) => {
  const target = (await repos.banques.all()).find((b) => b.nom.toLowerCase() === req.params.nom.toLowerCase());
  if (!target) throw notFound(`La banque "${req.params.nom}" n'existe pas dans la liste.`);
  await tx(async () => {
    await repos.banques.delete(target.id);
    await logOperation(req.user, { typeOperation: 'SUPPRESSION_BANQUE', entite: 'Banque', description: `Suppression de la banque partenaire "${target.nom}" par ${req.user.nom} (${req.user.role})`, nouvellesInformations: `Banque retirée du catalogue actif : ${target.nom} (les versements passés restent inchangés)` });
  });
  ok(res, await listBanques());
});

/** POST /api/banques/reset — restaure la liste par défaut */
banques.post('/reset', authorize('canManageFinances'), async (_req, res) => {
  await tx(async () => {
    await repos.banques.deleteAll();
    for (const nom of BANQUES_DEFAUT) await repos.banques.insert({ id: '0', nom, actif: true });
  });
  ok(res, await listBanques());
});

/* ============================================================
 * PAIE : employés (les bulletins sont dans paie.routes.js)
 * ============================================================ */
const DEPARTEMENTS = ['Finances & Comptabilité', 'Caisse & Enregistrement', 'Opérations & Recouvrement', 'Direction Générale', 'Logistique & Services Généraux', 'Autre'];
const employeBase = z.object({
  matricule: opt(str(50)),
  nom: str(100),
  prenom: str(100),
  sexe: z.enum(['M', 'F']),
  poste: str(150),
  departement: z.enum(DEPARTEMENTS),
  typeContrat: z.enum(['CDI', 'CDD', 'Stage', 'Prestation / Temporaire']),
  dateEmbauche: isoDate,
  numeroCnps: opt(str(50)),
  numeroCmu: opt(str(50)),
  salaireBase: money,
  sursalaire: opt(money),
  indemniteTransport: money.optional(),
  indemniteLogement: opt(money),
  primesFixes: opt(money),
  nombrePartsFiscales: z.coerce.number().min(1).max(10).optional(),
  modePaiement: z.enum([...MODES_PAIEMENT, 'Espèces / Caisse']),
  banqueNom: opt(str(150)),
  numeroCompteBancaire: opt(str(100)),
  telephone: str(50),
  email: opt(z.string().trim().email().max(150)),
  actif: z.boolean().optional(),
  notes: opt(str(2000)),
});

export const employes = crudRouter({
  collection: 'employes',
  prefix: 'emp',
  entite: 'Paie & Salaires',
  types: { create: 'AJOUT_EMPLOYE', update: 'MODIFICATION_EMPLOYE', delete: 'SUPPRESSION_EMPLOYE' },
  schemas: { create: employeBase },
  readPerm: 'canManageFinances',
  writePerm: 'canManageFinances',
  confirmDelete: true,
  filters: ['departement', 'typeContrat'],
  search: ['nom', 'prenom', 'matricule', 'poste'],
  describe: (e, op) =>
    op === 'create'
      ? `Création fiche salarié : ${e.nom} ${e.prenom} (${e.matricule}) - Poste : ${e.poste} | Salaire base : ${fmtMoney(e.salaireBase)}`
      : op === 'update'
      ? `Mise à jour fiche salarié ${e.nom} ${e.prenom} (${e.matricule})`
      : `Suppression du salarié ${e.nom} ${e.prenom} (${e.matricule})`,
  prepare: async (_u, d) => {
    let n = (await repos.employes.count()) + 1;
    let matricule = d.matricule;
    while (!matricule || (await repos.employes.findOne({ where: { matricule } }))) matricule = `EMP-${String(n++).padStart(3, '0')}`;
    return { ...d, matricule, actif: d.actif ?? true, nombrePartsFiscales: d.nombrePartsFiscales ?? 1, indemniteTransport: d.indemniteTransport ?? 0 };
  },
  beforeDelete: async (e) => {
    if ((await repos.bulletins_paie.count({ where: { employeId: e.id } })) > 0) {
      throw conflict(`${e.nom} ${e.prenom} a des bulletins de paie : désactivez le salarié (actif = false) plutôt que de le supprimer.`);
    }
  },
});

/* ============================================================
 * DIRECTION : partenaires, agenda, notes (DG / DGA / DAF)
 * ============================================================ */
const SECTEURS = [
  'Institution publique / Ministère', 'Caisse Sociale (CNPS)', 'Banque & Microfinance', 'Opérateur Télécom & Mobile Money',
  'Organisation Professionnelle / Syndicat', 'Filière Agricole & Coopérative', 'Bailleur de fonds / ONG',
  'Partenaire Technique & Logistique', 'Autre',
];
const STATUTS_PARTENARIAT = ['Prospection préliminaire', 'Premier contact établi', 'Négociations en cours', 'Accord de principe', 'Convention signée / Actif', 'En veille / Suspendu'];
const partenaireBase = z.object({
  nomOrganisation: str(200),
  sigle: opt(str(50)),
  secteur: z.enum(SECTEURS),
  personneContact: str(150),
  titreContact: str(150),
  telephone: str(50),
  email: opt(z.string().trim().email().max(150)),
  adresse: opt(str(300)),
  statut: z.enum(STATUTS_PARTENARIAT),
  priorite: z.enum(['Stratégique (P1)', 'Prioritaire (P2)', 'Standard (P3)']),
  potentielSynergie: str(2000),
  datePremierContact: opt(isoDate),
  notesHistorique: opt(str(5000)),
});

export const partenaires = crudRouter({
  collection: 'partenaires',
  prefix: 'part',
  entite: 'Partenaire Direction',
  types: { create: 'CREATION_PARTENAIRE', update: 'MODIFICATION_PARTENAIRE', delete: 'SUPPRESSION_PARTENAIRE' },
  schemas: { create: partenaireBase },
  readPerm: 'canManageAgenda',
  writePerm: 'canManageAgenda',
  filters: ['statut', 'secteur', 'priorite'],
  search: ['nomOrganisation', 'sigle', 'personneContact'],
  describe: (p, op) =>
    op === 'create'
      ? `Enregistrement du partenaire potentiel/actif : ${p.nomOrganisation} (${p.secteur}) - Contact: ${p.personneContact}`
      : op === 'update'
      ? `Mise à jour de la fiche partenaire ${p.nomOrganisation}`
      : `Suppression du partenaire ${p.nomOrganisation}`,
  prepare: (u, d) => ({ ...d, enregistrePar: `${u.nom} (${u.role})` }),
  beforeDelete: async (p) => {
    if ((await repos.rendez_vous.count({ where: { partenaireId: p.id } })) > 0) {
      throw conflict('Ce partenaire est lié à des rendez-vous : supprimez-les ou passez le partenaire « En veille / Suspendu ».');
    }
  },
});

const rdvBase = z.object({
  titre: str(250),
  partenaireId: opt(str(64)),
  nomInterlocuteurOuPartenaire: str(200),
  date: isoDate,
  heure: time,
  dureeEstimee: opt(str(50)),
  modalite: z.enum(['Siège COSITI', 'Bureaux du partenaire', 'Visioconférence', 'Appel téléphonique', 'Sur le terrain']),
  lieuPrecision: opt(str(300)),
  participantsDirection: str(300),
  responsablePrincipal: z.enum(['DG', 'DGA', 'DAF']),
  statut: z.enum(['Prévu', 'Confirmé', 'Tenu', 'Reporté', 'Annulé']),
  ordreDuJour: str(3000),
  compteRendu: opt(str(10000)),
  engagementsEtActions: opt(str(5000)),
  dateRappel: opt(isoDate),
});

export const rendezVous = crudRouter({
  collection: 'rendez_vous',
  prefix: 'rdv',
  entite: 'Agenda Direction',
  types: { create: 'CREATION_RENDEZ_VOUS', update: 'MODIFICATION_RENDEZ_VOUS', delete: 'SUPPRESSION_RENDEZ_VOUS' },
  schemas: { create: rdvBase },
  readPerm: 'canManageAgenda',
  writePerm: 'canManageAgenda',
  filters: ['statut', 'responsablePrincipal', 'partenaireId'],
  search: ['titre', 'nomInterlocuteurOuPartenaire'],
  dateField: 'date',
  describe: (r, op) =>
    op === 'create'
      ? `Planification rendez-vous : « ${r.titre} » le ${r.date} à ${r.heure} avec ${r.nomInterlocuteurOuPartenaire}`
      : op === 'update'
      ? `Mise à jour du rendez-vous « ${r.titre} » (${r.date}, statut : ${r.statut})`
      : `Suppression du rendez-vous : ${r.titre} du ${r.date}`,
  prepare: async (u, d) => {
    if (d.partenaireId && !(await repos.partenaires.get(d.partenaireId))) throw badRequest('Partenaire introuvable.');
    return { ...d, enregistrePar: `${u.nom} (${u.role})` };
  },
});

const CONFIDENTIEL = 'Confidentiel Direction (DG / DGA)';
const noteBase = z.object({
  titre: str(250),
  date: isoDate,
  categorie: z.enum(['Stratégie & Partenariats', 'Négociation & Accords', 'Gouvernance & Décisions', 'Vigilance Financière & DAF', 'Réglementation & CNPS', 'Mémorandum interne Direction']),
  partenaireLie: opt(str(200)),
  rendezVousLie: opt(str(64)),
  contenu: str(20000),
  pointsCles: z.array(str(500)).max(50),
  prochaineEcheance: opt(isoDate),
  niveauConfidentialite: z.enum([CONFIDENTIEL, 'Direction Élargie']),
  auteur: opt(str(150)),
});

export const notesDirection = crudRouter({
  collection: 'notes_direction',
  prefix: 'note',
  entite: 'Note Direction',
  types: { create: 'CREATION_NOTE_DIRECTION', update: 'MODIFICATION_NOTE_DIRECTION', delete: 'SUPPRESSION_NOTE_DIRECTION' },
  schemas: { create: noteBase },
  readPerm: 'canManageAgenda',
  writePerm: 'canManageAgenda',
  filters: ['categorie', 'niveauConfidentialite'],
  search: ['titre', 'contenu', 'auteur'],
  dateField: 'date',
  // Les notes « Confidentiel Direction » ne sont visibles que du DG et de la DGA
  scope: (req) => (isDirecteur(req.user) ? {} : { niveauConfidentialite: { ne: CONFIDENTIEL } }),
  canAccess: (req, n) => isDirecteur(req.user) || n.niveauConfidentialite !== CONFIDENTIEL,
  describe: (n, op) =>
    op === 'create' ? `Création de la note de direction : « ${n.titre} » (${n.categorie})` : op === 'update' ? `Mise à jour de la note de direction « ${n.titre} »` : `Suppression de la note de direction : ${n.titre}`,
  prepare: (u, d) => {
    if (d.niveauConfidentialite === CONFIDENTIEL && !isDirecteur(u)) throw forbidden('Seuls le DG et la DGA peuvent créer une note confidentielle.');
    return { ...d, auteur: d.auteur || `${u.nom} (${u.role})` };
  },
  afterUpdate: (upd, _prev, req) => {
    if (upd.niveauConfidentialite === CONFIDENTIEL && !isDirecteur(req.user)) throw forbidden('Seuls le DG et la DGA peuvent classer une note confidentielle.');
  },
});

/* ============================================================
 * RAPPORTS DE RÉUNION & PV
 * ============================================================ */
const TYPES_REUNION = [
  "Conseil d'Administration", 'Comité de Direction (DG / DGA / DAF)', 'Réunion de Coordination des Gestionnaires',
  'Assemblée Générale Ordinaire / Extraordinaire', 'Comité de Suivi & Audit', 'Comité de Trésorerie & Recouvrement', 'Autre Réunion',
];
const decisionSchema = z.object({
  id: str(64),
  description: str(2000),
  responsable: str(150),
  echeance: isoDate,
  statut: z.enum(['À faire', 'En cours', 'Réalisé']),
});
const reunionBase = z.object({
  titre: str(250),
  typeReunion: z.enum(TYPES_REUNION),
  date: isoDate,
  heureDebut: time,
  heureFin: opt(time),
  lieu: str(250),
  presidentSeance: str(150),
  secretaireSeance: str(150),
  participantsPresents: str(3000),
  participantsAbsents: opt(str(3000)),
  ordreDuJour: str(5000),
  syntheseDiscussions: str(30000),
  decisions: z.array(decisionSchema).max(100),
  prochaineReunionDate: opt(isoDate),
  statut: z.enum(['Brouillon', 'Validé & Signé', 'Diffusé']).optional(),
  piecesJointesOuNotes: opt(str(3000)),
});

export const rapportsReunions = crudRouter({
  collection: 'rapports_reunions',
  prefix: 'reunion',
  entite: 'Rapports de Réunion',
  types: { create: 'CREATION_RAPPORT_REUNION', update: 'MODIFICATION_RAPPORT_REUNION', delete: 'SUPPRESSION_RAPPORT_REUNION' },
  schemas: { create: reunionBase },
  writePerm: 'canConfigure',
  filters: ['statut', 'typeReunion'],
  search: ['titre', 'lieu', 'presidentSeance'],
  dateField: 'date',
  describe: (r, op) =>
    op === 'create'
      ? `Création du PV de réunion : « ${r.titre} » (${r.typeReunion}) tenue le ${r.date}`
      : op === 'update'
      ? `Mise à jour du PV de réunion « ${r.titre} » (${r.statut})`
      : `Suppression du PV de réunion : ${r.titre} du ${r.date}`,
  prepare: (u, d) => ({ ...d, statut: d.statut ?? 'Brouillon', redigePar: `${u.nom} (${u.role})` }),
  // Un PV validé/signé est un acte : seule la Direction Générale peut encore le corriger,
  // les autres peuvent uniquement le faire passer de « Validé & Signé » à « Diffusé ».
  afterUpdate: (_upd, prev, req) => {
    if (prev.statut === 'Brouillon' || isDirecteur(req.user)) return;
    const onlyDiffuse = Object.keys(req.body).every((k) => k === 'statut') && prev.statut === 'Validé & Signé' && req.body.statut === 'Diffusé';
    if (!onlyDiffuse) throw conflict('Ce PV est validé : seule la Direction Générale peut le modifier.');
  },
  beforeDelete: (r, req) => {
    if (r.statut !== 'Brouillon' && !isDirecteur(req.user)) throw conflict('Un PV validé ou diffusé ne peut être supprimé que par la Direction Générale.');
  },
});

/* ============================================================
 * RAPPORTS DES AGENTS DE TERRAIN (saisie caissière)
 * ============================================================ */
const CONFORMITES = [
  'Conforme (Fonds reçus complets)', 'Conforme (Fonds complets)', 'Écart constaté (À justifier)', 'En attente de vérification DAF',
];
const agentBase = z.object({
  dateRapport: isoDate,
  gestionnaireId: opt(str(64)),
  agentNom: str(150),
  agentTelephone: opt(str(50)),
  zoneSecteur: str(150),
  typeMission: str(150),
  adherentsVisites: z.coerce.number().int().min(0).max(100000),
  adherentsCotisants: z.coerce.number().int().min(0).max(100000),
  nouvellesAdhesions: z.coerce.number().int().min(0).max(100000),
  montantEspecesRemis: money,
  montantMobileMoneyDeclare: money,
  conformiteCaisse: z.enum(CONFORMITES),
  ecartMontant: opt(z.coerce.number()),
  justificationEcart: opt(str(2000)),
  explicationEcart: opt(str(2000)),
  difficultesRencontrees: opt(str(3000)),
  difficultesTerrain: opt(str(3000)),
  actionsDemain: opt(str(3000)),
  actionsPrioritaires: opt(str(3000)),
  observations: opt(str(3000)),
  commentairesCaissiere: opt(str(3000)),
});

/** Totaux recalculés côté serveur + champs alias du front synchronisés */
function normaliserRapportAgent(d) {
  const total = addMoney(d.montantEspecesRemis ?? 0, d.montantMobileMoneyDeclare ?? 0);
  const justification = d.justificationEcart ?? d.explicationEcart;
  const difficultes = d.difficultesRencontrees ?? d.difficultesTerrain;
  const actions = d.actionsDemain ?? d.actionsPrioritaires;
  return {
    ...d,
    montantTotalCollecte: total,
    totalCollecte: total,
    justificationEcart: justification,
    explicationEcart: justification,
    difficultesRencontrees: difficultes,
    difficultesTerrain: difficultes,
    actionsDemain: actions,
    actionsPrioritaires: actions,
  };
}

export const rapportsAgents = crudRouter({
  collection: 'rapports_agents',
  prefix: 'rep-agent',
  entite: 'Rapports Agents (Caisse)',
  types: { create: 'ENREGISTREMENT_RAPPORT_AGENT', update: 'MODIFICATION_RAPPORT_AGENT', delete: 'SUPPRESSION_RAPPORT_AGENT' },
  schemas: { create: agentBase },
  writePerm: 'canRecord',
  deletePerm: 'canDeleteRecords',
  filters: ['gestionnaireId', 'statutValidation', 'conformiteCaisse'],
  search: ['agentNom', 'zoneSecteur', 'typeMission'],
  dateField: 'dateRapport',
  describe: (r, op) =>
    op === 'create'
      ? `Enregistrement du rapport d'agent de ${r.agentNom} : ${fmtMoney(r.montantEspecesRemis)} en espèces remis + ${fmtMoney(r.montantMobileMoneyDeclare)} Mobile Money (${r.conformiteCaisse})`
      : op === 'update'
      ? `Mise à jour du rapport agent de ${r.agentNom} du ${r.dateRapport}`
      : `Suppression du rapport agent de ${r.agentNom} du ${r.dateRapport}`,
  prepare: (u, d) => ({
    ...normaliserRapportAgent(d),
    saisiPar: `${u.nom}`,
    dateHeureSaisie: nowIso(),
    statutValidation: 'Enregistré par Caissière',
  }),
  afterUpdate: async (upd, prev, req) => {
    if (['Vérifié DAF', 'Validé Direction'].includes(prev.statutValidation) && !req.permissions.canManageFinances) {
      throw conflict('Ce rapport a déjà été visé : seule la Direction financière peut le modifier.');
    }
    return repos.rapports_agents.patch(upd.id, normaliserRapportAgent(upd));
  },
  beforeDelete: (r, req) => {
    if (r.statutValidation !== 'Enregistré par Caissière' && r.statutValidation !== 'Enregistré en caisse' && !req.permissions.canManageFinances) {
      throw conflict('Ce rapport a été visé : suppression réservée à la Direction financière.');
    }
  },
});

/** POST /api/rapports-agents/:id/valider-daf — { visa } : visa & contrôle du DAF */
rapportsAgents.post(
  '/:id/valider-daf',
  authorize('canManageFinances'),
  validate({ params: idParam, body: z.object({ visa: opt(str(200)) }) }),
  async (req, res) => {
    const r = await tx(async () => {
      const cur = await repos.rapports_agents.get(req.params.id);
      if (!cur) throw notFound('Rapport introuvable.');
      const visa = req.body.visa || `${req.user.nom} (${req.user.role})`;
      const upd = await repos.rapports_agents.patch(cur.id, { statutValidation: 'Vérifié DAF', visaDaf: visa, updatedAt: nowIso() });
      await logOperation(req.user, {
        typeOperation: 'VALIDATION_RAPPORT_AGENT_DAF',
        entite: 'Rapports Agents (Caisse)',
        description: `Visa & Contrôle DAF validé pour le rapport agent de ${cur.agentNom} du ${cur.dateRapport} (${visa})`,
      });
      return upd;
    });
    ok(res, r);
  }
);

/** POST /api/rapports-agents/:id/valider-direction — validation finale DG / DGA (après visa DAF) */
rapportsAgents.post('/:id/valider-direction', requireRole('DG', 'DGA'), validate({ params: idParam }), async (req, res) => {
  const r = await tx(async () => {
    const cur = await repos.rapports_agents.get(req.params.id);
    if (!cur) throw notFound('Rapport introuvable.');
    if (cur.statutValidation !== 'Vérifié DAF') throw conflict("Le rapport doit d'abord être visé par le DAF.");
    const upd = await repos.rapports_agents.patch(cur.id, { statutValidation: 'Validé Direction', updatedAt: nowIso() });
    await logOperation(req.user, {
      typeOperation: 'MODIFICATION_RAPPORT_AGENT',
      entite: 'Rapports Agents (Caisse)',
      description: `Validation Direction du rapport agent de ${cur.agentNom} du ${cur.dateRapport}`,
    });
    return upd;
  });
  ok(res, r);
});
