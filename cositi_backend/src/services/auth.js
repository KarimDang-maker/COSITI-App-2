import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { query } from '../db/database.js';
import { repos } from '../db/repository.js';
import { newId, nowIso, toSql } from '../utils/ids.js';
import { HttpError, unauthorized, forbidden } from '../utils/httpError.js';
import { getUserPermissions } from '../utils/permissions.js';
import { modulesFor } from '../utils/roles.js';
import { hashSecret, verifySecret, dummyCompare } from './security.js';
import { logOperation } from './journal.js';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

/** Retire tous les champs secrets avant de renvoyer un utilisateur au client. */
export function publicUser(u) {
  if (!u) return u;
  const { passwordHash, failedAttempts, lockedUntil, tokenVersion, ...safe } = u;
  return safe;
}

export function sessionPayload(user) {
  // `modules` : ce que l'utilisateur peut faire dans chaque module (sert à construire le menu et les boutons du front)
  return { user: publicUser(user), permissions: getUserPermissions(user), modules: modulesFor(user) };
}

function signAccess(user) {
  return jwt.sign({ role: user.role, v: user.tokenVersion || 0 }, config.jwt.accessSecret, {
    subject: user.id,
    expiresIn: config.jwt.accessTtl,
    issuer: 'cositi-api',
    audience: 'cositi-app',
  });
}

export function verifyAccess(token) {
  return jwt.verify(token, config.jwt.accessSecret, { issuer: 'cositi-api', audience: 'cositi-app' });
}

async function createRefresh(user, meta, family = newId('fam')) {
  const raw = randomBytes(48).toString('base64url');
  const id = newId('rt');
  await query(
    'INSERT INTO refresh_tokens (id, user_id, family, token_hash, expires_at, user_agent, ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, user.id, family, sha256(raw), toSql(Date.now() + config.jwt.refreshTtlDays * 86_400_000), (meta?.userAgent || '').slice(0, 255), (meta?.ip || '').slice(0, 64)]
  );
  return { raw, id };
}

async function issueTokens(user, meta, family) {
  const refresh = await createRefresh(user, meta, family);
  return { accessToken: signAccess(user), refreshToken: refresh.raw, tokenType: 'Bearer', expiresIn: config.jwt.accessTtl };
}

const revokeFamily = (family) => query('UPDATE refresh_tokens SET revoked_at = ? WHERE family = ? AND revoked_at IS NULL', [toSql(), family]);
export const revokeAllForUser = (userId) => query('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', [toSql(), userId]);

/** Invalide immédiatement les access tokens + refresh tokens d'un utilisateur. */
export async function invalidateSessions(userId) {
  const u = await repos.utilisateurs.get(userId);
  if (u) await repos.utilisateurs.patch(userId, { tokenVersion: (u.tokenVersion || 0) + 1 });
  await revokeAllForUser(userId);
}

const BAD_CREDENTIALS = 'E-mail ou mot de passe incorrect.';

/** Les e-mails sont toujours comparés en minuscules (colonne en collation insensible à la casse). */
export async function findByEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return e ? repos.utilisateurs.findOne({ where: { email: e } }) : null;
}

