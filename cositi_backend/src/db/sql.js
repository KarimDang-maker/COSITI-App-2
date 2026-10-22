/**
 * Outils SQL sans dépendance : découpage d'un script en instructions (guillemets et commentaires respectés)
 * et découpage d'une liste séparée par des virgules au niveau racine (corps d'un CREATE TABLE).
 */

/** Découpe un script SQL en instructions. Les commentaires (-- ..., # ..., /* ... *​/) hors guillemets sont retirés. */
export function splitStatements(sql) {
  const out = [];
  let cur = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const next = sql[i + 1];

    if (c === '-' && next === '-' && (sql[i + 2] === ' ' || sql[i + 2] === '\n' || sql[i + 2] === '\r' || i + 2 >= n)) {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    if (c === '#') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const q = c;
      cur += c;
      i++;
      while (i < n) {
        const d = sql[i];
        cur += d;
        i++;
        if (d === '\\' && q !== '`' && i < n) {
          cur += sql[i];
          i++;
        } else if (d === q) {
          if (sql[i] === q) {
            cur += sql[i];
            i++;
          } else break;
        }
      }
      continue;
    }
    if (c === ';') {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Découpe "a, b(1,2), c" en ["a", "b(1,2)", "c"] (profondeur de parenthèses et guillemets respectés). */
export function splitTopLevel(body) {
  const items = [];
  let depth = 0;
  let cur = '';
  let q = null;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (q) {
      cur += c;
      if (c === '\\' && q !== '`') cur += body[++i] ?? '';
      else if (c === q) q = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      q = c;
      cur += c;
    } else if (c === '(') {
      depth++;
      cur += c;
    } else if (c === ')') {
      depth--;
      cur += c;
    } else if (c === ',' && depth === 0) {
      items.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  if (cur.trim()) items.push(cur.trim());
  return items;
}
