import { Router } from 'express';
import express from 'express';
import { z } from 'zod';
import { authenticate, requireConfirmation } from '../middleware/auth.js';
import { validate, isoDate } from '../middleware/validate.js';
import { ok } from '../utils/respond.js';
import { badRequest, forbidden } from '../utils/httpError.js';
import { today } from '../utils/ids.js';
import { SHEETS, catalogue, exportWorkbook, importWorkbook } from '../services/excel.js';

const router = Router();
router.use(authenticate);

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ENTITES = SHEETS.map((s) => s.id);
const entitesQuery = z
  .string()
  .max(300)
  .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
  .pipe(z.array(z.enum(ENTITES)).max(ENTITES.length));

const sendXlsx = (res, buffer, nom) => {
  res.setHeader('Content-Type', XLSX_TYPE);
  res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('X-Filename', nom);
  res.end(buffer);
};

/** GET /api/excel/catalogue — feuilles et colonnes du format d'échange, avec les droits du profil connecté */
router.get('/catalogue', (req, res) => ok(res, catalogue(req.user)));

/** GET /api/excel/modele?entites=adherents,cotisations — classeur vierge (en-têtes + instructions) */
router.get('/modele', validate({ query: z.object({ entites: entitesQuery.optional() }) }), async (req, res) => {
  const { buffer } = await exportWorkbook(req.user, { entites: req.validatedQuery.entites, modele: true });
  sendXlsx(res, buffer, `COSITI_Modele_Import_${today()}.xlsx`);
});

/** GET /api/excel/export?entites=&du=&au= — export au format d'échange (réimportable tel quel) */
router.get(
  '/export',
  validate({ query: z.object({ entites: entitesQuery.optional(), du: isoDate.optional(), au: isoDate.optional() }) }),
  async (req, res) => {
    const { buffer } = await exportWorkbook(req.user, req.validatedQuery);
    sendXlsx(res, buffer, `COSITI_Echange_${today()}.xlsx`);
  }
);

/** POST /api/excel/export — { entites, ids: { adherents: [...] }, du, au } : même export, limité à une sélection (liste filtrée de l'écran) */
router.post(
  '/export',
  validate({
    body: z.object({
      entites: z.array(z.enum(ENTITES)).max(ENTITES.length).optional(),
      ids: z.record(z.string(), z.array(z.string().max(64)).max(20000)).optional(),
      du: isoDate.optional(),
      au: isoDate.optional(),
    }),
  }),
  async (req, res) => {
    const { buffer } = await exportWorkbook(req.user, req.body);
    sendXlsx(res, buffer, `COSITI_Echange_${today()}.xlsx`);
  }
);

/** Un import réel exige le code de confirmation ; la simulation, qui n'écrit rien, non. */
const confirmerSiImport = (req, res, next) => (req.query.mode === 'import' ? requireConfirmation(req, res, next) : next());

/**
 * POST /api/excel/import?mode=simulation|import&ignorerErreurs=true&entites=
 * Corps : le fichier .xlsx brut (Content-Type: application/octet-stream).
 */
const peutImporter = (req, _res, next) =>
  req.permissions.canRecord || req.permissions.canManageFinances || req.permissions.canConfigure
    ? next()
    : next(forbidden(`Votre profil (${req.user.role}) ne permet pas d'importer des données.`));

router.post(
  '/import',
  peutImporter,
  express.raw({ type: () => true, limit: '12mb' }),
  validate({
    query: z.object({
      mode: z.enum(['simulation', 'import']).default('simulation'),
      ignorerErreurs: z.enum(['true', 'false']).default('false'),
      entites: entitesQuery.optional(),
    }),
  }),
  confirmerSiImport,
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) throw badRequest('Aucun fichier reçu : envoyez le contenu du fichier .xlsx dans le corps de la requête.');
    const { mode, ignorerErreurs, entites } = req.validatedQuery;
    const rapport = await importWorkbook(req.user, req.body, { mode, ignorerErreurs: ignorerErreurs === 'true', entites });
    // import refusé (tout ou rien) : rien n'a été écrit, le rapport explique pourquoi
    if (mode === 'import' && !rapport.applique) return res.status(422).json({ success: false, error: 'Import refusé : aucune donnée n\'a été modifiée.', data: rapport });
    ok(res, rapport);
  }
);

export default router;
