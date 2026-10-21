import {
  Adherent,
  Alerte,
  Cotisation,
  DossierAllocations,
  ParametresApp,
  StatutCotisation,
} from '../types';

export function formatFCFA(amount?: number | null): string {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(safeAmount) + ' FCFA';
}

export function formatDateFr(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

// Les calculs métier (statistiques d'adhérent, alertes, matricules, origine des fonds, totaux financiers, paie) sont
// effectués par le serveur : voir Backend/src/utils et Backend/src/services. Le front se limite à l'affichage.