export async function login(email, password, meta) {
  const user = await findByEmail(email);

  if (!user) {
    await dummyCompare(password);
    await logOperation(null, { typeOperation: 'ECHEC_CONNEXION', entite: 'Authentification', description: `Échec de connexion (compte inconnu) : ${email}`, details: { ip: meta?.ip } });
    throw unauthorized(BAD_CREDENTIALS);
  }

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const min = Math.ceil((new Date(user.lockedUntil) - Date.now()) / 60_000);
    throw new HttpError(423, `Compte temporairement verrouillé suite à des échecs répétés. Réessayez dans ${min} min.`);
  }

  const ok = await verifySecret(password, user.passwordHash);
  if (!ok) {
    const failed = (user.failedAttempts || 0) + 1;
    const lock = failed >= config.maxLoginAttempts;
    await repos.utilisateurs.patch(user.id, {
      failedAttempts: lock ? 0 : failed,
      lockedUntil: lock ? new Date(Date.now() + config.lockMinutes * 60_000).toISOString() : null,
    });
    await logOperation(user, { typeOperation: 'ECHEC_CONNEXION', entite: 'Authentification', description: `Échec de connexion pour ${user.email}${lock ? ' — compte verrouillé' : ''}`, details: { ip: meta?.ip } });
    throw unauthorized(BAD_CREDENTIALS);
  }

  if (!user.actif) throw forbidden("Ce compte est désactivé. Contactez l'administration.");

  const updated = await repos.utilisateurs.patch(user.id, { failedAttempts: 0, lockedUntil: null, dernierAcces: nowIso() });
  await logOperation(updated, { typeOperation: 'CONNEXION', entite: 'Authentification', description: `Connexion de ${updated.nom} (${updated.role})`, details: { ip: meta?.ip } });

  return { ...(await issueTokens(updated, meta)), ...sessionPayload(updated), mustChangePassword: !!updated.mustChangePassword };
}

export async function refresh(rawToken, meta) {
  if (!rawToken) throw unauthorized('Refresh token manquant.');
  const [row] = await query('SELECT * FROM refresh_tokens WHERE token_hash = ?', [sha256(rawToken)]);
  if (!row) throw unauthorized('Session invalide. Veuillez vous reconnecter.');

  if (row.revoked_at) {
    // Réutilisation d'un refresh token déjà consommé : vol probable => on coupe toute la famille
    await revokeFamily(row.family);
    throw unauthorized('Session révoquée. Veuillez vous reconnecter.');
  }
  if (new Date(`${String(row.expires_at).replace(' ', 'T')}Z`) < new Date()) throw unauthorized('Session expirée. Veuillez vous reconnecter.');

  const user = await repos.utilisateurs.get(row.user_id);
  if (!user || !user.actif) {
    await revokeFamily(row.family);
    throw unauthorized('Compte indisponible.');
  }

  // Révocation atomique : si deux requêtes rejouent le même jeton en parallèle, une seule gagne
  const next = await createRefresh(user, meta, row.family);
  const res = await query('UPDATE refresh_tokens SET revoked_at = ?, replaced_by = ? WHERE id = ? AND revoked_at IS NULL', [toSql(), next.id, row.id]);
  if (!res.affectedRows) {
    await revokeFamily(row.family);
    throw unauthorized('Session révoquée. Veuillez vous reconnecter.');
  }
  return { accessToken: signAccess(user), refreshToken: next.raw, tokenType: 'Bearer', expiresIn: config.jwt.accessTtl, ...sessionPayload(user) };
}

export async function logout(rawToken, user) {
  if (rawToken) {
    const [row] = await query('SELECT family FROM refresh_tokens WHERE token_hash = ?', [sha256(rawToken)]);
    if (row) await revokeFamily(row.family);
  }
  if (user) await logOperation(user, { typeOperation: 'DECONNEXION', entite: 'Authentification', description: `Déconnexion de ${user.nom}` });
}

export async function changePassword(user, currentPassword, newPassword, meta) {
  const full = await repos.utilisateurs.get(user.id);
  if (!(await verifySecret(currentPassword, full.passwordHash))) throw forbidden('Mot de passe actuel incorrect.');
  if (currentPassword === newPassword) throw new HttpError(400, "Le nouveau mot de passe doit être différent de l'ancien.");
  const updated = await repos.utilisateurs.patch(user.id, {
    passwordHash: await hashSecret(newPassword),
    mustChangePassword: false,
    tokenVersion: (full.tokenVersion || 0) + 1,
  });
  await revokeAllForUser(user.id);
  await logOperation(updated, { typeOperation: 'CHANGEMENT_MOT_DE_PASSE', entite: 'Authentification', description: `Mot de passe modifié par ${updated.nom}` });
  // Nouvelle session pour l'appareil courant
  return { ...(await issueTokens(updated, meta)), ...sessionPayload(updated) };
}
