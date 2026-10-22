// Tests d'intégration de bout en bout : vrai serveur HTTP + vraie base MySQL (base jetable `cositi_test`,
// recréée à chaque exécution et alimentée par l'import du dossier database_mysql/).
//
// Connexion : variables DB_HOST / DB_PORT / DB_USER / DB_PASSWORD (.env ou environnement). Le compte doit pouvoir
// créer et supprimer la base `cositi_test`. Ex. :  DB_USER=root DB_PASSWORD=... npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';

process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4';
process.env.SEED_FROM_DUMP = 'true';
process.env.SEED_DEFAULT_PASSWORD = 'Cositi@2026!';
process.env.SEED_FORCE_PASSWORD_CHANGE = 'false';
process.env.MAX_LOGIN_ATTEMPTS = '5';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.LOGIN_RATE_LIMIT = '100000'; // le test enchaîne des centaines de connexions depuis la même IP
process.env.REFRESH_RATE_LIMIT = '100000';
process.env.API_RATE_LIMIT = '1000000';
process.env.DB_NAME = 'cositi_test';
process.env.SUPERADMIN_EMAIL = 'superadmin@cositi-ci.org';
process.env.SUPERADMIN_PASSWORD = 'SuperAdmin@2026!';

const { config } = await import('../src/config.js');
{
  // base jetable : on repart toujours d'une base vide
  const admin = await mysql.createConnection({ host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password });
  await admin.query('DROP DATABASE IF EXISTS `cositi_test`');
  await admin.end();
}
const { initDb, closeDb, query } = await import('../src/db/database.js');
const { bootstrap } = await import('../src/db/seed.js');
const { createApp } = await import('../src/app.js');

let server;
let base;
const NEW_PW = 'Nouveau@Pass1';
const DEFAULT_PW = 'Cositi@2026!';
const sessions = {};

async function call(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json, data: json?.data };
}
const PIN = { 'X-Confirmation-Code': '0000' };

/** Connexion d'un compte importé du dump (identifiants créés en base à l'import) */
async function as(key, email) {
  if (sessions[key]) return sessions[key];
  const login = await call('POST', '/auth/login', { body: { email, password: DEFAULT_PW } });
  assert.equal(login.status, 200, `login ${email} : ${JSON.stringify(login.body)}`);
  sessions[key] = login.data.accessToken;
  return sessions[key];
}
const dg = () => as('dg', 'dg@cositi-ci.org');
const daf = () => as('daf', 'daf@cositi-ci.org');
const caisse = () => as('caisse', 'caisse@cositi-ci.org');
const pca = () => as('pca', 'pca@cositi-ci.org');
/** Super Administrateur : seul habilité à créer des comptes et à modifier les identifiants */
async function sa() {
  if (sessions.sa) return sessions.sa;
  const l = await call('POST', '/auth/login', { body: { email: 'superadmin@cositi-ci.org', password: 'SuperAdmin@2026!' } });
  assert.equal(l.status, 200, JSON.stringify(l.body));
  sessions.sa = l.data.accessToken;
  return sessions.sa;
}

before(async () => {
  await initDb();
  await bootstrap();
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.close();
  await closeDb();
});

/* --------------------------------------------- DONNÉES = DUMP database_mysql */
test('la base contient exactement les données du dump database_mysql/', async () => {
  const token = await daf();
  const total = async (p) => (await call('GET', `${p}${p.includes('?') ? '&' : '?'}pageSize=500`, { token })).body.meta.total;
  assert.equal(await total('/adherents'), 7);
  assert.equal(await total('/cotisations'), 17);
  assert.equal(await total('/gestionnaires'), 3);
  assert.equal(await total('/dossiers'), 2);
  assert.equal(await total('/depenses'), 6);
  assert.equal(await total('/versements'), 3);
  assert.equal(await total('/frais-mobile-money'), 5);
  assert.equal(await total('/employes'), 6);
  assert.equal(await total('/paie/bulletins'), 14);
  assert.equal((await call('GET', '/banques', { token })).data.length, 8);
  const comptes = (await call('GET', '/utilisateurs', { token })).data;
  assert.equal(comptes.length, 7, '6 comptes du dump + le Super Administrateur');
  assert.ok(comptes.some((u) => u.role === 'Super Administrateur'));
  // tables absentes du dump : vides
  for (const p of ['/partenaires', '/rendez-vous', '/notes-direction', '/rapports-reunions', '/rapports-agents']) {
    assert.equal(await total(p), 0, p);
  }

  const cot = (await call('GET', '/cotisations?pageSize=500', { token })).body;
  assert.equal(cot.meta.totalMontant, 102400, 'somme des cotisations du dump');
  const dep = (await call('GET', '/depenses?pageSize=500', { token })).data.reduce((s, d) => s + d.montant, 0);
  assert.equal(dep, 378000);
  const vrs = (await call('GET', '/versements?pageSize=500', { token })).data.reduce((s, d) => s + d.montant, 0);
  assert.equal(vrs, 360000);

  const adh = (await call('GET', '/adherents/COSITI-0002', { token })).data;
  assert.equal(adh.nom, 'KOUAMÉ');
  assert.equal(adh.numeroCnps, 'CNPS-2026-98432');
  assert.equal(adh.dateNaissance, '1990-03-24');
  assert.equal(adh.gestionnaireNom, 'MBIDA François (GP-001)');
  assert.equal(adh.cotisations.length, 3);
  const dossier = adh.dossiers[0];
  assert.equal(dossier.statut, 'Dossier incomplet');
  assert.equal(dossier.pieces.length, 8);
  assert.equal(dossier.historique.length, 3);
  assert.equal(dossier.createdAt, '2026-02-20T14:30:00.000Z', 'horodatages ISO du dump conservés');

  const p = (await call('GET', '/parametres', { token })).data;
  assert.equal(p.seuilImmatriculation, 15000);
  assert.deepEqual(p.montantsCotisationDefauts, [700, 1000]);
  assert.deepEqual(p.joursVerification, [15, 30]);
  assert.equal(p.dernierNumeroMatricule, 7);

  // les actions historiques du dump (sans identifiant) sont rattachées à leur auteur par le nom
  const dgAct = await call('GET', '/utilisateurs/u-dg/activite', { token: await sa() });
  assert.ok(dgAct.data.some((e) => e.typeOperation === 'MODIFICATION_DOSSIER' && e.matricule === 'COSITI-0007'));
});

test('identifiants de connexion en base : mots de passe hachés, aucun PIN de compte, aucun secret en clair', async () => {
  const users = await query('SELECT email, password_hash, pin_hash, code_pin, code_acces FROM utilisateurs');
  assert.equal(users.length, 7);
  for (const u of users) {
    assert.match(u.password_hash, /^\$2[aby]\$\d{2}\$/, `${u.email} : mot de passe haché`);
    assert.equal(u.pin_hash, null, `${u.email} : plus de code PIN de compte`);
    assert.equal(u.code_pin, null);
    assert.equal(u.code_acces, null);
  }
  const [par] = await query('SELECT code_confirmation_securite AS clair, code_confirmation_hash AS hash FROM parametres WHERE id = 1');
  assert.equal(par.clair, '', 'le « 0000 » en clair du dump est effacé');
  assert.match(par.hash, /^\$2[aby]\$/);
  // les 6 comptes du dump se connectent avec les identifiants créés
  for (const e of ['dg', 'dga', 'daf', 'caisse', 'pca', 'surveillance']) {
    const r = await call('POST', '/auth/login', { body: { email: `${e}@cositi-ci.org`, password: DEFAULT_PW } });
    assert.equal(r.status, 200, e);
    assert.equal(r.data.mustChangePassword, false);
  }
});

/* ------------------------------------------------------------------ AUTH */
test('health est public', async () => {
  const r = await call('GET', '/systeme/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
});

test('les routes protégées exigent un jeton', async () => {
  assert.equal((await call('GET', '/adherents')).status, 401);
  assert.equal((await call('GET', '/adherents', { token: 'abc.def.ghi' })).status, 401);
});

test('login : réponse complète (jetons, profil, droits, modules) et aucun secret', async () => {
  const r = await call('POST', '/auth/login', { body: { email: 'DG@Cositi-CI.org', password: DEFAULT_PW } });
  assert.equal(r.status, 200, 'e-mail insensible à la casse');
  assert.ok(r.data.accessToken.split('.').length === 3);
  assert.ok(r.data.refreshToken.length > 40);
  assert.equal(r.data.user.role, 'DG');
  assert.equal(r.data.permissions.canManageUsers, false, 'les comptes sont gérés par le Super Administrateur');
  assert.equal(r.data.permissions.canAuditUsers, true);
  assert.equal(r.data.modules.length, 18);
  const txt = JSON.stringify(r.data);
  assert.equal(txt.includes('passwordHash') || txt.includes('pinHash') || /\$2[aby]\$/.test(txt), false);
  const me = await call('GET', '/auth/me', { token: r.data.accessToken });
  assert.equal(me.data.user.email, 'dg@cositi-ci.org');
});

test('login : mauvais mot de passe et compte inconnu donnent le même message', async () => {
  const a = await call('POST', '/auth/login', { body: { email: 'dg@cositi-ci.org', password: 'mauvais' } });
  const b = await call('POST', '/auth/login', { body: { email: 'inconnu@x.org', password: 'mauvais' } });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.body.error, b.body.error);
  assert.equal((await call('POST', '/auth/login', { body: { email: 'pas-un-email', password: 'x' } })).status, 400);
  assert.equal((await call('POST', '/auth/login', { body: {} })).status, 400);
});

