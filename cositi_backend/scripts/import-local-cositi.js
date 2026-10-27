// Remplacement explicite de la base locale par le dump COSITI fourni.
// Usage : node scripts/import-local-cositi.js --replace
// Ne jamais exécuter sur une base distante ou sans sauvegarde vérifiée.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { config } from '../src/config.js';
import { initDb, closeDb, query } from '../src/db/database.js';
import { bootstrap } from '../src/db/seed.js';
import { splitStatements } from '../src/db/sql.js';
import { TABLES } from '../src/db/tables.js';

const dumpPath = fileURLToPath(new URL('../database/COSITI DATABASE/cositi_database_mysql_dump_2026-10-26.sql', import.meta.url));
const backupDir = 'C:/Users/abdel/AppData/Local/COSITI_DB_Backups';
const expectedSourceCounts = {
  parametres: 1, banques_partenaires: 3, utilisateurs: 6, gestionnaires_portefeuille: 7, adherents: 186,
  cotisations: 165, dossiers_allocations: 8, dossier_pieces: 64, dossier_historiques: 9, depenses_courantes: 227,
  versements_bancaires: 6, frais_mobile_money: 6, employes: 6, bulletins_paie: 6, partenaires_direction: 0,
  rendez_vous_direction: 0, notes_specifiques_direction: 0, rapports_reunions: 0, decisions_reunions: 0,
  rapports_agents_terrain: 0, journal_operations: 830,
};
const sourceCounts = {};

const verifyOnly = process.argv.includes('--verify');
if (!verifyOnly && !process.argv.includes('--replace')) throw new Error('Choisissez --verify ou confirmez le remplacement local avec --replace.');
if (!['127.0.0.1', 'localhost', '::1'].includes(config.db.host) || config.db.name !== 'cositi_ci' || config.db.user !== 'root') {
  throw new Error('Garde-fou : cet import est réservé à MySQL local, base cositi_ci, compte root.');
}
if (!existsSync(dumpPath)) throw new Error('Le dump source est introuvable.');

const conn = await mysql.createConnection({ host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password, charset: 'utf8mb4' });

try {
  if (!verifyOnly) {
    const sql = readFileSync(dumpPath, 'utf8');
    const statements = splitStatements(sql);
    if ((sql.match(/CREATE TABLE\s+`/gi) || []).length !== 21) throw new Error('Le dump source ne contient pas les 21 tables attendues.');

    const [[{ present }]] = await conn.query('SELECT COUNT(*) AS present FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [config.db.name]);
    if (!present) throw new Error('La base locale cible n’existe pas : aucune sauvegarde automatique ne peut être créée, import interrompu.');
    await conn.changeUser({ database: config.db.name });
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    const [tables] = await conn.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = \'BASE TABLE\'', [config.db.name]);
    const backup = ['-- Sauvegarde COSITI créée avant import ; toutes les tables et lignes locales sont incluses.', 'SET FOREIGN_KEY_CHECKS = 0;'];
    for (const { name } of tables) {
      const safeName = String(name).replaceAll('`', '``');
      const [[createRow]] = await conn.query(`SHOW CREATE TABLE \`${safeName}\``);
      const createSql = Object.values(createRow)[1];
      backup.push(`DROP TABLE IF EXISTS \`${safeName}\`;`, `${createSql};`);
      const [rows] = await conn.query(`SELECT * FROM \`${safeName}\``);
      if (rows.length) {
        const columns = Object.keys(rows[0]);
        const values = rows.map((row) => columns.map((column) => row[column]));
        backup.push(`${mysql.format('INSERT INTO ?? (??) VALUES ?', [name, columns, values])};`);
      }
    }
    backup.push('SET FOREIGN_KEY_CHECKS = 1;');
    mkdirSync(backupDir, { recursive: true });
    const backupPath = `${backupDir}/cositi_ci_pre_import_${new Date().toISOString().replace(/[-:.TZ]/g, '')}.sql`;
    writeFileSync(backupPath, `${backup.join('\n\n')}\n`, 'utf8');
    console.log(`Sauvegarde locale créée avant remplacement : ${backupPath} (${tables.length} tables).`);

    await conn.query(`DROP DATABASE IF EXISTS \`${config.db.name}\``);
    await conn.query(`CREATE DATABASE \`${config.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.changeUser({ database: config.db.name });
    await conn.query("SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO'");
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('SET NAMES utf8mb4');

    let executed = 0;
    for (const statement of statements) {
      if (/^(DROP TABLE|CREATE TABLE|INSERT INTO|ALTER TABLE|SET\s+SQL_MODE)/i.test(statement)) {
        await conn.query(statement);
        executed++;
      }
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    const [[{ n: importedTables }]] = await conn.query('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [config.db.name]);
    if (Number(importedTables) !== 21) throw new Error(`Contrôle après import : ${importedTables} tables trouvées au lieu de 21.`);
    const mismatches = [];
    for (const [table, expected] of Object.entries(expectedSourceCounts)) {
      const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
      if (Number(n) !== expected) mismatches.push(`${table}: attendu ${expected}, trouvé ${n}`);
    }
    if (mismatches.length) throw new Error(`Comptages source incohérents : ${mismatches.join('; ')}`);
    console.log(`Import du dump effectué : ${executed} instructions SQL, ${importedTables} tables.`);
  } else {
    await conn.changeUser({ database: config.db.name });
  }
  const mismatches = [];
  for (const [table, expected] of Object.entries(expectedSourceCounts)) {
    const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
    sourceCounts[table] = Number(n);
    const target = table === 'utilisateurs' && verifyOnly ? expected + 1 : expected;
    if (Number(n) !== target) mismatches.push(`${table}: attendu ${target}, trouvé ${n}`);
  }
  if (mismatches.length) throw new Error(`Comptages source incohérents : ${mismatches.join('; ')}`);
  console.log(`Comptages des tables source conformes${verifyOnly ? ' (avec le compte superadmin créé au démarrage)' : ''}.`);
} finally {
  await conn.end();
}

if (verifyOnly) {
  console.log('Comptages des 21 tables source :', JSON.stringify(sourceCounts));
} else {
  await initDb({ migrate: true, log: (message) => console.log(`[db] ${message}`) });
  const startup = await bootstrap();
  for (const message of startup) console.log(`[bootstrap] ${message}`);
  const counts = {};
  for (const def of Object.values(TABLES)) {
    const [{ n }] = await query(`SELECT COUNT(*) AS n FROM \`${def.table}\``);
    counts[def.table] = Number(n);
  }
  console.log('Comptages finaux des collections applicatives :', JSON.stringify(counts));
  await closeDb();
}
