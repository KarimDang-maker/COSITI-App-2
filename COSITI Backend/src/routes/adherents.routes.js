import { Router } from 'express';
import { z } from 'zod';
import { repos } from '../db/repository.js';
import { authenticate, authorize, requireConfirmation } from '../middleware/auth.js';
import { validate, idParam, isoDate, opt, pageQuery } from '../middleware/validate.js';
import { ok, created, page } from '../utils/respond.js';
import { calculateAdherentStats } from '../utils/business.js';
import * as svc from '../services/adherents.js';

const router = Router();
router.use(authenticate);

const STATUTS = ['Actif', 'En cours de régularisation', 'En attente', 'Inactif', 'Suspendu', 'Radié'];
const STATUTS_IMMAT = ['Non immatriculé', 'Éligible (seuil atteint)', "En cours d'immatriculation", 'Immatriculé'];

const fields = {
  nom: z.string().trim().min(1).max(100).transform((s) => s.toLocaleUpperCase('fr-FR')),
  prenom: z.string().trim().min(1).max(100),
  sexe: z.enum(['M', 'F']),
  dateNaissance: opt(isoDate),
  lieuNaissance: opt(z.string().trim().max(150)),
  cni: opt(z.string().trim().max(100)),
  telephone: z.string().trim().min(6).max(50),
  adresse: opt(z.string().trim().max(500)),
  profession: z.string().trim().min(2).max(150),
  dateAdhesion: isoDate,
  statut: z.enum(STATUTS),
  statutImmatriculation: z.enum(STATUTS_IMMAT),
  dateImmatriculation: opt(isoDate),
  numeroCnps: opt(z.string().trim().max(50)),
  observations: opt(z.string().trim().max(2000)),
  tarifJournalier: z.coerce.number().positive().max(1_000_000),
  gestionnaireId: opt(z.string().max(64)),
  nombreEnfants: z.coerce.number().int().min(0).max(50).optional(),
  sansEnfant: z.boolean().optional(),
  salaireCotisableCnps: z.coerce.number().min(0).max(100_000_000).optional(),
};
// Création : les défauts ne sont appliqués QU'ici. Mise à jour : schéma partiel sans défauts,
// sinon une modification écraserait silencieusement statut, tarif, etc.
export const createSchema = z.object({
  ...fields,
  sexe: fields.sexe.default('M'),
  dateAdhesion: fields.dateAdhesion.default(() => new Date().toISOString().slice(0, 10)),
  statut: fields.statut.default('Actif'),
  statutImmatriculation: fields.statutImmatriculation.default('Non immatriculé'),
  tarifJournalier: fields.tarifJournalier.default(700),
});
export const updateSchema = z.object(fields).partial();

const listQuery = pageQuery.extend({
  statut: z.enum(STATUTS).optional(),
  statutImmatriculation: z.enum(STATUTS_IMMAT).optional(),
  statutCotisation: z.enum(['À jour', 'En retard', 'Sans cotisation']).optional(),
  gestionnaireId: z.string().max(64).optional(),
  sansGestionnaire: z.enum(['true', 'false']).optional(),
  stats: z.enum(['true', 'false']).optional(),
});

/** GET /api/adherents?q=&statut=&statutImmatriculation=&statutCotisation=&gestionnaireId=&stats=true&page=&pageSize= */
router.get('/', validate({ query: listQuery }), async (req, res) => {
  const { q, statut, statutImmatriculation, statutCotisation, gestionnaireId, sansGestionnaire, stats, page: p, pageSize } = req.validatedQuery;
  const opts = {
    where: { statut, statutImmatriculation, gestionnaireId, ...(sansGestionnaire === 'true' ? { gestionnaireId: { null: true } } : {}) },
    like: q ? { term: q, keys: ['nom', 'prenom', 'matricule', 'telephone', 'cni', 'profession', 'numeroCnps'] } : undefined,
    orderBy: [['matricule', 'desc']],
  };
  const params = await repos.parametres.get('main');

  // Cotisations chargées en une requête et indexées (évite une requête par adhérent)
  const withStats = async (list) => {
    const cots = list.length ? await repos.cotisations.all() : [];
    return list.map((a) => ({ ...a, stats: calculateAdherentStats(a, cots.filter((c) => c.adherentId === a.id || c.matricule === a.matricule), params) }));
  };

  if (statutCotisation) {
    // Le statut de cotisation est calculé : on filtre en mémoire puis on pagine
    const all = (await withStats(await repos.adherents.all(opts))).filter((a) => a.stats.statutCotisation === statutCotisation);
    const start = (p - 1) * pageSize;
    return page(res, { items: all.slice(start, start + pageSize), total: all.length, page: p, pageSize });
  }
  const result = await repos.adherents.paginate({ ...opts, page: p, pageSize });
  if (stats === 'true') result.items = await withStats(result.items);
  page(res, result);
});

