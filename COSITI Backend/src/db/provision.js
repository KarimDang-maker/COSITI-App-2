// Création / vérification de la base et de l'utilisateur MySQL de l'application, avec le compte administrateur
// DB_ADMIN_USER. Utilisé par « npm run db:setup » et, au démarrage, UNIQUEMENT si DB_PROVISION_ON_START=true.
//  - ne crée que ce qui manque (base, utilisateur, privilèges) ; un utilisateur existant garde son mot de passe
//    (sauf demande explicite : npm run db:setup -- --reset-password) ;
//  - privilèges limités à la base de l'application (pas de GRANT ALL, pas de droits globaux) ;
//  - aucun mot de passe n'est affiché ni inclus dans les messages d'erreur.
import mysql from 'mysql2/promise';
import { config } from '../config.js';

// Ce dont l'API a besoin sur SA base : lire/écrire les données, créer et faire évoluer les tables (schema.sql)
export const APP_PRIVILEGES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'INDEX'];
const IDENT = /^[A-Za-z0-9_]+$/;

/** DB_NAME / DB_USER sont insérés dans des requêtes SQL : on n'accepte que lettres, chiffres et _. */
export function assertIdentifiers() {
  if (!IDENT.test(config.db.name)) throw new Error(`DB_NAME invalide (« ${config.db.name} ») : lettres, chiffres et _ uniquement.`);
  if (!IDENT.test(config.db.user)) throw new Error(`DB_USER invalide (« ${config.db.user} ») : lettres, chiffres et _ uniquement.`);
}

/** Instructions SQL qu'un administrateur MySQL peut exécuter à la main (sans mot de passe). */
export function adminSqlHint() {
  const { name, user, userHost } = config.db;
  return [
    `  CREATE DATABASE IF NOT EXISTS \`${name}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    `  CREATE USER IF NOT EXISTS '${user}'@'${userHost}' IDENTIFIED BY '<mot de passe de DB_PASSWORD>';`,
    `  GRANT ${APP_PRIVILEGES.join(', ')} ON \`${name}\`.* TO '${user}'@'${userHost}';`,
  ].join('\n');
}

export async function provision({ resetPassword = false, testDatabase = false, log = () => {} } = {}) {
  assertIdentifiers();
  const { host, port, name, user, password, userHost, admin } = config.db;
  if (!admin.user) throw new Error('DB_ADMIN_USER n\'est pas défini dans .env : renseignez un compte administrateur MySQL (DB_ADMIN_USER / DB_ADMIN_PASSWORD).');
  if (!password) throw new Error('DB_PASSWORD est vide : définissez le mot de passe de l\'utilisateur MySQL de l\'application dans .env.');

  let conn;
  try {
    conn = await mysql.createConnection({ host, port, user: admin.user, password: admin.password });
  } catch (e) {
    throw new Error(`Connexion administrateur « ${admin.user} » à ${host}:${port} impossible (${e.code || e.message}). Vérifiez DB_ADMIN_USER / DB_ADMIN_PASSWORD.`);
  }
  const report = { databaseCreated: false, userCreated: false, passwordReset: false, granted: [] };
  try {
    const [[db]] = await conn.query('SELECT COUNT(*) AS n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [name]);
    if (!db.n) {
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      report.databaseCreated = true;
    }
    log(`base « ${name} » ${report.databaseCreated ? 'créée' : 'déjà existante'}`);

    // IF NOT EXISTS : un utilisateur existant n'est pas modifié (avertissement MySQL au lieu d'une création)
    const [created] = await conn.query('CREATE USER IF NOT EXISTS ?@? IDENTIFIED BY ?', [user, userHost, password]);
    report.userCreated = !created.warningStatus;
    if (!report.userCreated && resetPassword) {
      await conn.query('ALTER USER ?@? IDENTIFIED BY ?', [user, userHost, password]);
      report.passwordReset = true;
    }
    log(`utilisateur « ${user}@${userHost} » ${report.userCreated ? 'créé' : report.passwordReset ? 'existant, mot de passe aligné sur DB_PASSWORD' : 'déjà existant (mot de passe inchangé)'}`);

    // privilèges : seulement ceux qui manquent (droits globaux ou sur la base, y compris par motif `cositi\_%`)
    const grantee = `'${user}'@'${userHost}'`;
    const [rows] = await conn.query(
      `SELECT PRIVILEGE_TYPE AS p FROM information_schema.USER_PRIVILEGES WHERE GRANTEE = ?
       UNION SELECT PRIVILEGE_TYPE FROM information_schema.SCHEMA_PRIVILEGES WHERE GRANTEE = ? AND ? LIKE TABLE_SCHEMA`,
      [grantee, grantee, name],
    );
    const have = new Set(rows.map((r) => r.p));
    report.granted = APP_PRIVILEGES.filter((p) => !have.has(p));
    if (report.granted.length) await conn.query(`GRANT ${report.granted.join(', ')} ON \`${name}\`.* TO ?@?`, [user, userHost]);
    log(report.granted.length ? `privilèges accordés sur « ${name} » : ${report.granted.join(', ')}` : `privilèges sur « ${name} » déjà suffisants`);

    if (testDatabase) {
      // base jetable de « npm test » (recréée à chaque exécution)
      // `cositi\_test%` : cositi_test, cositi_test_finances, cositi_test_excel... (une base jetable par fichier de test)
      await conn.query('GRANT ALL PRIVILEGES ON `cositi\\_test%`.* TO ?@?', [user, userHost]);
      log('privilèges sur les bases de test « cositi_test* » accordés');
    }
  } finally {
    await conn.end();
  }

  // un utilisateur existant dont le mot de passe diffère de DB_PASSWORD : on le signale sans rien écraser
  if (!report.userCreated && !report.passwordReset) {
    try {
      const check = await mysql.createConnection({ host, port, user, password, database: name });
      await check.end();
    } catch (e) {
      if (e.code === 'ER_ACCESS_DENIED_ERROR') {
        throw new Error(`L'utilisateur « ${user}@${userHost} » existe déjà mais n'accepte pas le mot de passe DB_PASSWORD (ou se connecte depuis un autre hôte que « ${userHost} », voir DB_USER_HOST). Corrigez DB_PASSWORD, ou alignez explicitement son mot de passe : npm run db:setup -- --reset-password`);
      }
      throw e;
    }
  }
  return report;
}
