/**
 * Arithmétique monétaire exacte. Les colonnes sont en DECIMAL(15,2) : toute somme est faite en centimes entiers
 * pour ne jamais produire d'erreur de virgule flottante (0.1 + 0.2 = 0.30000000000000004).
 */

export const MAX_MONEY = 9_999_999_999_999.99; // limite de DECIMAL(15,2)

const toCents = (v) => Math.round((Number(v) || 0) * 100);

/** Arrondit à 2 décimales (au centime). */
export const round2 = (n) => toCents(n) / 100;

/** true si la valeur a au plus 2 décimales. */
export const hasMaxTwoDecimals = (n) => Math.abs(Number(n) * 100 - Math.round(Number(n) * 100)) < 1e-6;

/** Somme exacte : sumMoney(list, 'montant') ou sumMoney(list, (x) => x.a - x.b). Ignore les valeurs non numériques. */
export function sumMoney(list, key = 'montant') {
  const get = typeof key === 'function' ? key : (x) => x?.[key];
  let cents = 0;
  for (const x of list) cents += toCents(get(x));
  return cents / 100;
}

/** Somme exacte de montants déjà extraits. */
export const addMoney = (...values) => sumMoney(values, (v) => v);

/** Regroupe et additionne exactement : groupSumMoney(list, (x) => x.mode) → { mode: total }. */
export function groupSumMoney(list, keyFn, valFn = (x) => x.montant) {
  const cents = {};
  for (const x of list) {
    const k = keyFn(x) ?? 'Non renseigné';
    cents[k] = (cents[k] || 0) + toCents(valFn(x));
  }
  return Object.fromEntries(Object.entries(cents).map(([k, c]) => [k, c / 100]));
}