router.get('/:id', validate({ params: idParam }), async (req, res) => {
  const adh = await svc.getAdherentOrFail(req.params.id);
  const [cotisations, dossiers, params] = await Promise.all([svc.cotisationsOf(adh), svc.dossiersOf(adh), repos.parametres.get('main')]);
  ok(res, { ...adh, stats: calculateAdherentStats(adh, cotisations, params), cotisations, dossiers });
});

router.get('/:id/stats', validate({ params: idParam }), async (req, res) => {
  const adh = await svc.getAdherentOrFail(req.params.id);
  ok(res, calculateAdherentStats(adh, await svc.cotisationsOf(adh), await repos.parametres.get('main')));
});

/** POST /api/adherents — nouvel adhérent (matricule COSITI-xxxx généré par le serveur) */
router.post('/', authorize('canRecord'), validate({ body: createSchema }), async (req, res) => {
  created(res, await svc.createAdherent(req.user, req.body));
});

/** PUT /api/adherents/:id — modification (droit d'édition + code de confirmation) */
router.put(
  '/:id',
  authorize('canEditRecords'),
  validate({ params: idParam, body: updateSchema.extend({ pinCode: z.string().optional() }) }),
  requireConfirmation,
  async (req, res) => ok(res, await svc.updateAdherent(req.user, req.params.id, req.body))
);

/** PATCH /api/adherents/:id/statut — { statut, motif? } (DAF, DGA, DG, Administrateur) */
router.patch(
  '/:id/statut',
  authorize('canChangeAdherentStatut'),
  validate({ params: idParam, body: z.object({ statut: z.enum(STATUTS), motif: opt(z.string().trim().max(500)) }) }),
  async (req, res) => ok(res, await svc.updateStatut(req.user, req.params.id, req.body.statut, req.body.motif))
);

/** DELETE /api/adherents/:id — (droit de suppression + code de confirmation) */
router.delete('/:id', authorize('canDeleteRecords'), validate({ params: idParam }), requireConfirmation, async (req, res) =>
  ok(res, await svc.deleteAdherent(req.user, req.params.id))
);

/** POST /api/adherents/:id/immatriculer — { numeroCnps, dateImmatriculation, observations? } */
router.post(
  '/:id/immatriculer',
  authorize('canImmatriculer'),
  validate({
    params: idParam,
    body: z.object({
      numeroCnps: z.string().trim().min(3).max(50),
      dateImmatriculation: isoDate.default(() => new Date().toISOString().slice(0, 10)),
      observations: opt(z.string().trim().max(2000)),
    }),
  }),
  async (req, res) => ok(res, await svc.immatriculer(req.user, req.params.id, req.body))
);

/** POST /api/adherents/:id/sans-enfant — { motif? } : lève l'alerte de dossier d'allocations */
router.post(
  '/:id/sans-enfant',
  authorize('canManageDossiers'),
  validate({ params: idParam, body: z.object({ motif: opt(z.string().trim().max(500)) }) }),
  async (req, res) => ok(res, await svc.marquerSansEnfant(req.user, req.params.id, req.body.motif))
);

/** PUT /api/adherents/:id/portefeuille — { gestionnaireId | null } */
router.put(
  '/:id/portefeuille',
  authorize('canEditRecords'),
  validate({ params: idParam, body: z.object({ gestionnaireId: z.string().max(64).nullable() }) }),
  async (req, res) => ok(res, await svc.assignerPortefeuille(req.user, req.params.id, req.body.gestionnaireId))
);

/** PUT /api/adherents/:id/salaire-cotisable — { montant } (assiette CNPS, espace DAF) */
router.put(
  '/:id/salaire-cotisable',
  authorize('canManageFinances'),
  validate({ params: idParam, body: z.object({ montant: z.coerce.number().min(0).max(100_000_000) }) }),
  async (req, res) => ok(res, await svc.updateSalaireCotisable(req.user, req.params.id, req.body.montant))
);

export default router;
