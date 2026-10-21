import { query } from '../db/database.js';
import { repos } from '../db/repository.js';
import { toSql } from '../utils/ids.js';

/**
 * Activité d'un acteur de la plateforme (piste d'audit filtrée sur une personne).
 * Les entrées récentes portent `utilisateur_id` ; celles importées du dump d'origine n'ont que le nom :
 * elles sont rattachées par le nom quand l'identifiant est absent.
 */
function scope(user, { du, au, typeOperation } = {}) {
  const parts = ['(utilisateur_id = ? OR (utilisateur_id IS NULL AND utilisateur = ?))'];
  const params = [user.id, user.nom];
  if (du) {
    parts.push('date_heure >= ?');
    params.push(toSql(`${du}T00:00:00.000Z`));
  }
  if (au) {
    parts.push('date_heure <= ?');
    params.push(toSql(`${au}T23:59:59.999Z`));
  }
  if (typeOperation) {
    parts.push('type_operation = ?');
    params.push(typeOperation);
  }
  return { sql: parts.join(' AND '), params };
}

export async function activiteUtilisateur(user, filters = {}, { page = 1, pageSize = 50 } = {}) {
  const w = scope(user, filters);
  const size = Math.min(500, Math.max(1, pageSize));
  const [[{ n }], ids] = await Promise.all([
    query(`SELECT COUNT(*) AS n FROM journal_operations WHERE ${w.sql}`, w.params),
    query(`SELECT id FROM journal_operations WHERE ${w.sql} ORDER BY date_heure DESC, id DESC LIMIT ? OFFSET ?`, [...w.params, size, (Math.max(1, page) - 1) * size]),
  ]);
  const items = await Promise.all(ids.map((r) => repos.journal.get(r.id)));
  return { items, total: Number(n), page: Math.max(1, page), pageSize: size };
}

export async function statistiquesUtilisateur(user, filters = {}) {
  const w = scope(user, filters);
  const [parType, parEntite, parJour, bornes] = await Promise.all([
    query(`SELECT type_operation AS cle, COUNT(*) AS n FROM journal_operations WHERE ${w.sql} GROUP BY type_operation ORDER BY n DESC`, w.params),
    query(`SELECT entite AS cle, COUNT(*) AS n FROM journal_operations WHERE ${w.sql} GROUP BY entite ORDER BY n DESC`, w.params),
    query(`SELECT DATE(date_heure) AS cle, COUNT(*) AS n FROM journal_operations WHERE ${w.sql} GROUP BY DATE(date_heure) ORDER BY cle DESC LIMIT 31`, w.params),
    query(`SELECT MIN(date_heure) AS premiere, MAX(date_heure) AS derniere, COUNT(*) AS total FROM journal_operations WHERE ${w.sql}`, w.params),
  ]);
  const toObj = (rows) => Object.fromEntries(rows.map((r) => [String(r.cle), Number(r.n)]));
  const types = toObj(parType);
  const iso = (s) => (s ? `${String(s).replace(' ', 'T').slice(0, 19)}Z` : null);
  return {
    total: Number(bornes[0].total),
    premiereAction: iso(bornes[0].premiere),
    derniereAction: iso(bornes[0].derniere),
    connexions: types.CONNEXION || 0,
    echecsConnexion: types.ECHEC_CONNEXION || 0,
    parTypeOperation: types,
    parEntite: toObj(parEntite),
    parJour: toObj(parJour),
  };
}
