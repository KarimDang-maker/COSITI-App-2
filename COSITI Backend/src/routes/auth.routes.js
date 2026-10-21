import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { z } from 'zod';
import * as auth from '../services/auth.js';
import { authenticate, requireConfirmation } from '../middleware/auth.js';
import { validate, passwordRule } from '../middleware/validate.js';
import { asyncHandler } from '../utils/httpError.js';
import { ok, clientMeta } from '../utils/respond.js';

const router = Router();

// Frein au brute-force par IP (en plus du verrouillage de compte par utilisateur)
const limiter = (limit) =>
  rateLimit({
    windowMs: 15 * 60_000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: 'Trop de tentatives de connexion. Réessayez plus tard.' },
  });
const loginLimiter = limiter(config.loginRateLimit);
const refreshLimiter = limiter(config.refreshRateLimit);

/** POST /api/auth/login — { email, password } */
router.post(
  '/login',
  loginLimiter,
  validate({ body: z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) }) }),
  asyncHandler(async (req, res) => ok(res, await auth.login(req.body.email, req.body.password, clientMeta(req))))
);

/** POST /api/auth/refresh — { refreshToken } : rotation du refresh token */
router.post(
  '/refresh',
  refreshLimiter,
  validate({ body: z.object({ refreshToken: z.string().min(20).max(200) }) }),
  asyncHandler(async (req, res) => ok(res, await auth.refresh(req.body.refreshToken, clientMeta(req))))
);

/** POST /api/auth/logout — { refreshToken? } : révoque la session (famille de refresh tokens) */
router.post(
  '/logout',
  authenticate,
  validate({ body: z.object({ refreshToken: z.string().max(200).optional() }) }),
  asyncHandler(async (req, res) => {
    await auth.logout(req.body.refreshToken, req.user);
    ok(res, { message: 'Déconnecté.' });
  })
);

/** GET /api/auth/me — profil + droits de l'utilisateur connecté */
router.get('/me', authenticate, (req, res) => ok(res, auth.sessionPayload(req.user)));

/** POST /api/auth/change-password — { currentPassword, newPassword } */
router.post(
  '/change-password',
  authenticate,
  validate({ body: z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordRule }) }),
  asyncHandler(async (req, res) =>
    ok(res, await auth.changePassword(req.user, req.body.currentPassword, req.body.newPassword, clientMeta(req)))
  )
);

/** POST /api/auth/verify-code — vérifie le code de confirmation sans rien modifier (PinConfirmModal) */
router.post(
  '/verify-code',
  authenticate,
  validate({ body: z.object({ pinCode: z.string().min(1).max(20) }) }),
  requireConfirmation,
  (req, res) => ok(res, { valid: true })
);

export default router;
