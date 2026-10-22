export const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/** '2026-03-04' -> { mois: 'Mars', annee: 2026 } */
export function moisAnneeFromDate(iso) {
  const [y, m] = iso.split('-').map(Number);
  return { mois: MOIS_FR[m - 1], annee: y };
}

/** Premier / dernier jour (AAAA-MM-JJ) d'un mois 'AAAA-MM' */
export function bornesMois(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { debut: `${yearMonth}-01`, fin: `${yearMonth}-${String(last).padStart(2, '0')}` };
}
