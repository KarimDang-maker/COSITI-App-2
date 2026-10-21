import { randomUUID } from 'node:crypto';

export const newId = (prefix) => `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
export const nowIso = () => new Date().toISOString();
export const today = () => new Date().toISOString().slice(0, 10);

/** Date -> 'YYYY-MM-DD HH:MM:SS.mmm' (UTC) pour les colonnes DATETIME(3) des requêtes SQL directes */
export const toSql = (d = new Date()) => new Date(d).toISOString().slice(0, 23).replace('T', ' ');

/** Date lisible fr-FR, identique à celle du journal du front ("19/10/2026 11:17") */
export const frDateTime = (d = new Date()) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Douala' }).format(d);
