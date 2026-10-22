import { Router } from 'express';
import { z } from 'zod';
import { repos } from '../db/repository.js';
import { tx } from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, idParam, isoDate, opt, pageQuery } from '../middleware/validate.js';
import { ok, created, page } from '../utils/respond.js';
import { newId, nowIso, today, frDateTime } from '../utils/ids.js';
import { notFound } from '../utils/httpError.js';
import { BRANCHES_CNPS, getPiecesForOffre, OFFRE_ALLOCATIONS } from '../data/cnps.js';
import { logOperation } from '../services/journal.js';
import { getAdherentOrFail } from '../services/adherents.js';
import { generateAlerts } from '../utils/business.js';

const router = Router();
router.use(authenticate);

const STATUTS = [
  'Dossier non commencé', 'Dossier en cours', 'Dossier incomplet', 'Dossier complet',
  'Dossier transmis', 'Dossier traité', 'Sans enfant (Non éligible allocations)',
];
const BRANCHES = ['PRESTATIONS_FAMILIALES', 'RISQUES_PROFESSIONNELS', 'PVID'];

const pieceSchema = z.object({
  id: z.string().min(1).max(64),
  nom: z.string().min(1).max(300),
  obligatoire: z.boolean(),
  recu: z.boolean(),
  dateReception: opt(isoDate),
  fichierRef: opt(z.string().max(500)),
  notes: opt(z.string().max(1000)),
});

const updateSchema = z
  .object({
    statut: z.enum(STATUTS),
    pieces: z.array(pieceSchema).max(100),
    nombreEnfants: z.coerce.number().int().min(0).max(50),
    sansEnfant: z.boolean(),
    certificatsScolariteFournis: z.boolean(),
    dateDepot: opt(isoDate),
    dateTransmission: opt(isoDate),
    dateRelance: opt(isoDate),
    dateDecision: opt(isoDate),
    montantPrestation: opt(z.coerce.number().min(0)),
    numeroCnps: opt(z.string().trim().max(50)),
    observations: opt(z.string().max(2000)),
    noteAction: opt(z.string().trim().max(500)), // libellé de l'entrée d'historique
  })
  .partial();

const listQuery = pageQuery.extend({
  statut: z.enum(STATUTS).optional(),
  branche: z.enum(BRANCHES).optional(),
  adherentId: z.string().max(64).optional(),
});

/** GET /api/dossiers?statut=&branche=&adherentId=&q= */
router.get('/', validate({ query: listQuery }), async (req, res) => {
  const { q, statut, branche, adherentId, page: p, pageSize } = req.validatedQuery;
  page(
    res,
    (await repos.dossiers.paginate({
      where: { statut, branche, adherentId },
      like: q ? { term: q, keys: ['adherentNomPrenom', 'matricule', 'numeroCnps'] } : undefined,
      page: p,
      pageSize,
    }))
  );
});

/** GET /api/dossiers/catalogue — branches CNPS, offres et pièces par défaut */
router.get('/catalogue', (_req, res) => ok(res, BRANCHES_CNPS));

router.get('/:id', validate({ params: idParam }), async (req, res) => {
  const d = (await repos.dossiers.get(req.params.id));
  if (!d) throw notFound('Dossier introuvable.');
  ok(res, d);
});

