// Harnais commun des tests d'intégration : base MySQL jetable (une par fichier), dump importé, vrai serveur HTTP.
// Le compte MySQL doit pouvoir créer / supprimer les bases `cositi_test*` (npm run db:setup -- --with-tests).
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';

export const PW = 'Cositi@2026!';
export const SA = { email: 'superadmin@cositi-ci.org', password: 'SuperAdmin@2026!' };
export const CONFIRM = { 'X-Confirmation-Code': '0000' };

export async function boot(dbName) {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    BCRYPT_ROUNDS: '4',
    SEED_FROM_DUMP: 'true',
    SEED_DEFAULT_PASSWORD: PW,
    SEED_FORCE_PASSWORD_CHANGE: 'false',
    MAX_LOGIN_ATTEMPTS: '5',
    CORS_ORIGINS: 'http://localhost:3000',
    LOGIN_RATE_LIMIT: '100000',
    REFRESH_RATE_LIMIT: '100000',
    API_RATE_LIMIT: '1000000',
    DB_NAME: dbName,
    SUPERADMIN_EMAIL: SA.email,
    SUPERADMIN_PASSWORD: SA.password,
  });
  const { config } = await import('../src/config.js');
  const admin = await mysql.createConnection({ host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password });
  await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await admin.end();

  const db = await import('../src/db/database.js');
  const seed = await import('../src/db/seed.js');
  const { createApp } = await import('../src/app.js');
  await db.initDb();
  await seed.bootstrap();
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  /** Appel JSON → { status, body, data, headers } */
  async function call(method, path, { token, body, headers = {}, query } = {}) {
    const res = await fetch(`${base}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json, data: json?.data, headers: res.headers };
  }

  /** Appel binaire (téléchargement / envoi de fichier) → { status, buffer, json, headers } */
  async function callBinary(method, path, { token, body, headers = {} } = {}) {
    const res = await fetch(`${base}/api${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body,
    });
    const buffer = Buffer.from(await res.arrayBuffer());
    let json = null;
    if ((res.headers.get('content-type') || '').includes('json')) json = JSON.parse(buffer.toString('utf8'));
    return { status: res.status, buffer, json, headers: res.headers };
  }

  const sessions = {};
  async function login(email, password = PW) {
    if (sessions[email]) return sessions[email];
    const r = await call('POST', '/auth/login', { body: { email, password } });
    assert.equal(r.status, 200, `connexion ${email} : ${JSON.stringify(r.body)}`);
    sessions[email] = r.data.accessToken;
    return sessions[email];
  }
  const tokens = {
    sa: () => login(SA.email, SA.password),
    dg: () => login('dg@cositi-ci.org'),
    dga: () => login('dga@cositi-ci.org'),
    daf: () => login('daf@cositi-ci.org'),
    caisse: () => login('caisse@cositi-ci.org'),
    pca: () => login('pca@cositi-ci.org'),
    cs: () => login('surveillance@cositi-ci.org'),
  };

  return {
    base, call, callBinary, login, tokens, config, db,
    query: db.query,
    /** Simule un redémarrage du serveur : le pool MySQL est fermé puis rouvert, tout est relu depuis la base. */
    async restartDb() {
      await db.closeDb();
      await db.initDb();
    },
    async close() {
      server.close();
      await db.closeDb();
    },
  };
}
