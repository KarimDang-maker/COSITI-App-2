import { Router } from 'express';
import { z } from 'zod';
import { repos } from '../db/repository.js';
import { authenticate, authorize, requireConfirmation } from '../middleware/auth.js';
import { validate, idParam, isoDate, opt, pageQuery, positiveMoney, MODES_PAIEMENT } from '../middleware/validate.js';
import { ok, created, page } from '../utils/respond.js';
import { notFound } from '../utils/httpError.js';
import { MOIS_FR } from '../utils/dates.js';
import { sumMoney } from '../utils/money.js';
import * as svc from '../services/cotisations.js';

const router = Router();
router.use(authenticate);

const mois = z.enum(MOIS_FR);

export const createSchema = z
  .object({
    adherentId: opt(z.string().max(64)),
    matricule: opt(z.string().max(50)),
    datePaiement: isoDate,
    montant: positiveMoney,
    modePaiement: z.enum(MODES_PAIEMENT),
    reference: opt(z.string().trim().max(100)),
    mois: opt(mois),
    annee: opt(z.coerce.number().int().min(2000).max(2100)),
    agentEnregistreur: opt(z.string().trim().max(150)),
    observations: opt(z.string().trim().max(1000)),
  })
  .refine((d) => d.adherentId || d.matricule, { message: 'adherentId ou matricule requis', path: ['adherentId'] });

export const updateSchema = z
  .object({
    datePaiement: isoDate,
    montant: positiveMoney,
    modePaiement: z.enum(MODES_PAIEMENT),
    reference: opt(z.string().trim().max(100)),
    mois,
    annee: z.coerce.number().int().min(2000).max(2100),
    observations: opt(z.string().trim().max(1000)),
  })
  .partial()
  .extend({ pinCode: z.string().optional() });

const TYPES_REGUL = [
  'Complément de montant antérieur',
  'Rattrapage arriérés (depuis Juillet)',
  'Rectification rétroactive de date/montant',
  'Régularisation exceptionnelle DAF/DGA',
];

const regulSchema = z
  .object({
    cotisationId: opt(z.string().max(64)),
    adherentId: opt(z.string().max(64)),
    matricule: opt(z.string().max(50)),
    montant: positiveMoney,
    modePaiement: z.enum(MODES_PAIEMENT),
    datePaiement: isoDate,
    mois,
    annee: z.coerce.number().int().min(2000).max(2100),
    typeRegularisation: z.enum(TYPES_REGUL),
    motifRegularisation: z.string().trim().min(5, 'Motif obligatoire (5 caractères min.)').max(1000),
    montantAnterieurInitial: opt(z.coerce.number().min(0)),
    montantComplementaire: opt(z.coerce.number().min(0)),
    reference: opt(z.string().trim().max(100)),
    observations: opt(z.string().trim().max(1000)),
  })
  .refine((d) => d.cotisationId || d.adherentId || d.matricule, { message: 'cotisationId, adherentId ou matricule requis', path: ['cotisationId'] });

const listQuery = pageQuery.extend({
  adherentId: z.string().max(64).optional(),
  matricule: z.string().max(50).optional(),
  modePaiement: z.enum(MODES_PAIEMENT).optional(),
  mois: mois.optional(),
  annee: z.coerce.number().int().optional(),
  du: isoDate.optional(),
  au: isoDate.optional(),
  regularisation: z.enum(['true']).optional(),
});

/** GET /api/cotisations?adherentId=&matricule=&modePaiement=&mois=&annee=&du=&au=&q=&page=&pageSize= (avec totaux) */
router.get('/', validate({ query: listQuery }), async (req, res) => {
  const { q, adherentId, matricule, modePaiement, mois: m, annee, du, au, regularisation, page: p, pageSize } = req.validatedQuery;
  const where = {
    adherentId, matricule, modePaiement, annee,
    ...(m ? { mois: m } : {}),
    ...(du || au ? { datePaiement: { gte: du, lte: au } } : {}),
    ...(regularisation ? { estRegularisation: true } : {}),
  };
  const opts = {
    where,
    like: q ? { term: q, keys: ['adherentNomPrenom', 'matricule', 'reference', 'agentEnregistreur'] } : undefined,
    orderBy: [['datePaiement', 'desc']],
  };
  const result = await repos.cotisations.paginate({ ...opts, page: p, pageSize });
  const totalMontant = sumMoney(await repos.cotisations.all(opts), 'montant');
  page(res, result, { totalMontant });
});

router.get('/:id', validate({ params: idParam }), async (req, res) => {
  const c = await repos.cotisations.get(req.params.id);
  if (!c) throw notFound('Cotisation introuvable.');
  ok(res, c);
});

/** POST /api/cotisations — encaissement (caisse) */
router.post('/', authorize('canRecord'), validate({ body: createSchema }), async (req, res) =>
  created(res, await svc.enregistrerCotisation(req.user, req.body))
);

/** POST /api/cotisations/regulariser — régularisation rétroactive (DAF, DGA, DG, Administrateur) */
router.post('/regulariser', authorize('canRegulariserCotisations'), validate({ body: regulSchema }), async (req, res) =>
  created(res, await svc.regulariserCotisation(req.user, req.body))
);

/** PUT /api/cotisations/:id — modification (droit d'édition + code de confirmation) */
router.put('/:id', authorize('canEditRecords'), validate({ params: idParam, body: updateSchema }), requireConfirmation, async (req, res) =>
  ok(res, await svc.modifierCotisation(req.user, req.params.id, req.body))
);

/** DELETE /api/cotisations/:id — suppression (droit de suppression + code de confirmation) */
router.delete('/:id', authorize('canDeleteRecords'), validate({ params: idParam }), requireConfirmation, async (req, res) =>
  ok(res, await svc.supprimerCotisation(req.user, req.params.id))
);

export default router;
