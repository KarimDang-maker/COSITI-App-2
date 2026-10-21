import { Router } from 'express';
import { z } from 'zod';
import { repos } from '../db/repository.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, idParam, isoDate, yearMonth, opt, money, pageQuery } from '../middleware/validate.js';
import { ok, page } from '../utils/respond.js';
import { notFound } from '../utils/httpError.js';
import { sumMoney } from '../utils/money.js';
import { determinerTrancheLoi } from '../utils/paie.js';
import * as svc from '../services/paie.js';

const router = Router();
router.use(authenticate, authorize('canManageFinances'));

const STATUTS = ['Brouillon', 'Validé DAF', 'Payé'];

const listQuery = pageQuery.extend({
  mois: yearMonth.optional(),
  employeId: z.string().max(64).optional(),
  statut: z.enum(STATUTS).optional(),
  typeBeneficiaire: z.enum(['EMPLOYE', 'ADHERENT_CNPS']).optional(),
});

/** GET /api/paie/bulletins?mois=2026-03&typeBeneficiaire=EMPLOYE&statut=&employeId=&q= */
router.get('/bulletins', validate({ query: listQuery }), async (req, res) => {
  const { q, mois, employeId, statut, typeBeneficiaire, page: p, pageSize } = req.validatedQuery;
  page(
    res,
    (await repos.bulletins_paie.paginate({
      where: { mois, employeId, statut, typeBeneficiaire },
      like: q ? { term: q, keys: ['employeNomComplet', 'employeMatricule', 'bulletinNumero'] } : undefined,
      orderBy: [['mois', 'desc'], ['employeMatricule', 'asc']],
      page: p,
      pageSize,
    }))
  );
});

/**
 * GET /api/paie/recap?mois=2026-03 — masse salariale du mois (personnel / adhérents CNPS), indicateurs par tranche légale,
 * déclaration CNPS et déclaration fiscale DGI / communes : tout est calculé par le serveur.
 */
router.get('/recap', validate({ query: z.object({ mois: yearMonth }) }), async (req, res) => ok(res, await svc.recapPaie(req.validatedQuery.mois)));

/** GET /api/paie/adherents-cnps?mois=2026-03 — paie CNPS des adhérents immatriculés (bulletin enregistré, sinon projection du barème) */
router.get('/adherents-cnps', validate({ query: z.object({ mois: yearMonth }) }), async (req, res) => ok(res, await svc.adherentsCnpsDuMois(req.validatedQuery.mois)));

/** POST /api/paie/adherents/:id/apercu — { mois, montant } : simulation du bulletin CNPS d'un adhérent pour une assiette donnée (sans enregistrer) */
router.post(
  '/adherents/:id/apercu',
  validate({ params: idParam, body: z.object({ mois: yearMonth, montant: money }) }),
  async (req, res) => ok(res, await svc.apercuAdherentCnps(req.params.id, req.body.mois, req.body.montant))
);

router.get('/bulletins/:id', validate({ params: idParam }), async (req, res) => {
  const b = (await repos.bulletins_paie.get(req.params.id));
  if (!b) throw notFound('Bulletin introuvable.');
  ok(res, b);
});

const editSchema = z
  .object({
    salaireBase: money,
    sursalaire: money,
    primeAnciennete: money,
    primeRendement: money,
    indemniteTransport: money,
    indemniteLogement: money,
    autresPrimes: money,
    acomptesAvances: money,
    retenuesDiverses: money,
    heuresTravaillees: z.coerce.number().min(0).max(744),
    joursTravailles: z.coerce.number().min(0).max(31),
    notesCommentaires: opt(z.string().max(2000)),
    datePaiement: opt(isoDate),
    statut: z.enum(STATUTS),
  })
  .partial();

/**
 * POST /api/paie/bulletins/:id/apercu — aperçu en direct de la saisie d'un bulletin : le calcul (barème CNPS / CGI) est fait
 * par le serveur, rien n'est enregistré.
 */
router.post('/bulletins/:id/apercu', validate({ params: idParam, body: editSchema }), async (req, res) =>
  ok(res, await svc.apercuBulletinExistant(req.params.id, req.body))
);

/** GET /api/paie/tranche?salaire=60000 — tranche légale (exonération, pivot, assujetti) d'un salaire de base */
router.get('/tranche', validate({ query: z.object({ salaire: money }) }), (req, res) => ok(res, determinerTrancheLoi(req.validatedQuery.salaire)));

/** PUT /api/paie/bulletins/:id — le serveur recalcule TOUS les montants à partir des éléments saisis */
router.put('/bulletins/:id', validate({ params: idParam, body: editSchema }), async (req, res) =>
  ok(res, (await svc.saveBulletin(req.user, req.params.id, req.body)))
);

router.delete('/bulletins/:id', validate({ params: idParam }), async (req, res) => ok(res, (await svc.deleteBulletin(req.user, req.params.id))));

/** POST /api/paie/generer — { mois: '2026-03', ecraserExistant? } : bulletins du personnel actif */
router.post(
  '/generer',
  validate({ body: z.object({ mois: yearMonth, ecraserExistant: z.boolean().default(false) }) }),
  async (req, res) => ok(res, (await svc.genererPaieMois(req.user, req.body.mois, { ecraserExistant: req.body.ecraserExistant })))
);

/** POST /api/paie/generer-adherents — { mois, salaireCotisableDefaut? } : déclarations des adhérents immatriculés CNPS */
router.post(
  '/generer-adherents',
  validate({ body: z.object({ mois: yearMonth, salaireCotisableDefaut: money.default(60000) }) }),
  async (req, res) => ok(res, (await svc.genererPaieAdherentsCnps(req.user, req.body.mois, req.body.salaireCotisableDefaut)))
);

/** POST /api/paie/valider — { mois, genererDepenseAutomatique? } : validation officielle + écriture de dépense (idempotent) */
router.post(
  '/valider',
  validate({ body: z.object({ mois: yearMonth, genererDepenseAutomatique: z.boolean().default(true) }) }),
  async (req, res) => ok(res, (await svc.validerPaieMois(req.user, req.body.mois, req.body.genererDepenseAutomatique)))
);

/** POST /api/paie/apercu — calcul sans enregistrement (formulaires) */
router.post(
  '/apercu',
  validate({
    body: z.object({
      employeId: z.string().max(64),
      mois: yearMonth,
      salaireBase: money.optional(),
      sursalaire: money.optional(),
      primeAnciennete: money.optional(),
      primeRendement: money.optional(),
      indemniteTransport: money.optional(),
      indemniteLogement: money.optional(),
      autresPrimes: money.optional(),
      acomptesAvances: money.optional(),
      retenuesDiverses: money.optional(),
    }),
  }),
  async (req, res) => ok(res, (await svc.apercuBulletin(req.body)))
);

export default router;
