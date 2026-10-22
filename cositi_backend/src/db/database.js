import mysql from 'mysql2/promise';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import { config } from '../config.js';
import { splitStatements, splitTopLevel } from './sql.js';
import { APP_PRIVILEGES, adminSqlHint, assertIdentifiers, provision } from './provision.js';

export { COLLECTIONS } from './tables.js';

const als = new AsyncLocalStorage();
let pool;

const baseOptions = () => ({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  charset: 'utf8mb4',
  dateStrings: true, // DATE/DATETIME renvoyés en texte (pas de conversion de fuseau)
  decimalNumbers: true, // DECIMAL renvoyés en nombres
  timezone: 'Z',
});

const NETWORK_ERRORS = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'EHOSTUNREACH', 'ECONNRESET']);
const PRIVILEGE_ERRORS = new Set(['ER_DBACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR', 'ER_TABLEACCESS_DENIED_ERROR', 'ER_COLUMNACCESS_DENIED_ERROR']);

const SETUP_HINT = `Solutions (au choix) :
  - npm run db:setup  (avec un compte administrateur MySQL dans DB_ADMIN_USER / DB_ADMIN_PASSWORD) ;
  - DB_PROVISION_ON_START=true pour que l'API fasse la même chose au démarrage avec ce compte administrateur ;
  - ou faire exécuter par un administrateur MySQL (voir aussi database/00_create_database_and_user.sql) :`;

class DbInitError extends Error {
  constructor(message, { provisionable = false } = {}) {
    super(message);
    this.provisionable = provisionable; // un compte administrateur (DB_PROVISION_ON_START) peut corriger
  }
}

function explain(e) {
  if (e instanceof DbInitError) return e;
  const { host, port, user, name, password } = config.db;
  if (NETWORK_ERRORS.has(e.code)) {
    return new DbInitError(`Serveur MySQL injoignable à ${host}:${port} (${e.code}). Vérifiez que le service MySQL est démarré (Windows : « net start MySQL80 ») et les variables DB_HOST / DB_PORT.`);
  }
  if (e.code === 'ER_ACCESS_DENIED_ERROR') {
    return new DbInitError(`Connexion refusée pour l'utilisateur MySQL « ${user} » (mot de passe ${password ? 'fourni' : 'VIDE'}) : il n'existe pas, ou son mot de passe ne correspond pas à DB_PASSWORD.\n${SETUP_HINT}\n${adminSqlHint()}`, { provisionable: true });
  }
  if (PRIVILEGE_ERRORS.has(e.code)) {
    return new DbInitError(`Privilèges MySQL insuffisants pour « ${user} » sur la base « ${name} » (${e.code} : ${e.sqlMessage || e.message}).
Privilèges nécessaires : ${APP_PRIVILEGES.join(', ')} sur \`${name}\`.* — plus CREATE au niveau global (GRANT CREATE ON *.*) seulement si l'API doit créer la base elle-même.
${SETUP_HINT}\n${adminSqlHint()}`, { provisionable: true });
  }
  return e;
}

/**
 * Initialisation de la base au démarrage, étape par étape (messages via `log`) :
 *  1. connexion au serveur MySQL avec DB_USER (sans base) ;
 *  2. base DB_NAME : vérifiée, créée si absente et DB_AUTO_CREATE=true ;
 *  3. pool + schéma (database/schema.sql : idempotent, ajoute seulement tables / colonnes / index manquants).
 * Ne supprime ni ne réécrit aucune donnée. En cas d'accès refusé ou de privilèges insuffisants, et UNIQUEMENT si
 * DB_PROVISION_ON_START=true, le compte DB_ADMIN_USER crée ce qui manque (src/db/provision.js) puis on réessaie une fois.
 */
export async function initDb({ migrate: doMigrate = true, log = () => {} } = {}) {
  if (pool) return pool;
  assertIdentifiers();
  try {
    return await prepare({ doMigrate, log });
  } catch (err) {
    const e = explain(err);
    if (!e.provisionable || !config.db.provisionOnStart) throw e;
    log(`${e.message.split('\n')[0]}\n→ DB_PROVISION_ON_START=true : préparation avec le compte administrateur « ${config.db.admin.user || '(DB_ADMIN_USER non défini)'} »…`);
    await provision({ log: (m) => log(`  ${m}`) });
    try {
      return await prepare({ doMigrate, log });
    } catch (again) {
      throw explain(again);
    }
  }
}

async function prepare({ doMigrate, log }) {
  const { host, port, user, name, autoCreate } = config.db;

  // 1. serveur joignable + identifiants
  const conn = await mysql.createConnection(baseOptions());
  try {
    const [[{ v }]] = await conn.query('SELECT VERSION() AS v');
    log(`Connexion au serveur MySQL ${host}:${port} réussie (utilisateur « ${user} », version ${v}).`);

    // 2. base de l'application (un utilisateur ne voit que les bases auxquelles il a accès)
    const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [name]);
    if (n) {
      log(`Base « ${name} » : existante.`);
    } else if (!autoCreate) {
      throw new DbInitError(`La base « ${name} » n'existe pas (ou n'est pas accessible à « ${user} ») et DB_AUTO_CREATE=false.\n${SETUP_HINT}\n${adminSqlHint()}`, { provisionable: true });
    } else {
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      log(`Base « ${name} » : créée (utf8mb4).`);
    }
  } finally {
    await conn.end().catch(() => {});
  }

  // 3. pool + tables
  pool = mysql.createPool({ ...baseOptions(), database: name, connectionLimit: config.db.poolSize, waitForConnections: true });
  pool.pool.on('connection', (c) => c.query("SET time_zone = '+00:00'"));
  try {
    await pool.query('SELECT 1');
    if (doMigrate) {
      const r = await migrate();
      const parts = [
        r.tablesCreees.length ? `${r.tablesCreees.length} table(s) créée(s)` : '',
        r.colonnesAjoutees.length ? `${r.colonnesAjoutees.length} colonne(s) ajoutée(s) (${r.colonnesAjoutees.join(', ')})` : '',
        r.indexAjoutes.length ? `${r.indexAjoutes.length} index ajouté(s)` : '',
      ].filter(Boolean);
      log(`Schéma : ${r.tables} tables vérifiées${parts.length ? ` — ${parts.join(', ')}` : ', déjà à jour'}.`);
    }
    return pool;
  } catch (e) {
    await closeDb().catch(() => {});
    throw e;
  }
}

