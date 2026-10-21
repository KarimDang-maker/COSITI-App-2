import { repos } from '../db/repository.js';
import { verifyAccess } from '../services/auth.js';
import { checkConfirmationCode, checkMaintenanceCode } from '../services/security.js';
import { getUserPermissions } from '../utils/permissions.js';
import { forbidden, unauthorized, badRequest, HttpError } from '../utils/httpError.js';

// Mot de passe temporaire : seuls ces appels sont permis tant qu'il n'a pas été changé
const PASSWORD_CHANGE_ALLOWED = ['/api/auth/me', '/api/auth/change-password', '/api/auth/logout'];

/**
 * Les middlewares portent des métadonnées (`.meta`) lues par le générateur Swagger (src/docs/openapi.js)
 * pour documenter automatiquement l'authentification, les droits et les codes exigés par chaque route.
 */
const withMeta = (fn, meta) => Object.assign(fn, { meta });

/** Vérifie le JWT, recharge l'utilisateur (rôle/désactivation pris en compte immédiatement). */
export const authenticate = withMeta(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthorized());

  let payload;
  try {
    payload = verifyAccess(token);
  } catch (e) {
    return next(unauthorized(e.name === 'TokenExpiredError' ? 'Session expirée.' : 'Jeton invalide.'));
  }

  const user = await repos.utilisateurs.get(payload.sub);
  if (!user || !user.actif) return next(unauthorized('Compte indisponible.'));
  if ((user.tokenVersion || 0) !== (payload.v || 0)) return next(unauthorized('Session révoquée.'));

  // Mot de passe temporaire : seules la consultation du profil, le changement de mot de passe et la déconnexion sont permis
  if (user.mustChangePassword && !PASSWORD_CHANGE_ALLOWED.includes(req.originalUrl.split('?')[0].replace(/\/+$/, ''))) {
    return next(new HttpError(403, 'Vous devez changer votre mot de passe temporaire avant de continuer.', undefined, 'PASSWORD_CHANGE_REQUIRED'));
  }

  req.user = user;
  req.permissions = getUserPermissions(user);
  next();
}, { auth: true });

/** authorize('canRecord') : exige un droit du profil (voir utils/permissions.js). */
export const authorize = (...flags) =>
  withMeta((req, _res, next) => {
    const missing = flags.find((f) => !req.permissions?.[f]);
    if (missing) return next(forbidden(`Droit requis : ${missing}. Votre profil (${req.user.role}) ne le permet pas.`));
    next();
  }, { flags });

/** Restreint à certains rôles nominatifs. */
export const requireRole = (...roles) =>
  withMeta((req, _res, next) => (roles.includes(req.user?.role) ? next() : next(forbidden(`Réservé aux rôles : ${roles.join(', ')}.`))), { roles });

/**
 * Code de confirmation (0000 par défaut) exigé pour modifier/supprimer des données sensibles.
 * Lu dans l'en-tête X-Confirmation-Code ou dans body.pinCode (retiré du body pour ne pas être persisté).
 */
export const requireConfirmation = withMeta(async (req, _res, next) => {
  try {
    const code = req.headers['x-confirmation-code'] ?? req.body?.pinCode;
    if (req.body && 'pinCode' in req.body) delete req.body.pinCode;
    if (!code) throw badRequest('Code de confirmation requis (en-tête X-Confirmation-Code ou champ pinCode).');
    await checkConfirmationCode(req.user, code);
    next();
  } catch (e) {
    next(e);
  }
}, { confirm: true });

export const requireMaintenanceCode = withMeta(async (req, _res, next) => {
  try {
    const code = req.headers['x-maintenance-code'] ?? req.body?.password ?? req.body?.maintenanceCode;
    if (req.body) {
      delete req.body.password;
      delete req.body.maintenanceCode;
    }
    if (!code) throw badRequest('Code de maintenance requis (en-tête X-Maintenance-Code).');
    await checkMaintenanceCode(req.user, code);
    next();
  } catch (e) {
    next(e);
  }
}, { maintenance: true });