test('mot de passe temporaire : tout est bloqué jusqu\'au changement', async () => {
  const t = await sa();
  const created = await call('POST', '/utilisateurs', { token: t, body: { nom: 'Compte Temporaire', email: 'temp@cositi-ci.org', role: 'Agent de consultation', password: 'Temp@Pass1' } });
  assert.equal(created.status, 201);
  assert.equal(created.data.mustChangePassword, true);

  const login = await call('POST', '/auth/login', { body: { email: 'temp@cositi-ci.org', password: 'Temp@Pass1' } });
  assert.equal(login.status, 200);
  assert.equal(login.data.mustChangePassword, true);
  const blocked = await call('GET', '/adherents', { token: login.data.accessToken });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'PASSWORD_CHANGE_REQUIRED');
  assert.equal((await call('GET', '/auth/me', { token: login.data.accessToken })).status, 200);

  const weak = await call('POST', '/auth/change-password', { token: login.data.accessToken, body: { currentPassword: 'Temp@Pass1', newPassword: 'faible' } });
  assert.equal(weak.status, 400);
  const wrong = await call('POST', '/auth/change-password', { token: login.data.accessToken, body: { currentPassword: 'pas-le-bon', newPassword: NEW_PW } });
  assert.equal(wrong.status, 403);
  const same = await call('POST', '/auth/change-password', { token: login.data.accessToken, body: { currentPassword: 'Temp@Pass1', newPassword: 'Temp@Pass1' } });
  assert.equal(same.status, 400);
  const ok = await call('POST', '/auth/change-password', { token: login.data.accessToken, body: { currentPassword: 'Temp@Pass1', newPassword: NEW_PW } });
  assert.equal(ok.status, 200);
  // l'ancien jeton est révoqué, le nouveau fonctionne, l'ancien mot de passe ne marche plus
  assert.equal((await call('GET', '/auth/me', { token: login.data.accessToken })).status, 401);
  assert.equal((await call('GET', '/adherents', { token: ok.data.accessToken })).status, 200);
  assert.equal((await call('POST', '/auth/login', { body: { email: 'temp@cositi-ci.org', password: 'Temp@Pass1' } })).status, 401);
  assert.equal((await call('POST', '/auth/login', { body: { email: 'temp@cositi-ci.org', password: NEW_PW } })).status, 200);
});

test('refresh : rotation, et la réutilisation d\'un ancien jeton révoque toute la session', async () => {
  const l = await call('POST', '/auth/login', { body: { email: 'pca@cositi-ci.org', password: DEFAULT_PW } });
  const r1 = l.data.refreshToken;
  const second = await call('POST', '/auth/refresh', { body: { refreshToken: r1 } });
  assert.equal(second.status, 200);
  assert.notEqual(second.data.refreshToken, r1);
  assert.equal((await call('GET', '/auth/me', { token: second.data.accessToken })).status, 200);
  const replay = await call('POST', '/auth/refresh', { body: { refreshToken: r1 } });
  assert.equal(replay.status, 401);
  const afterTheft = await call('POST', '/auth/refresh', { body: { refreshToken: second.data.refreshToken } });
  assert.equal(afterTheft.status, 401, 'la famille entière est coupée');
  assert.equal((await call('POST', '/auth/refresh', { body: { refreshToken: 'x'.repeat(64) } })).status, 401);
});

test('refresh : deux requêtes simultanées avec le même jeton, une seule réussit', async () => {
  const l = await call('POST', '/auth/login', { body: { email: 'pca@cositi-ci.org', password: DEFAULT_PW } });
  const rs = await Promise.all([1, 2, 3].map(() => call('POST', '/auth/refresh', { body: { refreshToken: l.data.refreshToken } })));
  assert.equal(rs.filter((r) => r.status === 200).length, 1);
});

test('logout révoque le refresh token', async () => {
  const l = await call('POST', '/auth/login', { body: { email: 'pca@cositi-ci.org', password: DEFAULT_PW } });
  const out = await call('POST', '/auth/logout', { token: l.data.accessToken, body: { refreshToken: l.data.refreshToken } });
  assert.equal(out.status, 200);
  assert.equal((await call('POST', '/auth/refresh', { body: { refreshToken: l.data.refreshToken } })).status, 401);
});

test('verrouillage du compte après 5 échecs ; la réinitialisation par le Super Administrateur le lève', async () => {
  const t = await sa();
  const email = 'verrou@cositi-ci.org';
  const created = await call('POST', '/utilisateurs', { token: t, body: { nom: 'Compte Verrou', email, role: 'Agent de consultation', password: 'Verrou@Pass1', mustChangePassword: false } });
  assert.equal(created.status, 201);
  let last;
  for (let i = 0; i < 5; i++) last = await call('POST', '/auth/login', { body: { email, password: 'faux-mot-de-passe' } });
  assert.equal(last.status, 401);
  const locked = await call('POST', '/auth/login', { body: { email, password: 'Verrou@Pass1' } });
  assert.equal(locked.status, 423, 'même le bon mot de passe est refusé pendant le verrouillage');
  const reset = await call('POST', `/utilisateurs/${created.data.id}/reset-password`, { token: t, body: { newPassword: 'Reset@Pass1', mustChangePassword: false } });
  assert.equal(reset.status, 200);
  const again = await call('POST', '/auth/login', { body: { email, password: 'Reset@Pass1' } });
  assert.equal(again.status, 200);
  assert.equal(again.data.mustChangePassword, false);
});

test('un compte désactivé ne peut plus se connecter et ses jetons sont révoqués', async () => {
  const t = await sa();
  const email = 'desactive@cositi-ci.org';
  const c = await call('POST', '/utilisateurs', { token: t, body: { nom: 'Compte Desactive', email, role: 'Agent de consultation', password: 'Desact@Pass1', mustChangePassword: false } });
  const l = await call('POST', '/auth/login', { body: { email, password: 'Desact@Pass1' } });
  assert.equal(l.status, 200);
  assert.equal((await call('PUT', `/utilisateurs/${c.data.id}`, { token: t, body: { actif: false } })).status, 200);
  assert.equal((await call('GET', '/auth/me', { token: l.data.accessToken })).status, 401, 'jeton révoqué');
  assert.equal((await call('POST', '/auth/refresh', { body: { refreshToken: l.data.refreshToken } })).status, 401);
  assert.equal((await call('POST', '/auth/login', { body: { email, password: 'Desact@Pass1' } })).status, 403);
});

/* ------------------------------------------------------- GESTION COMPTES */
test('création de compte : mass assignment impossible, doublon e-mail refusé, droits requis', async () => {
  const t = await sa();
  const body = { nom: 'Test User', email: 'Test.User@Cositi.org', role: 'Agent de consultation', password: 'Valide@Pass1', passwordHash: 'hack', tokenVersion: 99, id: 'u-hack' };
  const r = await call('POST', '/utilisateurs', { token: t, body });
  assert.equal(r.status, 201);
  assert.equal(r.data.email, 'test.user@cositi.org');
  assert.notEqual(r.data.id, 'u-hack');
  assert.equal(r.data.passwordHash, undefined);
  assert.equal((await call('POST', '/utilisateurs', { token: t, body })).status, 409);
  assert.equal((await call('POST', '/utilisateurs', { token: await pca(), body: { ...body, email: 'x@y.org' } })).status, 403);
  for (const t2 of [await dg(), await daf()]) {
    assert.equal((await call('POST', '/utilisateurs', { token: t2, body: { ...body, email: 'z@y.org' } })).status, 403, 'DG / DAF ne créent plus de comptes');
  }
});

