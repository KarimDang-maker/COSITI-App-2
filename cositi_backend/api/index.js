import { createApp } from '../src/app.js';
import { initDb } from '../src/db/database.js';

const app = createApp();
let dbInitialization;

// Vercel peut réutiliser une instance : initialiser la base une seule fois par instance.
export default async function handler(req, res) {
  dbInitialization ??= initDb({ log: (message) => console.log(`[db] ${message}`) }).catch((error) => {
    dbInitialization = undefined;
    throw error;
  });
  await dbInitialization;
  return app(req, res);
}
