// npm run db:setup : crée la base MySQL de l'application, son utilisateur dédié, le schéma, puis importe database_mysql/.
//
//   DB_ADMIN_USER / DB_ADMIN_PASSWORD  compte administrateur MySQL qui crée la base et l'utilisateur
//   DB_HOST / DB_PORT                  serveur
//   DB_NAME / DB_USER / DB_PASSWORD    base et utilisateur de l'application à créer (mot de passe obligatoire)
//   DB_USER_HOST                       hôte autorisé pour l'utilisateur (défaut : localhost)
//
// Options :
//   --reset-password  aligne le mot de passe d'un utilisateur MySQL EXISTANT sur DB_PASSWORD
//   --with-tests      accorde aussi les droits sur la base jetable `cositi_test` de « npm test »
//   --force           réimporte le dump (EFFACE les données actuelles de l'application)
//
// Idempotent : ne crée que ce qui manque, rejouable sans perte (le dump n'est importé que si la base est vide).
import { config } from '../src/config.js';
import { initDb, closeDb } from '../src/db/database.js';
import { provision } from '../src/db/provision.js';
import { bootstrap, importDump } from '../src/db/seed.js';

const force = process.argv.includes('--force');
const { host, port } = config.db;

try {
  console.log(`1/3  Base et utilisateur MySQL (compte administrateur « ${config.db.admin.user || '?'} » sur ${host}:${port})…`);
  await provision({
    resetPassword: process.argv.includes('--reset-password'),
    testDatabase: process.argv.includes('--with-tests'),
    log: (m) => console.log(`     ${m}`),
  });

  console.log('2/3  Schéma (tables du dump + colonnes et tables ajoutées)…');
  await initDb({ log: (m) => console.log(`     ${m}`) });

  console.log('3/3  Données…');
  if (force) {
    const r = await importDump();
    console.log(`     réimport forcé de ${r.source}`);
    console.table(r.counts);
  } else {
    const notes = await bootstrap();
    console.log(notes.length ? notes.map((n) => `     ${n}`).join('\n') : '     base déjà alimentée : rien à importer (utilisez --force pour réimporter le dump).');
  }
  await closeDb();
  console.log('Terminé. Lancez l\'API avec « npm start » puis ouvrez http://localhost:4000/api/docs');
} catch (e) {
  console.error(`ÉCHEC : ${e.message}`);
  await closeDb().catch(() => {});
  process.exit(1);
}