test('un utilisateur ne peut pas s\'auto-promouvoir', async () => {
  const t = await pca();
  const me = (await call('GET', '/auth/me', { token: t })).data.user;
  const r = await call('PUT', `/utilisateurs/${me.id}`, { token: t, body: { role: 'DG', typeAcces: 'Administrateur et consultation', nom: 'PCA Renommé' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.role, 'PCA');
  assert.equal(r.data.nom, 'PCA Renommé');
});

test('le Super Administrateur ne peut ni se supprimer ni se désactiver', async () => {
  const t = await sa();
  const me = (await call('GET', '/auth/me', { token: t })).data.user;
  assert.equal((await call('DELETE', `/utilisateurs/${me.id}`, { token: t, headers: PIN })).status, 400);
  assert.equal((await call('PUT', `/utilisateurs/${me.id}`, { token: t, body: { actif: false } })).status, 400);
});

test('aucune bascule de session par code PIN : un compte = une personne, connexion par e-mail + mot de passe', async () => {
  const t = await dg();
  const target = (await call('GET', '/utilisateurs', { token: t })).data.find((u) => u.role === 'DAF');
  // l'ancien endpoint n'existe plus, quel que soit le code envoyé (même l'ancien PIN 1111)
  for (const code of ['1111', '9999']) {
    assert.equal((await call('POST', '/auth/switch-user', { token: t, body: { userId: target.id, code } })).status, 404);
  }
  assert.equal((await call('PUT', `/utilisateurs/${target.id}/code-acces`, { token: await sa(), body: { codeAcces: '1357' } })).status, 404);
  // la session reste celle du DG et n'expose aucune notion de PIN
  const me = await call('GET', '/auth/me', { token: t });
  assert.equal(me.data.user.role, 'DG');
  assert.equal(JSON.stringify(me.body).includes('hasPin'), false);
});

/* -------------------------------------------------------------- ADHERENTS */
let adh;
const newAdh = (over = {}) => ({ nom: 'Dupont', prenom: 'Jean', telephone: '+237 600 00 00 01', profession: 'Tailleur', cni: 'CNI-TEST-001', ...over });

test('création d\'adhérent : matricule généré, défauts appliqués, doublon CNI refusé', async () => {
  const t = await caisse().catch(() => null);
  const token = t || (await dg());
  const r = await call('POST', '/adherents', { token, body: newAdh() });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  adh = r.data;
  assert.equal(adh.matricule, 'COSITI-0008');
  assert.equal(adh.nom, 'DUPONT');
  assert.equal(adh.statut, 'Actif');
  assert.equal(adh.tarifJournalier, 700);
  assert.equal(adh.statutImmatriculation, 'Non immatriculé');
  const dup = await call('POST', '/adherents', { token, body: newAdh({ prenom: 'Autre' }) });
  assert.equal(dup.status, 409);
  const invalid = await call('POST', '/adherents', { token, body: { nom: 'X' } });
  assert.equal(invalid.status, 400);
  assert.ok(Array.isArray(invalid.body.details));
});

test('modification d\'adhérent : code de confirmation obligatoire, matricule inaltérable, pas d\'écrasement par défaut', async () => {
  const token = await daf();
  assert.equal((await call('PUT', `/adherents/${adh.id}`, { token, body: { telephone: '+237 611 11 11 11' } })).status, 400);
  assert.equal((await call('PUT', `/adherents/${adh.id}`, { token, body: { telephone: '+237 611 11 11 11' }, headers: { 'X-Confirmation-Code': '1234' } })).status, 403);
  const r = await call('PUT', `/adherents/${adh.id}`, { token, body: { telephone: '+237 611 11 11 11', matricule: 'COSITI-9999', pinCode: '0000' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.matricule, 'COSITI-0008');
  assert.equal(r.data.telephone, '+237 611 11 11 11');
  assert.equal(r.data.tarifJournalier, 700);
  assert.equal(r.data.statut, 'Actif');
  assert.equal(r.data.pinCode, undefined, 'le code ne doit jamais être persisté');
});

test('liste d\'adhérents : pagination, recherche, filtre, stats, et injection SQL inoffensive', async () => {
  const token = await caisse();
  const list = await call('GET', '/adherents?pageSize=3&page=1', { token });
  assert.equal(list.status, 200);
  assert.equal(list.data.length, 3);
  assert.equal(list.body.meta.total, 8);
  const q = await call('GET', '/adherents?q=dupont&stats=true', { token });
  assert.equal(q.data.length, 1);
  assert.ok(q.data[0].stats);
  const inj = await call('GET', `/adherents?q=${encodeURIComponent("'; DROP TABLE adherents; --")}`, { token });
  assert.equal(inj.status, 200);
  assert.equal(inj.data.length, 0);
  assert.equal((await call('GET', '/adherents?pageSize=3', { token })).body.meta.total, 8, 'la table existe toujours');
  const retard = await call('GET', '/adherents?statutCotisation=En%20retard', { token });
  assert.equal(retard.status, 200);
  assert.equal((await call('GET', '/adherents?statut=Bidon', { token })).status, 400);
});

test('statut d\'adhérent : réservé à la direction', async () => {
  assert.equal((await call('PATCH', `/adherents/${adh.id}/statut`, { token: await caisse(), body: { statut: 'Suspendu' } })).status, 403);
  const r = await call('PATCH', `/adherents/${adh.id}/statut`, { token: await daf(), body: { statut: 'Suspendu', motif: 'Impayés' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.statut, 'Suspendu');
  await call('PATCH', `/adherents/${adh.id}/statut`, { token: await daf(), body: { statut: 'Actif' } });
});

/* ------------------------------------------------------------ COTISATIONS */
test('cotisation : validation, référence unique, seuil de 15 000 FCFA => éligible', async () => {
  const token = await caisse();
  const base = { adherentId: adh.id, datePaiement: '2026-03-10', modePaiement: 'Wave', reference: 'WAVE-T-1' };
  assert.equal((await call('POST', '/cotisations', { token, body: { ...base, montant: -5 } })).status, 400);
  assert.equal((await call('POST', '/cotisations', { token, body: { ...base, montant: 5000, modePaiement: 'Bitcoin' } })).status, 400);
  assert.equal((await call('POST', '/cotisations', { token, body: { ...base, adherentId: 'adh-inconnu', montant: 5000 } })).status, 404);

  const c1 = await call('POST', '/cotisations', { token, body: { ...base, montant: 10000 } });
  assert.equal(c1.status, 201);
  assert.equal(c1.data.matricule, adh.matricule);
  assert.equal(c1.data.adherentNomPrenom, 'DUPONT Jean');
  assert.equal(c1.data.mois, 'Mars');
  assert.equal(c1.data.annee, 2026);
  assert.equal(c1.data.agentEnregistreur.length > 0, true);
  assert.equal((await call('POST', '/cotisations', { token, body: { ...base, montant: 3000 } })).status, 409, 'référence en double');
  assert.equal((await call('GET', `/adherents/${adh.id}`, { token })).data.statutImmatriculation, 'Non immatriculé');

  const c2 = await call('POST', '/cotisations', { token, body: { adherentId: adh.id, datePaiement: '2026-03-11', modePaiement: 'Espèces', montant: 5000 } });
  assert.equal(c2.status, 201);
  assert.match(c2.data.reference, /^REC-20260311-\d{4}$/);
  const updated = (await call('GET', `/adherents/${adh.id}`, { token })).data;
  assert.equal(updated.statutImmatriculation, 'Éligible (seuil atteint)');
  assert.equal(updated.cotisations.length, 2);
  globalThis.__cot = c2.data;
});

test('cotisation : modification/suppression exigent droit + code ; la caissière ne supprime pas', async () => {
  const c = globalThis.__cot;
  assert.equal((await call('DELETE', `/cotisations/${c.id}`, { token: await caisse(), headers: PIN })).status, 403);
  assert.equal((await call('PUT', `/cotisations/${c.id}`, { token: await caisse(), body: { montant: 5500 } })).status, 400, 'code manquant');
  const up = await call('PUT', `/cotisations/${c.id}`, { token: await caisse(), body: { montant: 5500, pinCode: '0000', adherentId: 'pirate' } });
  assert.equal(up.status, 200);
  assert.equal(up.data.montant, 5500);
  assert.equal(up.data.adherentId, adh.id, 'le rattachement ne peut pas être modifié');
  assert.equal((await call('PUT', `/cotisations/${c.id}`, { token: await pca(), body: { montant: 1 }, headers: PIN })).status, 403);
});

test('suppression d\'un adhérent ayant des cotisations refusée (intégrité comptable)', async () => {
  const r = await call('DELETE', `/adherents/${adh.id}`, { token: await dg(), headers: PIN });
  assert.equal(r.status, 409);
});

test('régularisation : réservée DAF/DGA/DG, motif obligatoire', async () => {
  const payload = { adherentId: adh.id, montant: 7000, modePaiement: 'Espèces', datePaiement: '2026-01-20', mois: 'Janvier', annee: 2026, typeRegularisation: 'Rattrapage arriérés (depuis Juillet)', motifRegularisation: 'Arriérés de janvier' };
  assert.equal((await call('POST', '/cotisations/regulariser', { token: await caisse(), body: payload })).status, 403);
  assert.equal((await call('POST', '/cotisations/regulariser', { token: await daf(), body: { ...payload, motifRegularisation: '' } })).status, 400);
  const r = await call('POST', '/cotisations/regulariser', { token: await daf(), body: payload });
  assert.equal(r.status, 201);
  assert.equal(r.data.estRegularisation, true);
  assert.match(r.data.reference, /^REG-/);
  const compl = await call('POST', '/cotisations/regulariser', { token: await daf(), body: { cotisationId: r.data.id, adherentId: adh.id, montant: 8000, modePaiement: 'Espèces', datePaiement: '2026-01-20', mois: 'Janvier', annee: 2026, typeRegularisation: 'Complément de montant antérieur', motifRegularisation: 'Complément reçu' } });
  assert.equal(compl.status, 201);
  assert.equal(compl.data.montant, 8000);
  assert.equal(compl.data.montantAnterieurInitial, 7000);
  assert.equal(compl.data.montantComplementaire, 1000);
});

test('liste des cotisations : filtres et total', async () => {
  const token = await caisse();
  const r = await call('GET', `/cotisations?adherentId=${adh.id}&du=2026-03-01&au=2026-03-31`, { token });
  assert.equal(r.status, 200);
  assert.equal(r.body.meta.total, 2);
  assert.equal(r.body.meta.totalMontant, 10000 + 5500);
});

/* ----------------------------------------------- IMMATRICULATION / DOSSIERS */
test('immatriculation : crée le dossier, doublon CNPS refusé, alerte dossier puis levée "sans enfant"', async () => {
  const token = await daf();
  const alerts0 = (await call('GET', '/alertes', { token })).data;
  assert.ok(alerts0.some((a) => a.type === 'SEUIL_15000_ATTEINT' && a.adherentId === adh.id));

  assert.equal((await call('POST', `/adherents/${adh.id}/immatriculer`, { token: await pca(), body: { numeroCnps: 'CNPS-TEST-1' } })).status, 403);
  assert.equal((await call('POST', `/adherents/${adh.id}/immatriculer`, { token, body: { numeroCnps: 'CNPS-2026-98432' } })).status, 409, 'déjà attribué à un autre');
  const r = await call('POST', `/adherents/${adh.id}/immatriculer`, { token, body: { numeroCnps: 'CNPS-TEST-1', dateImmatriculation: '2026-03-12' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.statutImmatriculation, 'Immatriculé');

  const dossiers = await call('GET', `/dossiers?adherentId=${adh.id}`, { token });
  assert.equal(dossiers.data.length, 1);
  assert.equal(dossiers.data[0].statut, 'Dossier non commencé');
  assert.ok(dossiers.data[0].pieces.length >= 8);

  const alerts1 = (await call('GET', '/alertes', { token })).data;
  assert.ok(alerts1.some((a) => a.type === 'DOSSIER_ALLOCATIONS' && a.adherentId === adh.id));
  assert.equal(alerts1.some((a) => a.type === 'SEUIL_15000_ATTEINT' && a.adherentId === adh.id), false);

  const se = await call('POST', `/adherents/${adh.id}/sans-enfant`, { token, body: { motif: 'Célibataire' } });
  assert.equal(se.status, 200);
  const alerts2 = (await call('GET', '/alertes', { token })).data;
  assert.equal(alerts2.some((a) => a.type === 'DOSSIER_ALLOCATIONS' && a.adherentId === adh.id), false);
  const d = (await call('GET', `/dossiers?adherentId=${adh.id}`, { token })).data[0];
  assert.equal(d.statut, 'Sans enfant (Non éligible allocations)');
});

test('dossier : mise à jour avec historique, dates automatiques, synchro adhérent', async () => {
  const token = await caisse();
  const d = (await call('GET', '/dossiers', { token })).data.find((x) => x.matricule === 'COSITI-0002');
  const r = await call('PUT', `/dossiers/${d.id}`, { token, body: { statut: 'Dossier transmis', nombreEnfants: 3, noteAction: 'Transmission CNPS' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.statut, 'Dossier transmis');
  assert.ok(r.data.dateTransmission);
  assert.equal(r.data.historique[0].action, 'Transmission CNPS');
  assert.equal(r.data.historique.length, d.historique.length + 1);
  assert.equal((await call('GET', '/adherents/adh-2', { token })).data.nombreEnfants, 3);
  assert.equal((await call('PUT', `/dossiers/${d.id}`, { token: await pca(), body: { statut: 'Dossier traité' } })).status, 403);
});

/* ---------------------------------------------------------------- FINANCES */
test('finances : réservées à la direction financière', async () => {
  for (const p of ['/depenses', '/versements', '/frais-mobile-money', '/employes', '/paie/bulletins']) {
    assert.equal((await call('GET', p, { token: await caisse() })).status, 403, p);
    assert.equal((await call('GET', p, { token: await pca() })).status, 403, p);
    assert.equal((await call('GET', p, { token: await daf() })).status, 200, p);
  }
});

test('dépense : origine des fonds déduite, suppression avec code', async () => {
  const token = await daf();
  const r = await call('POST', '/depenses', { token, body: { date: '2026-03-10', categorie: 'Cotisations CNPS & Sécurité Sociale', motif: 'Versement CNPS mars', montant: 50000, modePaiement: 'Virement bancaire', beneficiaire: 'CNPS', numeroPiece: 'REC-CNPS-1' } });
  assert.equal(r.status, 201);
  assert.equal(r.data.origineFonds, 'Exploitation (Cotisations CNPS)');
  assert.equal(r.data.statut, 'Payé');
  const r2 = await call('POST', '/depenses', { token, body: { date: '2026-03-10', categorie: 'Loyer & Charges locatives', motif: 'Loyer', montant: 1000, modePaiement: 'Chèque', beneficiaire: 'SCI', numeroPiece: 'L-1' } });
  assert.equal(r2.data.origineFonds, 'Apport personnel du PCA');
  assert.equal((await call('DELETE', `/depenses/${r2.data.id}`, { token })).status, 400);
  assert.equal((await call('DELETE', `/depenses/${r2.data.id}`, { token, headers: PIN })).status, 200);
  assert.equal((await call('POST', '/depenses', { token, body: { date: '2026-03-10', categorie: 'Inexistante', motif: 'x', montant: 1, modePaiement: 'Chèque', beneficiaire: 'x', numeroPiece: 'x' } })).status, 400);
});

test('frais mobile money : net calculé par le serveur, frais > transaction refusé', async () => {
  const token = await daf();
  const base = { date: '2026-03-10', operateur: 'Wave', typeFrais: 'Commission prélevée sur encaissement', referenceTransaction: 'W-TX-1' };
  const r = await call('POST', '/frais-mobile-money', { token, body: { ...base, montantTransaction: 10000, fraisPreleves: 100, montantNet: 999999 } });
  assert.equal(r.status, 201);
  assert.equal(r.data.montantNet, 9900);
  assert.equal((await call('POST', '/frais-mobile-money', { token, body: { ...base, montantTransaction: 100, fraisPreleves: 500 } })).status, 400);
  const up = await call('PUT', `/frais-mobile-money/${r.data.id}`, { token, body: { fraisPreleves: 200 } });
  assert.equal(up.data.montantNet, 9800);
});

test('versement bancaire : points d\'arrêt et tranche calculés, cotisations en attente', async () => {
  const token = await daf();
  const r = await call('POST', '/versements', { token, body: { date: '2026-03-20', banque: 'BICICI', numeroBordereau: 'BORD-T-1', montant: 100000, sourceFonds: 'Recettes Cotisations Adhérents', deposant: 'DAF' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.ok(r.data.arretPrecedentNom, 'repère précédent déduit du dernier versement');
  assert.ok(r.data.arretCotisationNom, 'point d\'arrêt déduit');
  assert.ok(r.data.nbCotisationsIncluses > 0);
  assert.equal(r.data.statut, 'Validé');
  const att = await call('GET', '/versements/suivi/en-attente', { token });
  assert.equal(att.status, 200);
  assert.equal(att.data.nombre, 0, 'tout est versé jusqu\'au 20/03');
  await call('POST', '/cotisations', { token, body: { adherentId: adh.id, datePaiement: '2026-03-25', modePaiement: 'Espèces', montant: 2100 } });
  assert.equal((await call('GET', '/versements/suivi/en-attente', { token })).data.totalMontant, 2100);
});

/* -------------------------------------------------------------------- PAIE */
test('paie : génération (brouillon), recalcul serveur, validation idempotente + dépense unique', async () => {
  const token = await daf();
  const gen = await call('POST', '/paie/generer', { token, body: { mois: '2026-04' } });
  assert.equal(gen.status, 200);
  assert.equal(gen.data.count, 6);
  const again = await call('POST', '/paie/generer', { token, body: { mois: '2026-04' } });
  assert.equal(again.data.count, 0);
  assert.equal(again.data.ignores, 6);

  const list = (await call('GET', '/paie/bulletins?mois=2026-04&typeBeneficiaire=EMPLOYE', { token })).data;
  assert.equal(list.length, 6);
  assert.ok(list.every((b) => b.statut === 'Brouillon'));

  const b = list.find((x) => x.employeMatricule === 'EMP-004');
  const edit = await call('PUT', `/paie/bulletins/${b.id}`, { token, body: { primeRendement: 10000, netAPayer: 99999999, totalGainsBruts: 1 } });
  assert.equal(edit.status, 200);
  assert.equal(edit.data.primeRendement, 10000);
  assert.equal(edit.data.totalGainsBruts, b.totalGainsBruts + 10000);
  assert.notEqual(edit.data.netAPayer, 99999999, 'le net est recalculé, jamais pris du client');
  assert.equal(edit.data.bulletinNumero, b.bulletinNumero);

  const ga = await call('POST', '/paie/generer-adherents', { token, body: { mois: '2026-04' } });
  assert.equal(ga.status, 200);
  assert.ok(ga.data.count >= 3);

  const before = (await call('GET', '/depenses?pageSize=500', { token })).body.meta.total;
  const v1 = await call('POST', '/paie/valider', { token, body: { mois: '2026-04' } });
  assert.equal(v1.status, 200);
  assert.ok(v1.data.depenseId);
  const v2 = await call('POST', '/paie/valider', { token, body: { mois: '2026-04' } });
  assert.equal(v2.data.depenseId, v1.data.depenseId);
  assert.equal((await call('GET', '/depenses?pageSize=500', { token })).body.meta.total, before + 1, 'une seule écriture de dépense');
  const dep = (await call('GET', `/depenses/${v1.data.depenseId}`, { token })).data;
  assert.equal(dep.montant, v1.data.totalNetPersonnel);

  const locked = await call('PUT', `/paie/bulletins/${b.id}`, { token, body: { primeRendement: 1 } });
  assert.equal(locked.status, 409, 'bulletin validé verrouillé');
  assert.equal((await call('DELETE', `/depenses/${dep.id}`, { token, headers: PIN })).status, 409);
  const recap = await call('GET', '/paie/recap?mois=2026-04', { token });
  assert.equal(recap.data.personnel.nombre, 6);
});

test('paie : barème de référence (60 000 FCFA => net 56 630)', async () => {
  const token = await daf();
  const emp = (await call('GET', '/employes', { token })).data.find((e) => e.matricule === 'EMP-003');
  const r = await call('POST', '/paie/apercu', { token, body: { employeId: emp.id, mois: '2026-05', salaireBase: 60000, indemniteTransport: 0 } });
  assert.equal(r.status, 200);
  assert.equal(r.data.netAPayer, 56630);
  assert.equal(r.data.trancheLoi, 'EGAL_60K');
});

test('employé : matricule auto, suppression refusée si des bulletins existent', async () => {
  const token = await daf();
  const r = await call('POST', '/employes', { token, body: { nom: 'Nouveau', prenom: 'Emp', sexe: 'M', poste: 'Agent', departement: 'Autre', typeContrat: 'CDI', dateEmbauche: '2026-01-01', salaireBase: 80000, modePaiement: 'Espèces', telephone: '+237 6' + '0'.repeat(7) } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.match(r.data.matricule, /^EMP-\d{3}$/);
  assert.equal(r.data.actif, true);
  const old = (await call('GET', '/employes', { token })).data.find((e) => e.matricule === 'EMP-001');
  assert.equal((await call('DELETE', `/employes/${old.id}`, { token, headers: PIN })).status, 409);
  assert.equal((await call('DELETE', `/employes/${r.data.id}`, { token, headers: PIN })).status, 200);
});

/* --------------------------------------------------------------- DIRECTION */
test('notes de direction : les notes confidentielles sont invisibles hors DG/DGA', async () => {
  const note = (niveau) => ({ titre: `Note ${niveau}`, date: '2026-03-10', categorie: 'Stratégie & Partenariats', contenu: 'Contenu', pointsCles: ['a'], niveauConfidentialite: niveau });
  const conf = await call('POST', '/notes-direction', { token: await dg(), body: note('Confidentiel Direction (DG / DGA)') });
  assert.equal(conf.status, 201);
  assert.equal((await call('POST', '/notes-direction', { token: await daf(), body: note('Confidentiel Direction (DG / DGA)') })).status, 403);
  const pub = await call('POST', '/notes-direction', { token: await daf(), body: note('Direction Élargie') });
  assert.equal(pub.status, 201);

  const asDaf = (await call('GET', '/notes-direction?pageSize=100', { token: await daf() })).data;
  assert.equal(asDaf.some((n) => n.id === conf.data.id), false);
  assert.equal(asDaf.some((n) => n.id === pub.data.id), true);
  assert.equal((await call('GET', `/notes-direction/${conf.data.id}`, { token: await daf() })).status, 404);
  assert.equal((await call('GET', `/notes-direction/${conf.data.id}`, { token: await dg() })).status, 200);
  assert.equal((await call('GET', '/notes-direction', { token: await caisse() })).status, 403);
});

test('agenda : rendez-vous, partenaire lié inexistant refusé, partenaire avec RDV non supprimable', async () => {
  const token = await dg();
  assert.equal((await call('GET', '/partenaires', { token })).body.meta.total, 0, 'aucun partenaire dans le dump');
  const part = { nomOrganisation: 'CNPS Cameroun', sigle: 'CNPS', secteur: 'Caisse Sociale (CNPS)', personneContact: 'M. Atangana', titreContact: 'Directeur régional', telephone: '+237 600 00 00 10', statut: 'Premier contact établi', priorite: 'Stratégique (P1)', potentielSynergie: 'Immatriculation des adhérents' };
  const pc = await call('POST', '/partenaires', { token, body: part });
  assert.equal(pc.status, 201, JSON.stringify(pc.body));
  const p = pc.data;
  const rdv = { titre: 'Point CNPS', nomInterlocuteurOuPartenaire: 'M. X', date: '2026-04-02', heure: '09:30', modalite: 'Siège COSITI', participantsDirection: 'DG', responsablePrincipal: 'DG', statut: 'Prévu', ordreDuJour: 'Bilan', partenaireId: p.id };
  assert.equal((await call('POST', '/rendez-vous', { token, body: { ...rdv, heure: '25:99' } })).status, 400);
  assert.equal((await call('POST', '/rendez-vous', { token, body: { ...rdv, partenaireId: 'part-inconnu' } })).status, 400);
  const ok = await call('POST', '/rendez-vous', { token, body: rdv });
  assert.equal(ok.status, 201);
  assert.equal((await call('DELETE', `/partenaires/${p.id}`, { token })).status, 409);
  const up = await call('PUT', `/rendez-vous/${ok.data.id}`, { token, body: { statut: 'Tenu', compteRendu: 'RAS' } });
  assert.equal(up.data.statut, 'Tenu');
});

test('PV de réunion : un PV signé est verrouillé pour les non-directeurs', async () => {
  const pv = { titre: 'CA', typeReunion: "Conseil d'Administration", date: '2026-03-01', heureDebut: '09:00', lieu: 'Siège', presidentSeance: 'PCA', secretaireSeance: 'DG', participantsPresents: 'Tous', ordreDuJour: 'Budget', syntheseDiscussions: 'Discussion', decisions: [{ id: 'd1', description: 'Adopter', responsable: 'DAF', echeance: '2026-04-01', statut: 'À faire' }] };
  const r = await call('POST', '/rapports-reunions', { token: await daf(), body: { ...pv, statut: 'Validé & Signé' } });
  assert.equal(r.status, 201);
  assert.equal((await call('PUT', `/rapports-reunions/${r.data.id}`, { token: await daf(), body: { syntheseDiscussions: 'Modifié' } })).status, 409);
  assert.equal((await call('PUT', `/rapports-reunions/${r.data.id}`, { token: await daf(), body: { statut: 'Diffusé' } })).status, 200);
  assert.equal((await call('PUT', `/rapports-reunions/${r.data.id}`, { token: await dg(), body: { syntheseDiscussions: 'Corrigé par le DG' } })).status, 200);
});

/* --------------------------------------------------------- RAPPORTS AGENTS */
test('rapport agent : total recalculé, statut forcé, visa DAF puis validation Direction', async () => {
  const body = { dateRapport: '2026-03-10', agentNom: 'MBIDA François', zoneSecteur: 'Yaoundé', typeMission: 'Tournée de collecte journalière', adherentsVisites: 20, adherentsCotisants: 15, nouvellesAdhesions: 2, montantEspecesRemis: 30000, montantMobileMoneyDeclare: 12000, conformiteCaisse: 'Conforme (Fonds reçus complets)', statutValidation: 'Validé Direction', montantTotalCollecte: 1 };
  const r = await call('POST', '/rapports-agents', { token: await caisse(), body });
  assert.equal(r.status, 201);
  assert.equal(r.data.montantTotalCollecte, 42000);
  assert.equal(r.data.statutValidation, 'Enregistré par Caissière');
  assert.equal((await call('POST', `/rapports-agents/${r.data.id}/valider-daf`, { token: await caisse(), body: {} })).status, 403);
  assert.equal((await call('POST', `/rapports-agents/${r.data.id}/valider-direction`, { token: await dg() })).status, 409, 'visa DAF préalable');
  const v = await call('POST', `/rapports-agents/${r.data.id}/valider-daf`, { token: await daf(), body: { visa: 'Vu et vérifié' } });
  assert.equal(v.data.statutValidation, 'Vérifié DAF');
  assert.equal((await call('PUT', `/rapports-agents/${r.data.id}`, { token: await caisse(), body: { observations: 'retouche' } })).status, 409);
  assert.equal((await call('POST', `/rapports-agents/${r.data.id}/valider-direction`, { token: await dg() })).data.statutValidation, 'Validé Direction');
});

/* ---------------------------------------------------- PARAMÈTRES / JOURNAL */
test('paramètres : le code de confirmation n\'est jamais renvoyé, son changement exige l\'ancien', async () => {
  const token = await daf();
  const g = await call('GET', '/parametres', { token: await caisse() });
  assert.equal(JSON.stringify(g.data).includes('codeConfirmation"'), false);
  assert.equal(g.data.codeConfirmationDefini, true);
  assert.equal(g.data.codeConfirmationHash, undefined);
  assert.equal((await call('PUT', '/parametres', { token: await caisse(), body: { slogan: 'x' } })).status, 403);
  assert.equal((await call('PUT', '/parametres', { token, body: { codeConfirmationSecurite: '2468', ancienCodeConfirmation: '9999' } })).status, 403);
  const ok = await call('PUT', '/parametres', { token, body: { codeConfirmationSecurite: '2468', ancienCodeConfirmation: '0000', seuilImmatriculation: 20000 } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.seuilImmatriculation, 20000);
  // le nouveau code est effectif, l'ancien non
  const probe = await call('POST', '/auth/verify-code', { token, body: { pinCode: '0000' } });
  assert.equal(probe.status, 403);
  assert.equal((await call('POST', '/auth/verify-code', { token, body: { pinCode: '2468' } })).status, 200);
  // remise à l'état initial
  await call('PUT', '/parametres', { token, body: { codeConfirmationSecurite: '0000', ancienCodeConfirmation: '2468', seuilImmatriculation: 15000 } });
});

test('journal : traçabilité des opérations, filtres, purge réservée au DG avec code', async () => {
  const token = await dg();
  const j = await call('GET', '/journal?typeOperation=ENREGISTREMENT_COTISATION&pageSize=100', { token });
  assert.equal(j.status, 200);
  assert.ok(j.data.length >= 2);
  assert.ok(j.data.every((e) => e.typeOperation === 'ENREGISTREMENT_COTISATION'));
  const auth = await call('GET', '/journal?typeOperation=CONNEXION', { token });
  assert.ok(auth.data.length >= 1);
  const byMat = await call('GET', `/journal?matricule=${adh.matricule}`, { token });
  assert.ok(byMat.data.length >= 3);
  assert.equal((await call('DELETE', '/journal', { token: await daf(), headers: PIN })).status, 403, 'DAF ne purge pas');
  assert.equal((await call('DELETE', '/journal?avant=2000-01-01', { token })).status, 400, 'code requis');
  const purge = await call('DELETE', '/journal?avant=2026-03-06', { token, headers: PIN });
  assert.equal(purge.status, 200);
  assert.ok(purge.data.supprimees >= 6, 'les entrées de démo anciennes sont purgées');
  const trace = await call('GET', '/journal?typeOperation=PURGE_OU_IMPORT_DONNEES', { token });
  assert.ok(trace.data.length >= 1, 'la purge elle-même est tracée');
});

/* ------------------------------------------------- DASHBOARD / RAPPORTS */
test('tableau de bord : finances uniquement pour la direction financière', async () => {
  const d1 = await call('GET', '/dashboard', { token: await daf() });
  assert.equal(d1.status, 200);
  assert.ok(d1.data.adherents.total >= 8);
  assert.ok(d1.data.cotisations.totalGlobal > 0);
  assert.equal(Object.keys(d1.data.cotisations.parMois).length, 12);
  assert.ok(d1.data.finances);
  const d2 = await call('GET', '/dashboard', { token: await caisse() });
  assert.equal(d2.data.finances, undefined);
});

test('état mensuel et relevé adhérent', async () => {
  const em = await call('GET', '/rapports/etats-mensuels?mois=2026-03', { token: await daf() });
  assert.equal(em.status, 200);
  assert.ok(em.data.cotisations.total > 0);
  assert.ok(em.data.finances.depenses.total > 0);
  assert.equal((await call('GET', '/rapports/etats-mensuels?mois=2026-13', { token: await daf() })).status, 400);
  assert.equal((await call('GET', '/rapports/etats-mensuels?mois=2026-03', { token: await caisse() })).data.finances, undefined);
  const rel = await call('GET', `/rapports/releve/${adh.matricule}`, { token: await caisse() });
  assert.equal(rel.status, 200);
  assert.ok(rel.data.cotisations.length >= 4);
});

/* ---------------------------------------------------------------- SYSTÈME */
test('gestionnaires : renommage propagé aux adhérents, suppression désaffecte', async () => {
  const token = await dg();
  const g = (await call('GET', '/gestionnaires', { token })).data.find((x) => x.code === 'GP-001');
  const up = await call('PUT', `/gestionnaires/${g.id}`, { token, body: { nom: 'MBIDA-NEW' } });
  assert.equal(up.status, 200);
  assert.match((await call('GET', '/adherents/adh-1', { token })).data.gestionnaireNom, /MBIDA-NEW/);
  const mine = await call('PUT', `/adherents/${adh.id}/portefeuille`, { token, body: { gestionnaireId: g.id } });
  assert.equal(mine.data.gestionnaireId, g.id);
  assert.equal((await call('PUT', `/adherents/${adh.id}/portefeuille`, { token, body: { gestionnaireId: 'gp-inconnu' } })).status, 400);
  const created = await call('POST', '/gestionnaires', { token, body: { nom: 'NEW', prenom: 'Gest', telephone: '+237 600000000', zoneSecteur: 'Douala' } });
  assert.equal(created.status, 201);
  assert.match(created.data.code, /^GP-\d{3}$/);
  await call('PUT', `/adherents/${adh.id}/portefeuille`, { token, body: { gestionnaireId: created.data.id } });
  assert.equal((await call('DELETE', `/gestionnaires/${created.data.id}`, { token })).status, 200);
  assert.equal((await call('GET', `/adherents/${adh.id}`, { token })).data.gestionnaireId, undefined);
});

test('banques : liste, ajout, doublon, suppression', async () => {
  const token = await daf();
  assert.equal((await call('GET', '/banques', { token: await caisse() })).data.length, 8);
  assert.equal((await call('POST', '/banques', { token, body: { nom: 'Afriland First Bank' } })).status, 201);
  assert.equal((await call('POST', '/banques', { token, body: { nom: 'afriland first bank' } })).status, 409);
  const del = await call('DELETE', `/banques/${encodeURIComponent('Afriland First Bank')}`, { token });
  assert.equal(del.data.length, 8);
  assert.equal((await call('POST', '/banques', { token: await caisse(), body: { nom: 'X Bank' } })).status, 403);
});

test('export : sans secrets ; mise à jour logicielle : code de maintenance + droit', async () => {
  const exp = await call('GET', '/systeme/export', { token: await dg() });
  assert.equal(exp.status, 200);
  const txt = JSON.stringify(exp.data);
  assert.equal(txt.includes('passwordHash'), false);
  assert.equal(txt.includes('pinHash'), false);
  assert.equal(/\$2[aby]\$\d{2}\$/.test(txt), false, 'aucun hash bcrypt dans l\'export (le journal ne mentionne que le nom du champ, masqué)');
  assert.ok(exp.data.donnees.adherents.length >= 8);

  assert.equal((await call('POST', '/systeme/mise-a-jour', { token: await caisse(), headers: { 'X-Maintenance-Code': '1111' } })).status, 403);
  assert.equal((await call('POST', '/systeme/mise-a-jour', { token: await dg() })).status, 400);
  assert.equal((await call('POST', '/systeme/mise-a-jour', { token: await dg(), headers: { 'X-Maintenance-Code': '0000' } })).status, 403);
  const ok = await call('POST', '/systeme/mise-a-jour', { token: await pca(), headers: { 'X-Maintenance-Code': '1111' } });
  assert.equal(ok.status, 200);
  assert.equal((await call('GET', '/adherents', { token: await dg() })).body.meta.total, 0);
  const fresh = await call('POST', '/adherents', { token: await dg(), body: newAdh({ cni: 'CNI-NEW-1' }) });
  assert.equal(fresh.data.matricule, 'COSITI-0001', 'séquence des matricules remise à zéro');
  assert.equal((await call('GET', '/utilisateurs', { token: await dg() })).data.length >= 6, true, 'les comptes sont conservés');
});

test('route inconnue et JSON invalide', async () => {
  assert.equal((await call('GET', '/systeme/inexistant', { token: await dg() })).status, 404);
  const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{pas du json' });
  assert.equal(res.status, 400);
});

test('CORS : origine non autorisée sans en-tête Allow-Origin', async () => {
  const bad = await fetch(`${base}/api/systeme/health`, { headers: { Origin: 'http://evil.example' } });
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
  const good = await fetch(`${base}/api/systeme/health`, { headers: { Origin: 'http://localhost:3000' } });
  assert.equal(good.headers.get('access-control-allow-origin'), 'http://localhost:3000');
});

/* ------------------------------------------------ RÔLES : matrice = comportement réel */
const PW_ROLE = 'Role@Pass123';
const ROLE_USERS = {};

// Sonde par action : requête volontairement invalide (ou sur une ressource inexistante). Le contrôle de droit
// s'exécute AVANT la validation : 403 = refusé par le profil ; tout autre statut = le profil a le droit.
const PROBES = {
  'dashboard.consulter': ['GET', '/dashboard'],
  'adherents.consulter': ['GET', '/adherents'],
  'adherents.creer': ['POST', '/adherents', {}],
  'adherents.modifier': ['PUT', '/adherents/x', {}],
  'adherents.supprimer': ['DELETE', '/adherents/x'],
  'adherents.changer_statut': ['PATCH', '/adherents/x/statut', {}],
  'adherents.affecter_portefeuille': ['PUT', '/adherents/x/portefeuille', {}],
  'adherents.ajuster_assiette': ['PUT', '/adherents/x/salaire-cotisable', {}],
  'gestionnaires.consulter': ['GET', '/gestionnaires'],
  'gestionnaires.gerer': ['POST', '/gestionnaires', {}],
  'cotisations.consulter': ['GET', '/cotisations'],
  'cotisations.encaisser': ['POST', '/cotisations', {}],
  'cotisations.modifier': ['PUT', '/cotisations/x', {}],
  'cotisations.supprimer': ['DELETE', '/cotisations/x'],
  'cotisations.regulariser': ['POST', '/cotisations/regulariser', {}],
  'finances.consulter': ['GET', '/depenses'],
  'finances.gerer': ['POST', '/depenses', {}],
  'finances.banques': ['POST', '/banques', {}],
  'paie.consulter': ['GET', '/employes'],
  'paie.gerer': ['POST', '/paie/generer', {}],
  'rapports_agents.consulter': ['GET', '/rapports-agents'],
  'rapports_agents.saisir': ['POST', '/rapports-agents', {}],
  'rapports_agents.supprimer': ['DELETE', '/rapports-agents/x'],
  'rapports_agents.viser_daf': ['POST', '/rapports-agents/x/valider-daf', {}],
  'rapports_agents.valider_direction': ['POST', '/rapports-agents/x/valider-direction'],
  'immatriculations.consulter': ['GET', '/adherents'],
  'immatriculations.valider': ['POST', '/adherents/x/immatriculer', {}],
  'dossiers.consulter': ['GET', '/dossiers'],
  'dossiers.gerer': ['POST', '/dossiers', {}],
  'agenda.consulter': ['GET', '/partenaires'],
  'agenda.gerer': ['POST', '/partenaires', {}],
  'rapports_reunions.consulter': ['GET', '/rapports-reunions'],
  'rapports_reunions.rediger': ['POST', '/rapports-reunions', {}],
  'alertes.consulter': ['GET', '/alertes'],
  'etats_mensuels.consulter': ['GET', '/rapports/etats-mensuels?mois=2026-03'],
  'etats_mensuels.exporter': ['GET', '/systeme/export'],
  'echange_excel.exporter': ['GET', '/excel/catalogue'],
  'echange_excel.importer': ['POST', '/excel/import', {}],
  'journal.consulter': ['GET', '/journal'],
  'journal.purger': ['DELETE', '/journal'],
  'utilisateurs.gerer_comptes': ['POST', '/utilisateurs', {}],
  'utilisateurs.auditer': ['GET', '/utilisateurs/u-dg/activite'],
  'utilisateurs.identifiants': ['PUT', '/utilisateurs/x/identifiants', {}],
  'parametres.consulter': ['GET', '/parametres'],
  'parametres.modifier': ['PUT', '/parametres', {}],
  'systeme.mise_a_jour': ['POST', '/systeme/mise-a-jour'],
  'systeme.reinitialiser': ['POST', '/systeme/reset-demo'],
};
// Actions dont la règle dépend de la donnée (et non du seul profil) : couvertes par des tests dédiés
const SANS_SONDE = ['dashboard.volet_financier', 'etats_mensuels.volet_financier', 'agenda.notes_confidentielles', 'rapports_reunions.corriger_signe', 'utilisateurs.profil'];

test('rôles : chaque profil se connecte (10 rôles)', async () => {
  const { allRoleSheets } = await import('../src/utils/roles.js');
  const t = await sa();
  for (const sheet of allRoleSheets()) {
    const email = `role-${sheet.role.replace(/[^a-z]/gi, '').toLowerCase()}@cositi-ci.org`;
    const c = await call('POST', '/utilisateurs', { token: t, body: { nom: `Test ${sheet.role}`, email, role: sheet.role, password: PW_ROLE, mustChangePassword: false } });
    assert.equal(c.status, 201, `${sheet.role}: ${JSON.stringify(c.body)}`);
    const l = await call('POST', '/auth/login', { body: { email, password: PW_ROLE } });
    assert.equal(l.status, 200);
    ROLE_USERS[sheet.role] = { token: l.data.accessToken, id: c.data.id, modules: l.data.modules };
  }
  assert.equal(Object.keys(ROLE_USERS).length, 10);
});

test('rôles : la matrice module × action correspond EXACTEMENT aux refus/autorisations du serveur', async () => {
  const { MODULES } = await import('../src/utils/roles.js');
  const mismatches = [];
  let checked = 0;
  for (const [role, u] of Object.entries(ROLE_USERS)) {
    for (const m of u.modules) {
      for (const a of m.actions) {
        const probe = PROBES[`${m.id}.${a.id}`];
        if (!probe) continue;
        const [method, path, body] = probe;
        const r = await call(method, path, { token: u.token, body });
        const allowed = r.status !== 403;
        checked++;
        if (allowed !== a.autorise) mismatches.push(`${role} / ${m.id}.${a.id} : matrice=${a.autorise} serveur=${r.status}`);
      }
    }
  }
  assert.deepEqual(mismatches, []);
  assert.ok(checked > 300, `${checked} contrôles`);
  const sansSonde = MODULES.flatMap((m) => m.actions.map((a) => `${m.id}.${a.id}`)).filter((k) => !PROBES[k] && !SANS_SONDE.includes(k));
  assert.deepEqual(sansSonde, [], 'actions sans sonde');
});

test('rôles : séparation des périmètres (exemples clés)', async () => {
  const R = (role) => ROLE_USERS[role].token;
  // Finances / Paie / Agenda : uniquement direction (DG, DGA, DAF, Administrateur)
  for (const role of ['PCA', 'Conseil de Surveillance', "Caissière & Agent d'enregistrement", "Agent d'enregistrement", 'Agent de consultation']) {
    for (const p of ['/depenses', '/versements', '/employes', '/paie/bulletins', '/partenaires', '/rendez-vous', '/notes-direction']) {
      assert.equal((await call('GET', p, { token: R(role) })).status, 403, `${role} ${p}`);
    }
  }
  for (const role of ['DG', 'DGA', 'DAF', 'Administrateur']) assert.equal((await call('GET', '/depenses', { token: R(role) })).status, 200, role);
  // Lecture : tous les rôles voient adhérents, cotisations, alertes, journal, dossiers
  for (const role of Object.keys(ROLE_USERS)) {
    for (const p of ['/adherents', '/cotisations', '/alertes', '/journal', '/dossiers', '/dashboard', '/gestionnaires']) {
      assert.equal((await call('GET', p, { token: R(role) })).status, 200, `${role} ${p}`);
    }
  }
  // Écriture de caisse : caissière / agent d'enregistrement oui, consultation non
  assert.notEqual((await call('POST', '/cotisations', { token: R("Caissière & Agent d'enregistrement"), body: {} })).status, 403);
  for (const role of ['PCA', 'Conseil de Surveillance', 'Agent de consultation']) {
    assert.equal((await call('POST', '/cotisations', { token: R(role), body: {} })).status, 403, role);
    assert.equal((await call('POST', '/adherents', { token: R(role), body: {} })).status, 403, role);
  }
  // Volet financier du tableau de bord
  assert.ok((await call('GET', '/dashboard', { token: R('DAF') })).data.finances);
  assert.equal((await call('GET', '/dashboard', { token: R("Caissière & Agent d'enregistrement") })).data.finances, undefined);
  // Liste des utilisateurs : complète pour les gestionnaires de comptes, minimale pour les autres
  assert.ok((await call('GET', '/utilisateurs', { token: R('DAF') })).data[0].email);
  assert.ok((await call('GET', '/utilisateurs', { token: R('PCA') })).data[0].email, 'PCA : profil d\'audit');
  assert.equal((await call('GET', '/utilisateurs', { token: R('Agent de consultation') })).data[0].email, undefined);
  // Validation finale d'un rapport d'agent : DG / DGA seulement (le DAF et l'Administrateur sont refusés)
  for (const role of ['DAF', 'Administrateur', 'PCA']) assert.equal((await call('POST', '/rapports-agents/x/valider-direction', { token: R(role) })).status, 403, role);
  assert.equal((await call('POST', '/rapports-agents/x/valider-direction', { token: R('DGA') })).status, 404);
  // Informations de connexion : Super Administrateur UNIQUEMENT (plus le DAF, le PCA, le DG ni la DGA)
  const victim = ROLE_USERS['Agent de consultation'].id;
  for (const role of ["Caissière & Agent d'enregistrement", 'Conseil de Surveillance', 'Agent de consultation', "Agent d'enregistrement", 'PCA', 'DAF', 'DG', 'DGA', 'Administrateur']) {
    assert.equal((await call('POST', `/utilisateurs/${victim}/reset-password`, { token: R(role), body: { newPassword: 'Autre@Pass123' } })).status, 403, role);
  }
  assert.equal((await call('POST', `/utilisateurs/${victim}/reset-password`, { token: R('Super Administrateur'), body: { newPassword: PW_ROLE, mustChangePassword: false } })).status, 200);
});

test('rôles : GET /roles, /roles/me et /auth/me exposent la même matrice', async () => {
  const token = ROLE_USERS['DAF'].token;
  const all = await call('GET', '/roles', { token });
  assert.equal(all.status, 200);
  assert.equal(all.data.length, 10);
  const daf = all.data.find((r) => r.role === 'DAF');
  assert.ok(daf.droitsCles.length > 3);
  assert.equal(daf.modules.find((m) => m.id === 'finances').niveau, 'ecriture');
  assert.equal(all.data.find((r) => r.role === 'PCA').modules.find((m) => m.id === 'finances').niveau, 'aucun');
  assert.equal(all.data.find((r) => r.role === 'PCA').modules.find((m) => m.id === 'adherents').niveau, 'lecture');
  const me = await call('GET', '/roles/me', { token });
  assert.deepEqual(me.data.modules.map((m) => [m.id, m.niveau]), daf.modules.map((m) => [m.id, m.niveau]));
  const one = await call('GET', `/roles/${encodeURIComponent("Caissière & Agent d'enregistrement")}`, { token });
  assert.equal(one.status, 200);
  assert.equal(one.data.permissions.canDeleteRecords, false);
  assert.equal((await call('GET', '/roles/Inconnu', { token })).status, 400);
  assert.equal((await call('GET', '/roles')).status, 401);
});

/* --------------------------------------------------------------- SWAGGER */
test('swagger : la spécification OpenAPI est valide et documente toutes les routes', async () => {
  const { default: SwaggerParser } = await import('@apidevtools/swagger-parser');
  const res = await fetch(`${base}/api/docs.json`);
  assert.equal(res.status, 200);
  const spec = await res.json();
  await SwaggerParser.validate(structuredClone(spec));
  const ops = Object.entries(spec.paths).flatMap(([p, o]) => Object.entries(o).map(([m, op]) => ({ key: `${m.toUpperCase()} ${p}`, op })));
  assert.ok(ops.length >= 115, `${ops.length} opérations`);
  assert.deepEqual(ops.filter(({ key, op }) => op.summary === key).map((o) => o.key), [], 'toute opération a un résumé');
  // authentification et droits documentés
  const login = spec.paths['/api/auth/login'].post;
  assert.equal(login.security, undefined);
  assert.ok(login.requestBody.content['application/json'].example.email);
  const del = spec.paths['/api/adherents/{id}'].delete;
  assert.deepEqual(del['x-roles'], ['Super Administrateur', 'DG', 'DGA', 'DAF', 'Administrateur']);
  assert.ok(del.parameters.some((p) => p.name === 'X-Confirmation-Code' && p.in === 'header'));
  assert.deepEqual(spec.paths['/api/rapports-agents/{id}/valider-direction'].post['x-roles'], ['DG', 'DGA']);
  assert.ok(spec.paths['/api/systeme/mise-a-jour'].post.parameters.some((p) => p.name === 'X-Maintenance-Code'));
  assert.equal(spec.components.securitySchemes.bearerAuth.scheme, 'bearer');
});

test('swagger : l\'interface /api/docs est servie avec ses ressources', async () => {
  const html = await fetch(`${base}/api/docs/`);
  assert.equal(html.status, 200);
  const txt = await html.text();
  assert.match(txt, /swagger-ui/i);
  for (const f of ['swagger-ui-bundle.js', 'swagger-ui.css', 'swagger-ui-init.js']) {
    assert.equal((await fetch(`${base}/api/docs/${f}`)).status, 200, f);
  }
});

/* ----------------------------------------- SUPER ADMINISTRATEUR & AUDIT DES ACTEURS */
test('super admin : seul habilité à modifier les informations de connexion d\'un acteur', async () => {
  const t = await sa();
  const c = await call('POST', '/utilisateurs', { token: t, body: { nom: 'Agent Identifiants', email: 'ident@cositi-ci.org', role: "Agent d'enregistrement", password: 'Ident@Pass1', mustChangePassword: false } });
  assert.equal(c.status, 201);
  assert.equal(c.data.typeAcces, 'Enregistrement', 'type d\'accès déduit du rôle');
  assert.equal(c.data.hasPin, undefined);
  const id = c.data.id;
  const before = await call('POST', '/auth/login', { body: { email: 'ident@cositi-ci.org', password: 'Ident@Pass1' } });
  assert.equal(before.status, 200);

  // aucun autre rôle, même de direction, ne peut toucher aux identifiants ni au compte d'un autre
  for (const tok of [await dg(), await daf(), await pca()]) {
    assert.equal((await call('PUT', `/utilisateurs/${id}/identifiants`, { token: tok, body: { password: 'Pirate@Pass1' } })).status, 403);
    assert.equal((await call('PUT', `/utilisateurs/${id}`, { token: tok, body: { email: 'pirate@x.org' } })).status, 403);
  }
  // l'acteur lui-même ne peut pas changer son e-mail de connexion
  assert.equal((await call('PUT', `/utilisateurs/${id}`, { token: before.data.accessToken, body: { email: 'moi@x.org' } })).status, 403);

  // le Super Administrateur change e-mail + mot de passe : sessions fermées, nouveaux identifiants actifs
  const upd = await call('PUT', `/utilisateurs/${id}/identifiants`, { token: t, body: { email: 'ident2@cositi-ci.org', password: 'Nouveau@Ident2', mustChangePassword: true } });
  assert.equal(upd.status, 200);
  assert.equal(upd.data.email, 'ident2@cositi-ci.org');
  assert.equal((await call('GET', '/auth/me', { token: before.data.accessToken })).status, 401, 'sessions fermées');
  assert.equal((await call('POST', '/auth/login', { body: { email: 'ident@cositi-ci.org', password: 'Ident@Pass1' } })).status, 401);
  const after = await call('POST', '/auth/login', { body: { email: 'ident2@cositi-ci.org', password: 'Nouveau@Ident2' } });
  assert.equal(after.status, 200);
  assert.equal(after.data.mustChangePassword, true);
  assert.equal((await call('PUT', `/utilisateurs/${id}/identifiants`, { token: t, body: {} })).status, 400, 'rien à modifier');
  const j = (await call('GET', '/journal?typeOperation=MODIFICATION_IDENTIFIANTS', { token: t })).data;
  assert.ok(j.some((e) => e.description.includes('Agent Identifiants') && e.description.includes('mot de passe') && !e.description.includes('Nouveau@Ident2')), 'tracé, sans le mot de passe');
});

test('super admin : crée un compte pour chacun des rôles et ne peut pas disparaître', async () => {
  const t = await sa();
  const roles = (await call('GET', '/roles', { token: t })).data.map((r) => r.role);
  assert.ok(roles.includes('Super Administrateur'));
  const sa2 = await call('POST', '/utilisateurs', { token: t, body: { nom: 'Second Super Admin', email: 'sa2@cositi-ci.org', role: 'Super Administrateur', password: 'Second@Admin1', mustChangePassword: false } });
  assert.equal(sa2.status, 201);
  assert.equal(sa2.data.typeAcces, 'Super administration');
  const me = (await call('GET', '/auth/me', { token: t })).data.user;
  assert.equal((await call('PUT', `/utilisateurs/${me.id}`, { token: t, body: { role: 'DG' } })).status, 400, 'pas de changement de son propre rôle');
  assert.equal((await call('DELETE', `/utilisateurs/${sa2.data.id}`, { token: t, headers: PIN })).status, 200);
  // un typeAcces « Super administration » posé sur un autre rôle ne donne aucun droit de gestion
  const fake = await call('POST', '/utilisateurs', { token: t, body: { nom: 'Faux Admin', email: 'faux@cositi-ci.org', role: 'Agent de consultation', typeAcces: 'Super administration', password: 'Faux@Admin1', mustChangePassword: false } });
  const lf = await call('POST', '/auth/login', { body: { email: 'faux@cositi-ci.org', password: 'Faux@Admin1' } });
  assert.equal(lf.data.permissions.canManageUsers, false);
  assert.equal((await call('POST', '/utilisateurs', { token: lf.data.accessToken, body: {} })).status, 403);
  assert.equal(fake.status, 201);
});

test('audit : activité d\'un acteur, statistiques, filtres et visibilité', async () => {
  const t = await sa();
  // le DG agit : nouvelle connexion + création d'un adhérent
  const dgTok = (await call('POST', '/auth/login', { body: { email: 'dg@cositi-ci.org', password: DEFAULT_PW } })).data.accessToken;
  const dgMe = (await call('GET', '/auth/me', { token: dgTok })).data.user;
  const created = await call('POST', '/adherents', { token: dgTok, body: newAdh({ cni: 'CNI-AUDIT-1', telephone: '+237 600 11 22 33' }) });
  assert.equal(created.status, 201);

  const act = await call('GET', `/utilisateurs/${dgMe.id}/activite?pageSize=200`, { token: t });
  assert.equal(act.status, 200);
  const types = act.data.map((e) => e.typeOperation);
  assert.ok(types.includes('CONNEXION'));
  assert.ok(types.includes('CREATION_ADHERENT'));
  assert.ok(act.data.every((e, i, a) => i === 0 || a[i - 1].dateHeure >= e.dateHeure), 'du plus récent au plus ancien');
  const st = act.body.meta.statistiques;
  assert.equal(st.total, act.body.meta.total);
  assert.ok(st.connexions >= 1);
  assert.equal(st.parTypeOperation.CREATION_ADHERENT >= 1, true);

  const filtre = await call('GET', `/utilisateurs/${dgMe.id}/activite?typeOperation=CREATION_ADHERENT`, { token: t });
  assert.ok(filtre.data.length >= 1 && filtre.data.every((e) => e.typeOperation === 'CREATION_ADHERENT'));
  const vide = await call('GET', `/utilisateurs/${dgMe.id}/activite?du=2000-01-01&au=2000-12-31`, { token: t });
  assert.equal(vide.body.meta.total, 0);

  // consultation tracée chez celui qui consulte
  const saMe = (await call('GET', '/auth/me', { token: t })).data.user;
  const saAct = await call('GET', `/utilisateurs/${saMe.id}/activite?typeOperation=CONSULTATION_PROFIL`, { token: t });
  assert.ok(saAct.data.some((e) => e.description.includes(dgMe.nom)));

  // visibilité : un profil d'audit voit tout le monde ; la caissière ne voit que sa propre activité
  assert.equal((await call('GET', `/utilisateurs/${dgMe.id}/activite`, { token: await pca() })).status, 200);
  const caisseTok = await caisse();
  const caisseMe = (await call('GET', '/auth/me', { token: caisseTok })).data.user;
  assert.equal((await call('GET', `/utilisateurs/${dgMe.id}/activite`, { token: caisseTok })).status, 403);
  assert.equal((await call('GET', `/utilisateurs/${dgMe.id}/rapport-audit`, { token: caisseTok })).status, 403);
  assert.equal((await call('GET', `/utilisateurs/${caisseMe.id}/activite`, { token: caisseTok })).status, 200);
});

test('audit : rapport d\'audit imprimable et journalisation des actions du navigateur', async () => {
  const t = await sa();
  const dgMe = (await call('GET', '/auth/me', { token: await dg() })).data.user;
  const r = await call('GET', `/utilisateurs/${dgMe.id}/rapport-audit`, { token: t });
  assert.equal(r.status, 200);
  assert.equal(r.data.utilisateur.nom, dgMe.nom);
  assert.equal(r.data.utilisateur.passwordHash, undefined);
  assert.equal(r.data.organisation.sigle, 'COSITI');
  assert.ok(r.data.actions.length >= 2);
  assert.equal(r.data.utilisateur.modules.length, 18);
  assert.equal(r.data.generePar.role, 'Super Administrateur');
  assert.ok(r.data.statistiques.total >= r.data.actions.length);

  const ev = await call('POST', '/journal/evenements', { token: t, body: { typeOperation: 'IMPRESSION_RAPPORT_AUDIT', description: `Impression du rapport d'audit de ${dgMe.nom}` } });
  assert.equal(ev.status, 201);
  assert.equal((await call('POST', '/journal/evenements', { token: t, body: { typeOperation: 'SUPPRESSION_ADHERENT', description: 'faux' } })).status, 400, 'types limités aux actions du navigateur');
  assert.equal((await call('POST', '/journal/evenements', { body: { typeOperation: 'EXPORT_DONNEES', description: 'anonyme' } })).status, 401);
  const saMe = (await call('GET', '/auth/me', { token: t })).data.user;
  const types = (await call('GET', `/utilisateurs/${saMe.id}/activite?pageSize=200`, { token: t })).data.map((e) => e.typeOperation);
  assert.ok(types.includes('CONSULTATION_RAPPORT_AUDIT'));
  assert.ok(types.includes('IMPRESSION_RAPPORT_AUDIT'));
});

test('journalisation : un code de confirmation erroné est tracé', async () => {
  const token = await daf();
  await call('POST', '/auth/verify-code', { token, body: { pinCode: '9999' } });
  const j = (await call('GET', '/journal?typeOperation=ECHEC_CODE_CONFIRMATION', { token })).data;
  assert.ok(j.some((e) => e.utilisateur.includes("N'GUESSAN")));
});

/* ------------------------------------------------ RÉINITIALISATION = DUMP */
test('réinitialisation : réimporte le dump, efface les ajouts et révoque les sessions', async () => {
  const token = await daf();
  assert.equal((await call('POST', '/systeme/reset-demo', { token })).status, 400, 'code requis');
  assert.equal((await call('POST', '/systeme/reset-demo', { token: await caisse(), headers: PIN })).status, 403);
  const r = await call('POST', '/systeme/reset-demo', { token, headers: PIN });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  // l'ancien jeton est révoqué ; on se reconnecte avec les identifiants recréés
  assert.equal((await call('GET', '/adherents', { token })).status, 401);
  const l = await call('POST', '/auth/login', { body: { email: 'daf@cositi-ci.org', password: DEFAULT_PW } });
  assert.equal(l.status, 200);
  const t = l.data.accessToken;
  assert.equal((await call('GET', '/adherents', { token: t })).body.meta.total, 7);
  assert.equal((await call('GET', '/cotisations?pageSize=500', { token: t })).body.meta.totalMontant, 102400);
  assert.equal((await call('GET', '/utilisateurs', { token: t })).data.length, 7, 'les comptes ajoutés par les tests disparaissent (6 du dump + Super Administrateur)');
  assert.equal((await call('GET', '/paie/bulletins?pageSize=500', { token: t })).body.meta.total, 14);
  // le code de confirmation du dump est de nouveau « 0000 »
  assert.equal((await call('POST', '/auth/verify-code', { token: t, body: { pinCode: '0000' } })).status, 200);
});
