import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, isoDate } from '../middleware/validate.js';
import { ok } from '../utils/respond.js';
import { syntheseFinanciere, controleIntegrite } from '../services/finances.js';

const router = Router();
router.use(authenticate, authorize('canManageFinances'));

/**
 * GET /api/finances/synthese?du=&au=&detail=reserves
 * Totaux, ventilations, réserve CNPS et solde réel en banque — calculés par le serveur à partir de MySQL.
 */
router.get(
  '/synthese',
  validate({ query: z.object({ du: isoDate.optional(), au: isoDate.optional(), detail: z.enum(['reserves']).optional() }) }),
  async (req, res) => ok(res, await syntheseFinanciere(req.validatedQuery))
);

/** GET /api/finances/controle — contrôle d'intégrité des données financières (lecture seule) */
router.get('/controle', async (_req, res) => ok(res, await controleIntegrite()));

export default router;
