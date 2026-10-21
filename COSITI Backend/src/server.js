import { config } from './config.js';
import { initDb, closeDb } from './db/database.js';
import { bootstrap } from './db/seed.js';
import { createApp } from './app.js';

// Le serveur HTTP n'écoute qu'une fois la base prête (connexion, base, tables, données initiales).
try {
  console.log(`[db] Initialisation MySQL (${config.db.user}@${config.db.host}:${config.db.port}/${config.db.name})…`);
  await initDb({ log: (m) => console.log(`[db] ${m}`) });
  const notes = await bootstrap();
  notes.forEach((n) => console.log(`[bootstrap] ${n}`));
  console.log(`[db] Base « ${config.db.name} » prête.`);
} catch (e) {
  console.error(`[db] ÉCHEC de l'initialisation de la base — serveur non démarré.\n${e.message}`);
  process.exit(1);
}

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`COSITI API prête sur http://localhost:${config.port}/api  (env: ${config.env})`);
  console.log(`Documentation Swagger : http://localhost:${config.port}/api/docs`);
});

function shutdown(signal) {
  console.log(`\n${signal} reçu : arrêt en cours...`);
  server.close(async () => {
    await closeDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (r) => console.error('unhandledRejection', r));
