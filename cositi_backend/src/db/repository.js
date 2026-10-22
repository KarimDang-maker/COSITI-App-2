import { query, inTransaction } from './database.js';
import { TABLES } from './tables.js';
import { nowIso } from '../utils/ids.js';

const q = (id) => `\`${id}\``;
const isoToSql = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 23).replace('T', ' ');
};
const sqlToIso = (s) => {
  if (!s || String(s).startsWith('0000')) return undefined;
  const [date, time = '00:00:00'] = String(s).split(' ');
  const [hms, ms = '0'] = time.split('.');
  return `${date}T${hms}.${ms.padEnd(3, '0').slice(0, 3)}Z`;
};

/** valeur document -> valeur SQL */
function toDb(type, v) {
  if (v === undefined || v === null) return null;
  switch (type) {
    case 'b': return v ? 1 : 0;
    case 'd': return v === '' ? null : String(v).slice(0, 10);
    case 't': return isoToSql(v);
    case 'j': case 'jt': return JSON.stringify(v);
    case 'i': case 'n': return Number(v);
    default: return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
}

/** valeur SQL -> valeur document (null/absent => undefined) */
function fromDb(type, v) {
  if (v === null || v === undefined) return undefined;
  switch (type) {
    case 'b': return !!v;
    case 'd': return String(v).startsWith('0000') ? undefined : String(v).slice(0, 10);
    case 't': return sqlToIso(v);
    case 'j': return typeof v === 'string' ? JSON.parse(v) : v;
    case 'jt': try { return JSON.parse(v); } catch { return v; }
    case 'i': case 'n': return Number(v);
    default: return String(v);
  }
}

export class Repository {
  constructor(name) {
    this.def = TABLES[name];
    if (!this.def) throw new Error(`Collection inconnue : ${name}`);
    this.name = name;
    this.table = this.def.table;
  }

  // ---- id <-> clé primaire
  _dbId(id) {
    if (this.def.fixedIds && id in this.def.fixedIds) return this.def.fixedIds[id];
    if (this.def.intId) return /^\d+$/.test(String(id)) ? Number(id) : -1;
    return String(id);
  }
  _docId(v) {
    if (this.def.fixedIds) {
      const hit = Object.entries(this.def.fixedIds).find(([, n]) => n === Number(v));
      if (hit) return hit[0];
    }
    return String(v);
  }

  _col(field) {
    const f = this.def.byField[field];
    if (!f) throw new Error(`Champ « ${field} » inconnu pour ${this.name} (filtrage/tri impossible)`);
    return `${q(this.table)}.${q(f.col)}`;
  }

  _rowToDoc(row) {
    if (!row) return null;
    const doc = {};
    for (const [col, { field, type }] of Object.entries(this.def.byColumn)) {
      const v = fromDb(type, row[col]);
      if (v !== undefined) doc[field] = v;
    }
    doc.id = this._docId(row[this.def.byField.id.col]);
    if (this.def.overflow && row[this.def.overflow]) {
      const extra = typeof row[this.def.overflow] === 'string' ? JSON.parse(row[this.def.overflow]) : row[this.def.overflow];
      Object.assign(doc, extra);
    }
    for (const [field, fn] of Object.entries(this.def.computed || {})) {
      const v = fn(doc);
      if (v !== undefined) doc[field] = v;
    }
    return doc;
  }

  /** document -> { colonnes SQL, extra } ; les champs inconnus vont dans la colonne overflow, sinon erreur explicite */
  _docToRow(doc, { skipNull }) {
    const row = {};
    const extra = {};
    for (const [k, v] of Object.entries(doc)) {
      if (this.def.ignore?.includes(k) || this.def.computed?.[k]) continue;
      const f = this.def.byField[k];
      if (f) {
        if (v === undefined || (skipNull && v === null)) continue;
        row[f.col] = toDb(f.type, v);
      } else if (this.def.overflow) {
        if (v !== undefined && v !== null) extra[k] = v;
      } else {
        throw new Error(`Champ « ${k} » non géré par la table ${this.table}`);
      }
    }
    if (this.def.overflow) row[this.def.overflow] = JSON.stringify(extra);
    return row;
  }

  async get(id, { forUpdate = false } = {}) {
    if (id === undefined || id === null) return null;
    const lock = forUpdate || inTransaction() ? ' FOR UPDATE' : '';
    const rows = await query(`SELECT * FROM ${q(this.table)} WHERE ${q(this.def.byField.id.col)} = ?${lock}`, [this._dbId(id)]);
    return this._rowToDoc(rows[0]);
  }

  async insert(doc) {
    const row = this._docToRow(doc, { skipNull: true });
    const idCol = this.def.byField.id.col;
    if (this.def.intId) {
      delete row[idCol];
      if (this.def.fixedIds && doc.id in this.def.fixedIds) row[idCol] = this.def.fixedIds[doc.id];
    } else row[idCol] = String(doc.id);
    const cols = Object.keys(row);
    const res = await query(`INSERT INTO ${q(this.table)} (${cols.map(q).join(',')}) VALUES (${cols.map(() => '?').join(',')})`, cols.map((c) => row[c]));
    if (this.def.intId && !(this.def.fixedIds && doc.id in this.def.fixedIds)) return { ...doc, id: String(res.insertId) };
    return doc;
  }

  /** Remplace le document : colonnes présentes ou null mises à jour (une valeur absente = déjà NULL en base). */
  async replace(doc) {
    const row = this._docToRow(doc, { skipNull: false });
    const idCol = this.def.byField.id.col;
    delete row[idCol];
    const cols = Object.keys(row);
    if (!cols.length) return doc;
    const res = await query(`UPDATE ${q(this.table)} SET ${cols.map((c) => `${q(c)} = ?`).join(', ')} WHERE ${q(idCol)} = ?`, [...cols.map((c) => row[c]), this._dbId(doc.id)]);
    return res.affectedRows ? doc : null;
  }

  /** Fusionne un patch (undefined ignoré, null efface). */
  async patch(id, patch) {
    const cur = await this.get(id);
    if (!cur) return null;
    const next = { ...cur };
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) next[k] = v;
    next.id = cur.id;
    await this.replace(next);
    return this.get(cur.id);
  }

  async delete(id) {
    const res = await query(`DELETE FROM ${q(this.table)} WHERE ${q(this.def.byField.id.col)} = ?`, [this._dbId(id)]);
    return res.affectedRows > 0;
  }

  async deleteAll() {
    const res = await query(`DELETE FROM ${q(this.table)}`);
    return res.affectedRows;
  }

  /**
   * where: { champ: valeur | { in, gte, lte, gt, lt, ne, null } }
   * like : { keys, term }  recherche insensible à la casse (OR)
   * or   : [ {champ: valeur}, ... ]
   */
  _where({ where = {}, like, or } = {}) {
    const parts = [];
    const params = [];
    const bindv = (field, v) => toDb(this.def.byField[field].type, v);

    for (const [k, cond] of Object.entries(where)) {
      if (cond === undefined) continue;
      const col = this._col(k);
      if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
        if (cond.in) {
          if (!cond.in.length) parts.push('0');
          else {
            parts.push(`${col} IN (${cond.in.map(() => '?').join(',')})`);
            params.push(...cond.in.map((v) => bindv(k, v)));
          }
        }
        for (const [op, sql] of [['gte', '>='], ['lte', '<='], ['gt', '>'], ['lt', '<'], ['ne', '<>']]) {
          if (cond[op] !== undefined) {
            parts.push(op === 'ne' ? `(${col} ${sql} ? OR ${col} IS NULL)` : `${col} ${sql} ?`);
            params.push(bindv(k, cond[op]));
          }
        }
        if (cond.null === true) parts.push(`${col} IS NULL`);
        if (cond.null === false) parts.push(`${col} IS NOT NULL`);
      } else if (cond === null) parts.push(`${col} IS NULL`);
      else {
        parts.push(`${col} = ?`);
        params.push(bindv(k, cond));
      }
    }

    if (or?.length) {
      const sub = [];
      for (const group of or) {
        for (const [k, v] of Object.entries(group)) {
          if (v === undefined || v === null) continue;
          sub.push(`${this._col(k)} = ?`);
          params.push(bindv(k, v));
        }
      }
      if (sub.length) parts.push(`(${sub.join(' OR ')})`);
    }

    if (like?.term && like.keys?.length) {
      const term = `%${String(like.term).toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      parts.push(`(${like.keys.map((k) => `LOWER(COALESCE(${this._col(k)}, '')) LIKE ?`).join(' OR ')})`);
      like.keys.forEach(() => params.push(term));
    }
    return { sql: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params };
  }

  async find({ where, like, or, orderBy, limit, offset } = {}) {
    const w = this._where({ where, like, or });
    let sql = `SELECT * FROM ${q(this.table)} ${w.sql}`;
    const idCol = `${q(this.table)}.${q(this.def.byField.id.col)}`;
    if (orderBy?.length) {
      sql += ' ORDER BY ' + orderBy.map(([k, dir]) => `${this._col(k)} ${String(dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC'}`).join(', ') + `, ${idCol} DESC`;
    } else if (this.def.byField.createdAt) {
      sql += ` ORDER BY ${this._col('createdAt')} DESC, ${idCol} DESC`;
    }
    const params = [...w.params];
    if (limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset || 0));
    }
    return (await query(sql, params)).map((r) => this._rowToDoc(r));
  }

  all(opts = {}) {
    return this.find(opts);
  }

  async findOne(opts) {
    return (await this.find({ ...opts, limit: 1 }))[0] || null;
  }

  async count(opts = {}) {
    const w = this._where(opts);
    const rows = await query(`SELECT COUNT(*) AS n FROM ${q(this.table)} ${w.sql}`, w.params);
    return Number(rows[0].n);
  }

  async paginate({ page = 1, pageSize = 50, ...opts } = {}) {
    const p = Math.max(1, page);
    const size = Math.min(500, Math.max(1, pageSize));
    const [items, total] = await Promise.all([this.find({ ...opts, limit: size, offset: (p - 1) * size }), this.count(opts)]);
    return { items, total, page: p, pageSize: size };
  }
}

export const repos = Object.fromEntries(Object.keys(TABLES).map((n) => [n, new Repository(n)]));
export { nowIso };
