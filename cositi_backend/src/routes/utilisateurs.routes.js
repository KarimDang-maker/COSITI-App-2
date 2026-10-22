import { Router } from 'express';
import { z } from 'zod';
import { repos } from '../db/repository.js';
import { tx } from '../db/database.js';
import { authenticate, authorize, requireConfirmation } from '../middleware/auth.js';
import { validate, idParam, isoDate, passwordRule, pageQuery } from '../middleware/validate.js';
import { badRequest, forbidden, notFound, conflict } from '../utils/httpError.js';
import { ok, created, page } from '../utils/respond.js';
import { newId, nowIso } from '../utils/ids.js';
import { ROLES, TYPES_ACCES, SUPER_ADMIN, getTypeAcces } from '../utils/permissions.js';
import { modulesFor } from '../utils/roles.js';
import { hashSecret } from '../services/security.js';
import { publicUser, invalidateSessions, findByEmail } from '../services/auth.js';
import { logOperation } from '../services/journal.js';
import { activiteUtilisateur, statistiquesUtilisateur } from '../services/audit.js';

/**
 * Comptes des acteurs de la plateforme.
 *  - création, modification, suppression de comptes et identifiants de connexion : SUPER ADMINISTRATEUR uniquement
 *  - profil + activité (audit) : Super Administrateur, Direction, PCA, Conseil de Surveillance ; chacun voit le sien
 *  - un acteur peut modifier son nom / téléphone et changer son propre mot de passe (POST /auth/change-password)
 */
const router = Router();
router.use(authenticate);

const profileFields = {
  nom: z.string().trim().min(2).max(150),
  role: z.enum(ROLES),
  typeAcces: z.enum(TYPES_ACCES).optional(),
  titreComplet: z.string().trim().max(200).optional(),
  poste: z.string().trim().max(150).optional(),
  descriptionAcces: z.string().trim().max(500).optional(),
  telephone: z.string().trim().max(50).optional(),
  actif: z.boolean(),
};
const email = z.string().trim().toLowerCase().email().max(150);

const createSchema = z.object({
  ...profileFields,
  actif: z.boolean().default(true),
  email,
  password: passwordRule,
  mustChangePassword: z.boolean().default(true),
});
// Mise à jour partielle (sans valeurs par défaut implicites)
const updateSchema = z.object({ ...profileFields, email }).partial();
const credentialsSchema = z
  .object({
    email: email.optional(),
    password: passwordRule.optional(),
    mustChangePassword: z.boolean().optional(),
    deverrouiller: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: 'Aucune information de connexion à modifier.' });

const activeSuperAdmins = async () => (await repos.utilisateurs.all({ where: { role: SUPER_ADMIN, actif: true } })).length;
const canSee = (req, id) => req.permissions.canAuditUsers || req.user.id === id;
const withDefaults = (fields) => ({ ...fields, typeAcces: fields.role === SUPER_ADMIN ? 'Super administration' : fields.typeAcces || getTypeAcces({ role: fields.role }) });

async function loadUser(id) {
  const u = await repos.utilisateurs.get(id);
  if (!u) throw notFound('Utilisateur introuvable.');
  return u;
}

/** GET /api/utilisateurs — liste complète (profils d'audit) ou minimale (autres profils) */
router.get('/', async (req, res) => {
  const list = await repos.utilisateurs.all({ orderBy: [['nom', 'asc']] });
  if (req.permissions.canAuditUsers) return ok(res, list.map(publicUser));
  ok(res, list.filter((u) => u.actif).map((u) => ({ id: u.id, nom: u.nom, role: u.role, poste: u.poste, titreComplet: u.titreComplet })));
});

router.get('/:id', validate({ params: idParam }), async (req, res) => {
  if (!canSee(req, req.params.id)) throw forbidden();
  const u = await loadUser(req.params.id);
  ok(res, { ...publicUser(u), modules: modulesFor(u) });
});

