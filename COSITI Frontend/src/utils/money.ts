/**
 * Somme exacte au centime (évite 0,1 + 0,2 = 0,30000000000000004).
 * Réservé aux SOUS-TOTAUX D'AFFICHAGE d'une liste filtrée à l'écran : les totaux et soldes de la plateforme
 * sont calculés par le serveur (Backend/src/utils/money.js).
 */
export function sumMoney<T>(list: T[], pick: (x: T) => number | undefined | null = (x: any) => x.montant): number {
  return list.reduce((cents, x) => cents + Math.round((Number(pick(x)) || 0) * 100), 0) / 100;
}