export async function closeDb() {
  if (pool) await pool.end();
  pool = undefined;
}

export const getPool = () => {
  if (!pool) throw new Error('Base non initialisée : appelez initDb() au démarrage.');
  return pool;
};

/** Exécute une requête (dans la transaction courante s'il y en a une). Retourne les lignes, ou le ResultSetHeader. */
export async function query(sql, params = []) {
  const ctx = als.getStore();
  const [res] = await (ctx?.conn ?? getPool()).query(sql, params);
  return res;
}

export const inTransaction = () => !!als.getStore()?.conn;

/** Transaction : tout ou rien. Réentrante (une transaction imbriquée rejoint la transaction parente). */
export async function tx(fn) {
  if (inTransaction()) return fn();
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const out = await als.run({ conn }, fn);
    await conn.commit();
    return out;
  } catch (e) {
    try {
      await conn.rollback();
    } catch {
      /* connexion perdue */
    }
    throw e;
  } finally {
    conn.release();
  }
}

/* ------------------------------------------------------------------ migration */

export const SCHEMA_PATH = new URL('../../database/schema.sql', import.meta.url);

function parseCreate(stmt) {
  const m = stmt.match(/^CREATE TABLE IF NOT EXISTS `([^`]+)`\s*\(([\s\S]*)\)\s*ENGINE/i);
  if (!m) return null;
  const items = splitTopLevel(m[2]);
  const columns = [];
  const keys = [];
  for (const it of items) {
    if (it.startsWith('`')) columns.push({ name: it.match(/^`([^`]+)`/)[1], ddl: it });
    else if (/^(UNIQUE\s+)?KEY\s+`/i.test(it)) keys.push({ name: it.match(/KEY\s+`([^`]+)`/i)[1], ddl: it });
  }
  return { table: m[1], columns, keys };
}

/** Applique database/schema.sql sans jamais supprimer : retourne ce qui a été créé / ajouté. */
export async function migrate() {
  const report = { tables: 0, tablesCreees: [], colonnesAjoutees: [], indexAjoutes: [] };
  const [existing] = await pool.query('SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [config.db.name]);
  const existingTables = new Set(existing.map((r) => r.t.toLowerCase()));
  const statements = splitStatements(readFileSync(SCHEMA_PATH, 'utf8'));
  for (const stmt of statements) {
    const parsed = parseCreate(stmt);
    await pool.query(stmt);
    if (!parsed) continue;
    report.tables++;
    if (!existingTables.has(parsed.table.toLowerCase())) {
      report.tablesCreees.push(parsed.table);
      continue;
    }

    // Auto-réparation d'une table pré-existante (ex. import brut du dump d'origine)
    const [cols] = await pool.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [config.db.name, parsed.table]);
    const have = new Set(cols.map((c) => c.COLUMN_NAME.toLowerCase()));
    for (const c of parsed.columns) {
      if (have.has(c.name.toLowerCase())) continue;
      await pool.query(`ALTER TABLE \`${parsed.table}\` ADD COLUMN ${c.ddl}`);
      report.colonnesAjoutees.push(`${parsed.table}.${c.name}`);
    }
    const [idx] = await pool.query('SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [config.db.name, parsed.table]);
    const haveIdx = new Set(idx.map((i) => i.INDEX_NAME.toLowerCase()));
    for (const k of parsed.keys) {
      if (haveIdx.has(k.name.toLowerCase())) continue;
      try {
        await pool.query(`ALTER TABLE \`${parsed.table}\` ADD ${k.ddl}`);
        report.indexAjoutes.push(`${parsed.table}.${k.name}`);
      } catch (e) {
        if (PRIVILEGE_ERRORS.has(e.code)) throw e;
        console.warn(`[migrate] index ${parsed.table}.${k.name} non créé : ${e.message}`);
      }
    }
  }
  // Le dump déclare dernier_acces en DATETIME alors que ses données sont du texte libre ("En ligne maintenant")
  const [[col]] = await pool.query("SELECT DATA_TYPE AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'utilisateurs' AND COLUMN_NAME = 'dernier_acces'", [config.db.name]);
  if (col && col.t !== 'varchar') await pool.query('ALTER TABLE `utilisateurs` MODIFY `dernier_acces` VARCHAR(100) DEFAULT NULL');
  // statut « En congé » des gestionnaires (proposé par le front, absent de l'ENUM du dump)
  const [[gs]] = await pool.query("SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'gestionnaires_portefeuille' AND COLUMN_NAME = 'statut'", [config.db.name]);
  if (gs && !String(gs.t).includes('congé')) {
    await pool.query("ALTER TABLE `gestionnaires_portefeuille` MODIFY `statut` ENUM('Actif', 'Inactif', 'En congé') NOT NULL DEFAULT 'Actif'");
  }
  // import brut du dump par le client mysql : le texte libre est devenu une « date zéro » inutilisable
  await pool.query("UPDATE `utilisateurs` SET `dernier_acces` = NULL WHERE `dernier_acces` LIKE '0000-00-00%'");
  return report;
}
