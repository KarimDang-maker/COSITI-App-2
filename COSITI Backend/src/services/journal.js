import { repos } from '../db/repository.js';
import { newId, nowIso } from '../utils/ids.js';

/**
 * Piste d'audit : chaque opération sensible est tracée (qui, quand, quoi, avant/après).
 * Reprend la forme de JournalOperation du front. `user` = utilisateur authentifié (req.user).
 * Dans une transaction, l'entrée est validée (ou annulée) avec l'opération qu'elle trace.
 */
export async function logOperation(user, entry) {
  const doc = {
    id: newId('j'),
    dateHeure: nowIso(),
    utilisateur: user?.nom ?? 'Système',
    role: user?.role ?? 'Système',
    utilisateurId: user?.id,
    ...entry,
  };
  // `date` (libellé fr-FR) et `adherentMatricule` sont recalculés à la lecture
  delete doc.date;
  if (doc.adherentMatricule && !doc.matricule) doc.matricule = doc.adherentMatricule;
  delete doc.adherentMatricule;
  for (const k of ['anciennesInformations', 'nouvellesInformations', 'details']) {
    if (doc[k] !== undefined && typeof doc[k] !== 'string') doc[k] = JSON.stringify(doc[k]);
  }
  await repos.journal.insert(doc);
  return doc;
}

export const fmtMoney = (n) => `${(n ?? 0).toLocaleString('fr-FR')} FCFA`;

export { nowIso };
