import { Router } from 'express';
import { z } from 'zod';
import { repos } from '../db/repository.js';
import { tx } from '../db/database.js';
import { authenticate, authorize, requireConfirmation } from '../middleware/auth.js';
import { validate, idParam, isoDate, pageQuery } from '../middleware/validate.js';
import { ok, created, page } from '../utils/respond.js';
import { newId, nowIso } from '../utils/ids.js';
import { notFound } from '../utils/httpError.js';
import { logOperation } from '../services/journal.js';

/**
 * Fabrique de routes CRUD pour les entités "simples" (agenda, partenaires, dépenses, versements...).
 * Chaque opération est contrôlée (droit), validée (zod : les champs inconnus sont retirés) et journalisée.
 *
 * @param {object} o
 * @param {string} o.collection        clé de repos
 * @param {string} o.prefix            préfixe d'id (ex: 'dep')
 * @param {string} o.entite            libellé d'entité du journal
 * @param {object} o.types             { create, update, delete } valeurs de typeOperation
 * @param {object} o.schemas           { create: ZodObject, update?: ZodObject (défaut: create.partial()) }
 * @param {string} o.readPerm          droit requis en lecture (absent = tout utilisateur authentifié)
 * @param {string} o.writePerm         droit requis en création / modification
 * @param {string} o.deletePerm        droit requis en suppression (défaut writePerm)
 * @param {boolean} o.confirmDelete    exige le code de confirmation pour supprimer
 * @param {string[]} o.filters         champs filtrables en égalité via la query string
 * @param {string[]} o.search          champs de la recherche plein texte (?q=)
 * @param {string} o.dateField         champ date pour ?du=&au= et le tri
 * @param {Function} o.describe        (doc, op) => texte du journal
 * @param {Function} o.prepare         (user, data, req) => données complétées avant insertion (async possible)
 * @param {Function} o.scope           (req) => where supplémentaire (visibilité)
 * @param {Function} o.canAccess       (req, doc) => boolean (visibilité d'un document)
 * @param {Function} o.beforeDelete    (doc, req) => void (lève HttpError pour bloquer)
 * @param {Function} o.afterDelete     (doc, req) => void
 * @param {Function} o.decorate         (docs, req) => docs enrichis de champs calculés par le serveur (liste et détail)
 * @param {Function} o.afterUpdate     (updated, previous, req) => document corrigé éventuel (lève HttpError pour annuler)
 */
export function crudRouter(o) {
  const repo = repos[o.collection];
  const router = Router();
  router.use(authenticate);

  const updateSchema = o.schemas.update || o.schemas.create.partial();
  const sortField = o.dateField || 'createdAt';
  const accessible = (req, doc) => !o.canAccess || o.canAccess(req, doc);
  const readGuard = o.readPerm ? [authorize(o.readPerm)] : [];

  /**
   * Opérations réutilisables hors HTTP (import Excel...) : mêmes règles, mêmes contrôles métier, même journal.
   * `req` = { user, permissions, body } (le strict nécessaire pour les hooks prepare / afterUpdate).
   */
  const createDoc = (user, body, req = { user, permissions: {}, body }, options = {}) =>
    tx(async () => {
      const now = nowIso();
      const data = o.prepare ? await o.prepare(user, body, req) : body;
      const id = options.id || newId(o.prefix);
      await repo.insert({ ...data, id, createdAt: now, updatedAt: now });
      const saved = await repo.get(id);
      await logOperation(user, { typeOperation: o.types.create, entite: o.entite, description: o.describe(saved, 'create') });
      return saved;
    });

  const updateDoc = (user, id, body, req = { user, permissions: {}, body }) =>
    tx(async () => {
      const cur = await repo.get(id);
      if (!cur || !(!o.canAccess || o.canAccess(req, cur))) throw notFound();
      let upd = await repo.patch(cur.id, { ...body, updatedAt: nowIso() });
      if (o.afterUpdate) upd = (await o.afterUpdate(upd, cur, req)) || upd;
      await logOperation(user, {
        typeOperation: o.types.update,
        entite: o.entite,
        description: o.describe(upd, 'update'),
        nouvellesInformations: body,
      });
      return upd;
    });

  const query = pageQuery.extend({
    du: isoDate.optional(),
    au: isoDate.optional(),
    ...Object.fromEntries((o.filters || []).map((f) => [f, z.string().max(200).optional()])),
  });

  router.get('/', ...readGuard, validate({ query }), async (req, res) => {
    const { q, du, au, page: p, pageSize } = req.validatedQuery;
    const where = { ...(o.scope ? o.scope(req) : {}) };
    for (const f of o.filters || []) if (req.validatedQuery[f] !== undefined) where[f] = req.validatedQuery[f];
    if (o.dateField && (du || au)) where[o.dateField] = { gte: du, lte: au };
    const result = await repo.paginate({
      where,
      like: q && o.search ? { term: q, keys: o.search } : undefined,
      orderBy: [[sortField, 'desc']],
      page: p,
      pageSize,
    });
    if (o.decorate) result.items = await o.decorate(result.items, req);
    page(res, result);
  });

  router.get('/:id', ...readGuard, validate({ params: idParam }), async (req, res) => {
    const doc = await repo.get(req.params.id);
    if (!doc || !accessible(req, doc)) throw notFound();
    ok(res, o.decorate ? (await o.decorate([doc], req))[0] : doc);
  });

  router.post('/', authorize(o.writePerm), validate({ body: o.schemas.create }), async (req, res) => {
    created(res, await createDoc(req.user, req.body, req));
  });

  router.put('/:id', authorize(o.writePerm), validate({ params: idParam, body: updateSchema }), async (req, res) => {
    ok(res, await updateDoc(req.user, req.params.id, req.body, req));
  });

  const guards = [authorize(o.deletePerm || o.writePerm), validate({ params: idParam })];
  if (o.confirmDelete) guards.push(requireConfirmation);
  router.delete('/:id', ...guards, async (req, res) => {
    const doc = await tx(async () => {
      const cur = await repo.get(req.params.id);
      if (!cur || !accessible(req, cur)) throw notFound();
      if (o.beforeDelete) await o.beforeDelete(cur, req);
      await repo.delete(cur.id);
      if (o.afterDelete) await o.afterDelete(cur, req);
      await logOperation(req.user, { typeOperation: o.types.delete, entite: o.entite, description: o.describe(cur, 'delete') });
      return cur;
    });
    ok(res, doc);
  });

  // Exposés pour l'import Excel (services/excel.js)
  router.service = { createDoc, updateDoc, createSchema: o.schemas.create, updateSchema };
  return router;
}
