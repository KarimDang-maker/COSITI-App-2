// npm run db:seed : réimporte database_mysql/ (EFFACE toutes les données actuelles)
import { initDb, closeDb } from './database.js';
import { importDump } from './seed.js';

await initDb();
const r = await importDump();
console.log(`Import terminé depuis ${r.source}`);
console.table(r.counts);
console.log(`Bulletins détaillés : ${r.bulletinsDetailles}${r.bulletinsEcarts.length ? ` (écarts : ${JSON.stringify(r.bulletinsEcarts)})` : ''}`);
await closeDb();
