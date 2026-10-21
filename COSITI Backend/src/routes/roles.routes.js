import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../utils/respond.js';
import { notFound } from '../utils/httpError.js';
import { ROLES } from '../utils/permissions.js';
import { allRoleSheets, roleSheet, modulesFor } from '../utils/roles.js';

const router = Router();
router.use(authenticate);

/** GET /api/roles — fiches de tous les profils : description, droits, modules et actions autorisés */
router.get('/', (_req, res) => ok(res, allRoleSheets()));

/** GET /api/roles/me — modules et actions autorisés pour l'utilisateur connecté (construit le menu du front) */
router.get('/me', (req, res) => ok(res, { role: req.user.role, permissions: req.permissions, modules: modulesFor(req.user) }));

/** GET /api/roles/{role} — fiche d'un profil (ex. « DAF », « Caissière & Agent d'enregistrement ») */
router.get('/:role', validate({ params: z.object({ role: z.enum(ROLES) }) }), (req, res) => {
  if (!ROLES.includes(req.params.role)) throw notFound('Rôle inconnu.');
  ok(res, roleSheet(req.params.role));
});

export default router;
