import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { repos } from '../db/repository.js';
import { forbidden, HttpError } from '../utils/httpError.js';

export const hashSecret = (plain) => bcrypt.hash(String(plain), config.bcryptRounds);
export const verifySecret = (plain, hash) => (hash ? bcrypt.compare(String(plain), hash) : Promise.resolve(false));

// Hash factice pour égaliser le temps de réponse quand l'e-mail est inconnu (anti-énumération par timing)
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', config.bcryptRounds);
export const dummyCompare = (plain) => bcrypt.compare(String(plain), DUMMY_HASH);

/**
 * Limiteur de tentatives en mémoire pour les codes courts (code de confirmation, code de maintenance).
 * Clé = utilisateur qui tente. N échecs => blocage temporaire de CET utilisateur (pas de la cible).
 */
const attempts = new Map();
export function guardAttempts(key, { max = config.maxLoginAttempts, lockMs = config.lockMinutes * 60_000 } = {}) {
  const rec = attempts.get(key);
  if (rec?.until && rec.until > Date.now()) {
    const min = Math.ceil((rec.until - Date.now()) / 60_000);
    throw new HttpError(429, `Trop de tentatives de code. Réessayez dans ${min} min.`);
  }
  return {
    fail() {
      const cur = attempts.get(key);
      const r = cur && !(cur.until && cur.until <= Date.now()) ? cur : { count: 0 };
      r.count += 1;
      if (r.count >= max) {
        r.until = Date.now() + lockMs;
        r.count = 0;
      }
      attempts.set(key, r);
    },
    ok() {
      attempts.delete(key);
    },
  };
}

export const getParametres = () => repos.parametres.get('main');

/** Vérifie le code de confirmation (0000 par défaut) stocké haché dans les paramètres. */
export async function checkConfirmationCode(user, code) {
  const guard = guardAttempts(`confirm:${user.id}`);
  const p = await getParametres();
  const ok = !!code && (await verifySecret(String(code).trim(), p?.codeConfirmationHash));
  if (!ok) {
    guard.fail();
    // tentative tracée (import dynamique : journal.js dépend de ce module)
    const { logOperation } = await import('./journal.js');
    await logOperation(user, { typeOperation: 'ECHEC_CODE_CONFIRMATION', entite: 'Sécurité', description: `Code de confirmation incorrect saisi par ${user.nom}` });
    throw forbidden('Code de confirmation incorrect.');
  }
  guard.ok();
}

export async function checkMaintenanceCode(user, code) {
  const guard = guardAttempts(`maint:${user.id}`);
  if (!code || String(code).trim() !== config.maintenanceCode) {
    guard.fail();
    throw forbidden('Code de maintenance incorrect.');
  }
  guard.ok();
}
