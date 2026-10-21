// E2E : navigateur réel (Chrome) → front (Vite :3000) → API (:4000) → MySQL. Compare ce qui est AFFICHÉ aux données du serveur.
//
// Prérequis : MySQL, l'API (`npm start`) et le front (`npm run dev` à la racine) démarrés ; compte DAF du dump.
// Lancement : `npm run test:e2e` (variables : CHROME_PATH, FRONT_URL, API_URL).
// Le test crée UNE dépense de test (pièce E2E-PJ-1) pour vérifier qu'une donnée écrite en base apparaît à l'écran ; elle est
// supprimée à la fin (la trace reste au journal d'audit).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONT = process.env.FRONT_URL || 'http://localhost:3000';
const API = process.env.API_URL || 'http://localhost:4000/api';
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'cositi-e2e-'));
const DL = path.join(WORK, 'downloads');
fs.rmSync(DL, { recursive: true, force: true });
fs.mkdirSync(DL, { recursive: true });

const results = [];
const check = (nom, ok, detail = '') => {
  results.push({ nom, ok: !!ok, detail });
  console.log(`${ok ? 'OK  ' : 'ECHEC'} ${nom}${detail ? ' — ' + detail : ''}`);
};
const fmt = (n) => digits(n.toLocaleString('fr-FR')); // même mise en forme que l'écran (virgule décimale)
const digits = (s) => String(s).replace(/[\u202f\u00a0\s]/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- accès API direct (référence)
async function api(method, p, token, body) {
  const r = await fetch(`${API}${p}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return (await r.json()).data;
}
const token = (await api('POST', '/auth/login', null, { email: 'daf@cositi-ci.org', password: 'Cositi@2026!' })).accessToken;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--window-size=1500,1000'], defaultViewport: { width: 1500, height: 1000 } });
const page = await browser.newPage();
const cdp = await page.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });

const problems = [];
const calls = [];
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('response', (r) => {
  const u = r.url();
  if (u.includes('/api/')) calls.push({ method: r.request().method(), url: u.split('/api')[1], status: r.status() });
});

const text = async () => digits(await page.evaluate(() => document.body.innerText));
/** attend (max 10 s) que l'écran affiche la valeur : les modèles serveur arrivent de façon asynchrone */
async function attendreTexte(valeur) {
  for (let i = 0; i < 20; i++) {
    if ((await text()).includes(valeur)) return true;
    await sleep(500);
  }
  return false;
}
async function allerA(label) {
  const ok = await page.evaluate((l) => {
    const els = [...document.querySelectorAll('button, a, [role=button]')];
    const el = els.find((e) => e.innerText && e.innerText.trim().startsWith(l));
    if (!el) return false;
    el.click();
    return true;
  }, label);
  await sleep(1500);
  return ok;
}
/** clique dès que le bouton est actif (la modale charge son catalogue depuis le serveur) */
async function clickQuandPret(label) {
  for (let i = 0; i < 30; i++) {
    const ok = await page.evaluate((l) => {
      const el = [...document.querySelectorAll('button')].find((e) => e.innerText && e.innerText.includes(l) && !e.disabled);
      if (!el) return false;
      el.click();
      return true;
    }, label);
    if (ok) return true;
    await sleep(400);
  }
  return false;
}
async function clickTexte(label, scope = 'button') {
  const ok = await page.evaluate((l, sc) => {
    const el = [...document.querySelectorAll(sc)].find((e) => e.innerText && e.innerText.includes(l));
    if (!el) return false;
    el.click();
    return true;
  }, label, scope);
  await sleep(800);
  return ok;
}

// ================================================================ connexion
await page.goto(FRONT, { waitUntil: 'networkidle2' });
await page.type('input[type=email]', 'daf@cositi-ci.org');
await page.type('input[type=password]', 'Cositi@2026!');
await page.click('button[type=submit]');
await page.waitForFunction(() => document.body.innerText.includes('Tableau de bord'), { timeout: 30000 });
await sleep(2500);
check('connexion DAF par la page de login', true);
check('aucun basculement par PIN dans le menu du profil', !(await text()).includes('CodePINrequis'));

// ================================================================ tableau de bord
const dash = await api('GET', '/dashboard', token);
let t = await text();
check('dashboard : total adhérents affiché = serveur', t.includes(String(dash.adherents.total)), `${dash.adherents.total}`);
check('dashboard : cotisations du mois affichées = serveur', t.includes(digits(`${dash.cotisations.ceMois.toLocaleString('fr-FR')}`).replace(/[^\d]/g, '')) || dash.cotisations.ceMois === 0, `${dash.cotisations.ceMois}`);
check('dashboard : cotisations de l’année = serveur', t.includes(String(dash.cotisations.cetteAnnee)), `${dash.cotisations.cetteAnnee}`);
check('dashboard appelé sur le serveur', calls.some((c) => c.url === '/dashboard' && c.status === 200));
check('alertes appelées sur le serveur', calls.some((c) => c.url === '/alertes' && c.status === 200));

// ================================================================ finances
await allerA('Finances & Dépenses');
const fin = await api('GET', '/finances/synthese', token);
t = await text();
check('finances : réserve CNPS (total cotisations) affichée = serveur', t.includes(String(fin.global.cotisations.total)), `${fin.global.cotisations.total}`);
check('finances : total versements affiché = serveur', t.includes(String(fin.global.versements.total)), `${fin.global.versements.total}`);
check('finances : total dépenses affiché = serveur', t.includes(fmt(fin.global.depenses.total)), `${fin.global.depenses.total}`);
check('finances : synthèse + rapprochement + suivi appelés', ['/finances/synthese', '/rapports/rapprochement', '/versements/suivi/en-attente'].every((u) => calls.some((c) => c.url.startsWith(u) && c.status === 200)));

// onglet bilan + contrôle d'intégrité
await clickTexte('5. Synthèse', 'button');
await clickTexte('Lancer le contrôle', 'button');
await sleep(1500);
t = await text();
check('contrôle d’intégrité exécuté par le serveur', calls.some((c) => c.url === '/finances/controle' && c.status === 200) && (t.includes('Aucuneerreur') || t.includes('erreur(s)')));

// ================================================================ écriture API puis lecture à l'écran (les données viennent de MySQL)
const dep = await api('POST', '/depenses', token, { date: '2026-06-15', categorie: 'Carburant & Déplacements', motif: 'Carburant E2E', montant: 33333.33, modePaiement: 'Espèces / Caisse', beneficiaire: 'Station E2E', numeroPiece: 'E2E-PJ-1' });
await page.reload({ waitUntil: 'networkidle2' });
await sleep(2500);
await allerA('Finances & Dépenses');
const fin2 = await api('GET', '/finances/synthese', token);
t = await text();
check('une dépense créée en base apparaît après rechargement', t.includes('CarburantE2E') || t.includes('StationE2E'));
check('total dépenses affiché = nouveau total serveur (au centime)', t.includes(fmt(fin2.global.depenses.total)), `${fin2.global.depenses.total}`);
check('le total a bien augmenté de 33 333,33', Math.round((fin2.global.depenses.total - fin.global.depenses.total) * 100) / 100 === 33333.33);

// ================================================================ états mensuels
await allerA('États Mensuels');
const etat = await api('GET', '/rapports/etat-mensuel?mois=Mars&annee=2026', token);
t = await text();
check('états mensuels : total cotisations de Mars 2026 = serveur', t.includes(String(etat.cotisations.total)), `${etat.cotisations.total}`);
check('états mensuels : appel du modèle serveur', calls.some((c) => c.url.startsWith('/rapports/etat-mensuel') && c.status === 200));

// ================================================================ paie
await allerA('Gestion de la Paie');
const recap = await api('GET', '/paie/recap?mois=2026-03', token);
check('paie : net total du mois affiché = serveur', await attendreTexte(String(recap.statsMois.totalNet)), `${recap.statsMois.totalNet}`);
check('paie : récapitulatif et paie CNPS appelés', ['/paie/recap', '/paie/adherents-cnps'].every((u) => calls.some((c) => c.url.startsWith(u) && c.status === 200)));

// ================================================================ rapports
await allerA('Rapports & Exports');
await sleep(800);
check('rapports : l’écran s’affiche sans erreur', (await text()).length > 500);

// ================================================================ échange Excel : export puis réimport via l'interface
await allerA('Finances & Dépenses');
const ouvert = await clickTexte('Excel : exporter / importer', 'button');
check('modale d’échange Excel ouverte', ouvert);
await sleep(800);
await clickQuandPret('Télécharger l’export (.xlsx)');
let fichier = null;
for (let i = 0; i < 40 && !fichier; i++) {
  await sleep(500);
  fichier = fs.readdirSync(DL).find((f) => f.endsWith('.xlsx'));
}
check('export Excel téléchargé par le navigateur', !!fichier, fichier || '');
if (fichier) {
  const taille = fs.statSync(path.join(DL, fichier)).size;
  check('le fichier exporté n’est pas vide', taille > 5000, `${taille} octets`);
  await clickTexte('Importer', 'button'); // onglet
  await sleep(500);
  const input = await page.$('input[type=file]');
  await input.uploadFile(path.join(DL, fichier));
  await sleep(500);
  await clickQuandPret('1. Analyser');
  await page.waitForFunction(() => document.body.innerText.includes('Analyse terminée'), { timeout: 60000 });
  t = await text();
  check('simulation d’import du fichier exporté : valide', t.includes('lefichierestvalide'));
  check('simulation : aucune ligne refusée', !t.includes('deslignessontrefusées'));
  const avantCot = (await api('GET', '/cotisations?pageSize=1', token));
  await clickQuandPret('2. Importer');
  // code de confirmation demandé automatiquement
  await page.waitForSelector('input[type=password][placeholder="Code à 4 chiffres"]', { timeout: 15000 });
  await page.type('input[type=password][placeholder="Code à 4 chiffres"]', '0000');
  await clickTexte('Valider', 'button');
  await page.waitForFunction(() => document.body.innerText.includes('Import effectué'), { timeout: 60000 });
  check('import réel via l’interface avec code de confirmation', true);
  const mod = calls.filter((c) => c.url.startsWith('/excel/import'));
  check('appels /excel/import : simulation puis import réussis', mod.some((c) => c.status === 200) && !mod.some((c) => c.status >= 500));
}

// ================================================================ bilan
const bad = calls.filter((c) => c.status >= 500);
check('aucune erreur serveur (5xx) pendant tout le parcours', bad.length === 0, JSON.stringify(bad.slice(0, 3)));
const inattendus = calls.filter((c) => c.status >= 400 && ![401, 403, 409, 400, 422].includes(c.status));
check('aucun statut d’erreur inattendu', inattendus.length === 0, JSON.stringify(inattendus.slice(0, 3)));
check('aucune erreur JavaScript dans la console', problems.filter((p) => !/favicon|DevTools|Failed to load resource/i.test(p)).length === 0, problems.slice(0, 3).join(' | '));

await page.screenshot({ path: path.join(WORK, 'final.png') });
await browser.close();
// nettoyage : la dépense de test est supprimée (avec le code de confirmation)
for (const d of (await api('GET', '/depenses?q=E2E-PJ-1&pageSize=100', token)) || []) {
  if (d.numeroPiece === 'E2E-PJ-1') await fetch(`${API}/depenses/${d.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'X-Confirmation-Code': '0000' } });
}
fs.writeFileSync(path.join(WORK, 'resultats.json'), JSON.stringify({ results, appelsDistincts: [...new Set(calls.map((c) => `${c.method} ${c.url.split('?')[0]} ${c.status}`))] }, null, 2));
const echecs = results.filter((r) => !r.ok);
console.log(`\n${results.length - echecs.length}/${results.length} contrôles réussis`);
process.exit(echecs.length ? 1 : 0);
