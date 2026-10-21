import { z } from 'zod';
import { badRequest } from '../utils/httpError.js';
import { MAX_MONEY, hasMaxTwoDecimals, round2 } from '../utils/money.js';

/** validate({ body, query, params }) — remplace req.* par la version validée (champs inconnus retirés). */
export const validate = (schemas) =>
  Object.assign(
    (req, _res, next) => {
      for (const part of ['params', 'query', 'body']) {
        if (!schemas[part]) continue;
        const r = schemas[part].safeParse(req[part] ?? {});
        if (!r.success) {
          return next(
            badRequest(
              'Données invalides.',
              r.error.issues.map((i) => ({ champ: i.path.join('.'), message: i.message }))
            )
          );
        }
        if (part === 'query') req.validatedQuery = r.data;
        else req[part] = r.data;
      }
      next();
    },
    { meta: { schemas } } // lu par le générateur Swagger
  );

// ---- Briques réutilisables ----
/** Date AAAA-MM-JJ (un horodatage ISO est accepté et tronqué à la date). */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Date attendue au format AAAA-MM-JJ')
  .transform((s) => s.slice(0, 10))
  .refine((s) => !Number.isNaN(new Date(s).getTime()), 'Date invalide');

/** Rend un champ optionnel et traite la chaîne vide ("" envoyée par les formulaires) comme absent. */
export const innerSchemas = new WeakMap(); // schéma interne de chaque opt() — lu par le générateur Swagger
export const opt = (schema) => {
  const wrapped = z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());
  innerSchemas.set(wrapped, schema);
  return wrapped;
};

export const MODES_PAIEMENT = ['Espèces', 'Wave', 'Orange Money', 'MTN MoMo', 'Moov Money', 'Virement bancaire', 'Chèque'];
export const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mois attendu au format AAAA-MM');
// Montants : colonnes DECIMAL(15,2) => au plus 2 décimales et jamais au-delà de la capacité de la colonne
// (sinon MySQL arrondirait en silence ou refuserait avec une erreur 500).
// Les chaînes vides, null, booléens, tableaux, « 0x10 » ou « 1e3 » ne sont PAS des montants (z.coerce les aurait acceptés).
const toNumber = (v) => {
  if (typeof v === 'string') {
    const t = v.trim();
    return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
  }
  return v;
};
const moneyOf = (check, message) =>
  z.preprocess(
    toNumber,
    z.number().finite().max(MAX_MONEY, 'Montant trop élevé').refine(hasMaxTwoDecimals, 'Au plus 2 décimales').refine(check, message).transform(round2)
  );
export const money = moneyOf((n) => n >= 0, 'Le montant ne peut pas être négatif');
// « positif » = au moins 1 centime (1e-9 serait enregistré 0,00)
export const positiveMoney = moneyOf((n) => Math.round(n * 100) >= 1, 'Le montant doit être supérieur à 0');
export const idParam = z.object({ id: z.string().min(1).max(100) });

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
  q: z.string().trim().max(100).optional(),
});

export const passwordRule = z
  .string()
  .min(8, 'Au moins 8 caractères')
  .max(128)
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/\d/, 'Au moins un chiffre');

