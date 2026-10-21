import { config } from '../config.js';
import { HttpError } from '../utils/httpError.js';

const MYSQL_ERRORS = {
  ER_DUP_ENTRY: { status: 409, message: 'Cette valeur existe déjà (doublon).' },
  ER_DATA_TOO_LONG: { status: 400, message: 'Une valeur est trop longue pour être enregistrée.' },
  ER_WARN_DATA_OUT_OF_RANGE: { status: 400, message: 'Une valeur numérique dépasse la capacité autorisée.' },
  ER_TRUNCATED_WRONG_VALUE: { status: 400, message: 'Une valeur est invalide (date ou nombre).' },
  ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: { status: 400, message: 'Une valeur est invalide pour son champ.' },
  ER_BAD_NULL_ERROR: { status: 400, message: 'Un champ obligatoire est manquant.' },
  ER_NO_REFERENCED_ROW_2: { status: 409, message: 'Référence vers un enregistrement inexistant.' },
  ER_ROW_IS_REFERENCED_2: { status: 409, message: "Suppression impossible : l'enregistrement est référencé ailleurs." },
  ER_LOCK_DEADLOCK: { status: 503, message: "Conflit d'accès concurrent : réessayez." },
  ER_LOCK_WAIT_TIMEOUT: { status: 503, message: 'La base est occupée : réessayez.' },
};

export const notFoundHandler = (req, _res, next) => next(new HttpError(404, `Route introuvable : ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ success: false, error: err.message, ...(err.code ? { code: err.code } : {}), ...(err.details ? { details: err.details } : {}) });
  }

  const msg = String(err?.message || '');
  // Erreurs MySQL : une donnée refusée par la base est une erreur de requête (4xx), jamais un plantage (500)
  const mysqlStatus = MYSQL_ERRORS[err?.code];
  if (mysqlStatus) {
    return res.status(mysqlStatus.status).json({ success: false, error: mysqlStatus.message, code: err.code });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'JSON invalide.' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Requête trop volumineuse.' });
  }

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur.',
    ...(config.isProd ? {} : { debug: msg }),
  });
}