/** POST /api/utilisateurs — création d'un compte, quel que soit le rôle (Super Administrateur) */
router.post('/', authorize('canManageUsers'), validate({ body: createSchema }), async (req, res) => {
  const { password, ...fields } = req.body;
  if (await findByEmail(fields.email)) throw conflict('Un compte existe déjà avec cet e-mail.');
  const now = nowIso();
  const user = {
    ...withDefaults(fields),
    id: newId('u'),
    passwordHash: await hashSecret(password),
    failedAttempts: 0,
    lockedUntil: null,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
  await tx(async () => {
    await repos.utilisateurs.insert(user);
    await logOperation(req.user, {
      typeOperation: 'CREATION_UTILISATEUR',
      entite: 'Utilisateurs',
      description: `Création du compte ${user.nom} (${user.role}) — ${user.email}`,
      nouvellesInformations: { nom: user.nom, email: user.email, role: user.role, typeAcces: user.typeAcces, poste: user.poste },
    });
  });
  created(res, publicUser(await repos.utilisateurs.get(user.id)));
});

/** PUT /api/utilisateurs/bulk — paramétrage groupé (Super Administrateur) : met à jour ou crée, ne supprime jamais */
router.put(
  '/bulk',
  authorize('canManageUsers'),
  validate({
    body: z.object({
      utilisateurs: z
        .array(z.object({ id: z.string().optional(), ...profileFields, actif: z.boolean().default(true), email, password: passwordRule.optional() }))
        .min(1)
        .max(100),
    }),
  }),
  async (req, res) => {
    const prepared = [];
    for (const input of req.body.utilisateurs) {
      const { id, password, ...fields } = input;
      const existing = id ? await repos.utilisateurs.get(id) : null;
      if (!existing && !password) throw badRequest(`Un mot de passe est requis pour créer le compte ${fields.email}.`);
      prepared.push({ existing, fields: withDefaults(fields), passwordHash: password ? await hashSecret(password) : undefined });
    }
    const result = await tx(async () => {
      const out = [];
      for (const { existing, fields, passwordHash } of prepared) {
        if (existing) {
          const changed = ['role', 'typeAcces', 'actif', 'email'].some((k) => existing[k] !== fields[k]);
          const u = await repos.utilisateurs.patch(existing.id, { ...fields, passwordHash, updatedAt: nowIso() });
          if (changed || passwordHash) await invalidateSessions(u.id);
          out.push(u);
        } else {
          const now = nowIso();
          const id = newId('u');
          await repos.utilisateurs.insert({ ...fields, id, passwordHash, mustChangePassword: true, failedAttempts: 0, lockedUntil: null, tokenVersion: 0, createdAt: now, updatedAt: now });
          out.push(await repos.utilisateurs.get(id));
        }
      }
      if ((await activeSuperAdmins()) === 0) throw badRequest('Au moins un Super Administrateur actif doit subsister.');
      await logOperation(req.user, {
        typeOperation: 'MODIFICATION_PARAMETRES',
        entite: 'Paramétrage Utilisateurs',
        description: `Nouveau paramétrage des utilisateurs enregistré (${out.length} comptes paramétrés)`,
      });
      return out;
    });
    ok(res, result.map(publicUser));
  }
);

/**
 * PUT /api/utilisateurs/:id — profil (nom, rôle, poste, statut...).
 * Super Administrateur : tout compte. Autres : uniquement leur propre nom / téléphone.
 */
router.put('/:id', validate({ params: idParam, body: updateSchema }), async (req, res) => {
  const updated = await tx(async () => {
    const target = await loadUser(req.params.id);
    const self = target.id === req.user.id;
    let body = Object.fromEntries(Object.entries(req.body).filter(([, v]) => v !== undefined));
    if (!req.permissions.canManageUsers) {
      if (!self) throw forbidden('Seul le Super Administrateur peut modifier le compte d\'un autre acteur.');
      if (body.email !== undefined && body.email !== target.email) throw forbidden('Seul le Super Administrateur peut modifier les informations de connexion.');
      body = Object.fromEntries(Object.entries({ nom: body.nom, telephone: body.telephone }).filter(([, v]) => v !== undefined));
    }
    if (self && body.actif === false) throw badRequest('Vous ne pouvez pas désactiver votre propre compte.');
    if (self && body.role && body.role !== target.role) throw badRequest('Vous ne pouvez pas changer votre propre rôle.');
    if (body.email && body.email !== target.email) {
      const dup = await findByEmail(body.email);
      if (dup && dup.id !== target.id) throw conflict('Un compte existe déjà avec cet e-mail.');
    }
    if (body.role) Object.assign(body, withDefaults({ role: body.role, typeAcces: body.typeAcces }));

    const critical = ['role', 'typeAcces', 'actif', 'email'].some((k) => body[k] !== undefined && body[k] !== target[k]);
    const upd = await repos.utilisateurs.patch(target.id, { ...body, updatedAt: nowIso() });
    if (target.role === SUPER_ADMIN && (upd.role !== SUPER_ADMIN || !upd.actif) && (await activeSuperAdmins()) === 0) {
      throw badRequest('Au moins un Super Administrateur actif doit subsister.');
    }
    if (critical) await invalidateSessions(target.id);
    const avant = Object.fromEntries(Object.keys(body).map((k) => [k, target[k]]));
    await logOperation(req.user, {
      typeOperation: 'MODIFICATION_UTILISATEUR',
      entite: 'Utilisateurs',
      description: `Mise à jour du compte ${upd.nom} (${upd.role})`,
      anciennesInformations: avant,
      nouvellesInformations: body,
    });
    return upd;
  });
  ok(res, publicUser(updated));
});

/**
 * PUT /api/utilisateurs/:id/identifiants — informations de connexion d'un acteur (Super Administrateur UNIQUEMENT) :
 * e-mail de connexion, mot de passe, obligation de changement, déverrouillage. Ferme les sessions du compte.
 */
router.put('/:id/identifiants', authorize('canManageCredentials'), validate({ params: idParam, body: credentialsSchema }), async (req, res) => {
  const target = await loadUser(req.params.id);
  const { email: newEmail, password, mustChangePassword, deverrouiller } = req.body;
  if (newEmail && newEmail !== target.email) {
    const dup = await findByEmail(newEmail);
    if (dup && dup.id !== target.id) throw conflict('Un compte existe déjà avec cet e-mail.');
  }
  const patch = {
    email: newEmail,
    passwordHash: password ? await hashSecret(password) : undefined,
    mustChangePassword,
    ...(deverrouiller || password ? { failedAttempts: 0, lockedUntil: null } : {}),
    updatedAt: nowIso(),
  };
  const changes = [newEmail && newEmail !== target.email && `e-mail ${target.email} ➔ ${newEmail}`, password && 'mot de passe', mustChangePassword !== undefined && `changement obligatoire = ${mustChangePassword ? 'oui' : 'non'}`, deverrouiller && 'déverrouillage'].filter(Boolean);
  const upd = await tx(async () => {
    const u = await repos.utilisateurs.patch(target.id, patch);
    if (newEmail || password) await invalidateSessions(target.id);
    await logOperation(req.user, {
      typeOperation: 'MODIFICATION_IDENTIFIANTS',
      entite: 'Utilisateurs',
      description: `Modification des informations de connexion de ${target.nom} : ${changes.join(', ')}`,
    });
    return u;
  });
  ok(res, publicUser(upd));
});

/** POST /api/utilisateurs/:id/reset-password — { newPassword } (Super Administrateur) */
router.post(
  '/:id/reset-password',
  authorize('canManageCredentials'),
  validate({ params: idParam, body: z.object({ newPassword: passwordRule, mustChangePassword: z.boolean().default(true) }) }),
  async (req, res) => {
    const target = await loadUser(req.params.id);
    const passwordHash = await hashSecret(req.body.newPassword);
    await tx(async () => {
      await repos.utilisateurs.patch(target.id, { passwordHash, mustChangePassword: req.body.mustChangePassword, failedAttempts: 0, lockedUntil: null });
      await invalidateSessions(target.id);
      await logOperation(req.user, {
        typeOperation: 'MODIFICATION_IDENTIFIANTS',
        entite: 'Utilisateurs',
        description: `Réinitialisation du mot de passe de ${target.nom} par ${req.user.nom}`,
      });
    });
    ok(res, { message: 'Mot de passe réinitialisé. Toutes les sessions du compte ont été fermées.' });
  }
);

/** DELETE /api/utilisateurs/:id (Super Administrateur + code de confirmation) */
router.delete('/:id', authorize('canManageUsers'), validate({ params: idParam }), requireConfirmation, async (req, res) => {
  const target = await tx(async () => {
    const t = await loadUser(req.params.id);
    if (t.id === req.user.id) throw badRequest('Vous ne pouvez pas supprimer votre propre compte.');
    if (t.role === SUPER_ADMIN && t.actif && (await activeSuperAdmins()) <= 1) throw badRequest('Au moins un Super Administrateur actif doit subsister.');
    await invalidateSessions(t.id);
    await repos.utilisateurs.delete(t.id);
    await logOperation(req.user, {
      typeOperation: 'SUPPRESSION_UTILISATEUR',
      entite: 'Utilisateurs',
      description: `Suppression du compte ${t.nom} (${t.role}) — ${t.email}`,
    });
    return t;
  });
  ok(res, { id: target.id });
});

/* ------------------------------------------------------------------ AUDIT */
const activiteQuery = pageQuery.extend({ du: isoDate.optional(), au: isoDate.optional(), typeOperation: z.string().max(100).optional() });

/** GET /api/utilisateurs/:id/activite — actions menées par un acteur (paginé) + statistiques */
router.get('/:id/activite', validate({ params: idParam, query: activiteQuery }), async (req, res) => {
  if (!canSee(req, req.params.id)) throw forbidden('Vous ne pouvez consulter que votre propre activité.');
  const target = await loadUser(req.params.id);
  const { du, au, typeOperation, page: p, pageSize } = req.validatedQuery;
  const [result, stats] = await Promise.all([activiteUtilisateur(target, { du, au, typeOperation }, { page: p, pageSize }), statistiquesUtilisateur(target, { du, au })]);
  // consulter l'activité d'un AUTRE acteur est une action d'audit : elle est tracée (1re page seulement)
  if (target.id !== req.user.id && p === 1 && !typeOperation) {
    await logOperation(req.user, { typeOperation: 'CONSULTATION_PROFIL', entite: 'Audit', description: `Consultation du profil et de l'activité de ${target.nom} (${target.role})` });
  }
  page(res, result, { statistiques: stats, utilisateur: publicUser(target) });
});

/**
 * GET /api/utilisateurs/:id/rapport-audit — données complètes du rapport d'audit imprimable d'un acteur.
 * La consultation du rapport est elle-même journalisée.
 */
router.get('/:id/rapport-audit', validate({ params: idParam, query: z.object({ du: isoDate.optional(), au: isoDate.optional() }) }), async (req, res) => {
  if (!canSee(req, req.params.id)) throw forbidden('Vous ne pouvez consulter que votre propre rapport.');
  const target = await loadUser(req.params.id);
  const { du, au } = req.validatedQuery;
  const [actions, stats, params] = await Promise.all([
    activiteUtilisateur(target, { du, au }, { page: 1, pageSize: 500 }),
    statistiquesUtilisateur(target, { du, au }),
    repos.parametres.get('main'),
  ]);
  await logOperation(req.user, {
    typeOperation: 'CONSULTATION_RAPPORT_AUDIT',
    entite: 'Audit',
    description: `Rapport d'audit de ${target.nom} (${target.role}) généré par ${req.user.nom}${du || au ? ` — période ${du || '…'} au ${au || '…'}` : ''}`,
  });
  ok(res, {
    organisation: { nom: params?.nomOrganisation, sigle: params?.sigle, adresse: params?.adresse, telephone: params?.telephone, email: params?.email },
    utilisateur: { ...publicUser(target), modules: modulesFor(target) },
    periode: { du: du || null, au: au || null },
    statistiques: stats,
    actions: actions.items,
    actionsTronquees: actions.total > actions.items.length,
    genereLe: nowIso(),
    generePar: { id: req.user.id, nom: req.user.nom, role: req.user.role },
  });
});

export default router;