/** POST /api/dossiers — { adherentId, branche?, sousRubriqueOffre? } : création explicite d'un dossier CNPS */
router.post(
  '/',
  authorize('canManageDossiers'),
  validate({
    body: z.object({
      adherentId: z.string().min(1).max(64),
      branche: z.enum(BRANCHES).default('PRESTATIONS_FAMILIALES'),
      sousRubriqueOffre: z.string().max(200).default(OFFRE_ALLOCATIONS),
    }),
  }),
  async (req, res) => {
    const { adherentId, branche, sousRubriqueOffre } = req.body;
    const dossier = (await tx(async () => {
      const adh = (await getAdherentOrFail(adherentId));
      const now = nowIso();
      const d = (await repos.dossiers.insert({
        id: newId('dos'),
        adherentId: adh.id,
        matricule: adh.matricule,
        adherentNomPrenom: `${adh.nom} ${adh.prenom}`,
        numeroCnps: adh.numeroCnps || 'En attente',
        branche,
        sousRubriqueOffre,
        dateImmatriculation: adh.dateImmatriculation || today(),
        statut: 'Dossier non commencé',
        pieces: getPiecesForOffre(sousRubriqueOffre).map((p) => ({ ...p, recu: false })),
        nombreEnfants: 0,
        certificatsScolariteFournis: false,
        historique: [{ date: frDateTime(), auteur: req.user.nom, action: `Création du dossier CNPS [${branche}] - ${sousRubriqueOffre}` }],
        createdAt: now,
        updatedAt: now,
      }));
      (await logOperation(req.user, {
        typeOperation: 'CREATION_DOSSIER',
        entite: 'Dossier Allocations',
        adherentMatricule: adh.matricule,
        adherentNom: `${adh.nom} ${adh.prenom}`,
        description: `Création du dossier CNPS [${branche}] - ${sousRubriqueOffre} pour ${adh.matricule}`,
      }));
      return d;
    }));
    created(res, dossier);
  }
);

/** PUT /api/dossiers/:id — mise à jour (statut, pièces reçues, dates...) ; alimente l'historique */
router.put('/:id', authorize('canManageDossiers'), validate({ params: idParam, body: updateSchema }), async (req, res) => {
  const result = (await tx(async () => {
    const cur = (await repos.dossiers.get(req.params.id));
    if (!cur) throw notFound('Dossier introuvable.');
    const { noteAction, ...data } = req.body;

    if (data.statut === 'Dossier transmis' && !data.dateTransmission && !cur.dateTransmission) data.dateTransmission = today();
    if (data.statut === 'Dossier traité' && !data.dateDecision && !cur.dateDecision) data.dateDecision = today();

    const action = noteAction || (data.statut && data.statut !== cur.statut ? `Statut : ${cur.statut} ➔ ${data.statut}` : 'Mise à jour des informations du dossier');
    const upd = (await repos.dossiers.patch(cur.id, {
      ...data,
      historique: [{ date: frDateTime(), auteur: req.user.nom, action }, ...(cur.historique || [])],
      updatedAt: nowIso(),
    }));

    if (data.sansEnfant !== undefined || data.nombreEnfants !== undefined) {
      const adh = (await repos.adherents.get(cur.adherentId)) || (await repos.adherents.findOne({ where: { matricule: cur.matricule } }));
      if (adh) {
        (await repos.adherents.patch(adh.id, {
          sansEnfant: data.sansEnfant ?? adh.sansEnfant,
          nombreEnfants: data.nombreEnfants ?? adh.nombreEnfants,
          updatedAt: nowIso(),
        }));
      }
    }
    (await logOperation(req.user, {
      typeOperation: 'MODIFICATION_DOSSIER',
      entite: 'Dossier Allocations',
      adherentMatricule: cur.matricule,
      adherentNom: cur.adherentNomPrenom,
      description: `Mise à jour dossier allocations pour ${cur.matricule}: ${action}`,
      nouvellesInformations: `Statut: ${upd.statut}, Enfants: ${upd.nombreEnfants}`,
    }));
    return upd;
  }));
  ok(res, result);
});

export default router;

/** GET /api/alertes — alertes calculées en temps réel (retards, seuil 15 000, vérification 15/30, dossiers) */
export const alertesRouter = Router();
alertesRouter.use(authenticate);
alertesRouter.get(
  '/',
  validate({ query: z.object({ type: z.enum(['NON_A_JOUR', 'SEUIL_15000_ATTEINT', 'VERIFICATION_15_30', 'DOSSIER_ALLOCATIONS']).optional(), niveau: z.enum(['info', 'warning', 'urgent']).optional() }) }),
  async (req, res) => {
    const { type, niveau } = req.validatedQuery;
    let alertes = generateAlerts((await repos.adherents.all()), (await repos.cotisations.all()), (await repos.dossiers.all()), (await repos.parametres.get('main')));
    if (type) alertes = alertes.filter((a) => a.type === type);
    if (niveau) alertes = alertes.filter((a) => a.niveau === niveau);
    ok(res, alertes, 200, {
      total: alertes.length,
      urgentes: alertes.filter((a) => a.niveau === 'urgent').length,
    });
  }
);
