export class HttpError extends Error {
  constructor(status, message, details, code) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}
export const badRequest = (m, d) => new HttpError(400, m, d);
export const unauthorized = (m = 'Authentification requise.') => new HttpError(401, m);
export const forbidden = (m = 'Accès refusé pour votre profil.') => new HttpError(403, m);
export const notFound = (m = 'Ressource introuvable.') => new HttpError(404, m);
export const conflict = (m) => new HttpError(409, m);

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
