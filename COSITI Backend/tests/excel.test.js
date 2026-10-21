// ÉCHANGE EXCEL : l'export de la plateforme se réimporte tel quel. Base jetable `cositi_test_excel`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import * as XLSX from 'xlsx';
import { boot, CONFIRM } from './_harness.js';

let h;
before(async () => {
  h = await boot('cositi_test_excel');
});
after(async () => h.close());

const num = (v) => Number(v ?? 0);
const count = async (table) => num((await h.query(`SELECT COUNT(*) n FROM ${table}`))[0].n);
const sum = async (table, col = 'montant') => num((await h.query(`SELECT COALESCE(SUM(${col}),0) s FROM ${table}`))[0].s);
const TABLES = { adherents: 'adherents', cotisations: 'cotisations', depenses: 'depenses_courantes', versements: 'versements_bancaires', frais: 'frais_mobile_money', employes: 'employes', gestionnaires: 'gestionnaires_portefeuille', banques: 'banques_partenaires' };

const exporter = async (role = 'daf', query = '') => {
  const r = await h.callBinary('GET', `/excel/export${query}`, { token: await h.tokens[role]() });
  assert.equal(r.status, 200, r.buffer.toString().slice(0, 300));
  return r;
};
const lire = (buffer) => XLSX.read(buffer, { type: 'buffer', cellDates: true });
const lignes = (wb, feuille) => XLSX.utils.sheet_to_json(wb.Sheets[feuille], { header: 1, raw: true, defval: null, blankrows: false });
const classeur = (feuilles) => {
  const wb = XLSX.utils.book_new();
  for (const [nom, aoa] of Object.entries(feuilles)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), nom);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};
const importer = async (buffer, { role = 'daf', mode = 'simulation', ignorerErreurs = false, code = true, entites } = {}) =>
  h.callBinary('POST', `/excel/import?mode=${mode}${ignorerErreurs ? '&ignorerErreurs=true' : ''}${entites ? `&entites=${entites}` : ''}`, {
    token: await h.tokens[role](),
    body: buffer,
    headers: { 'Content-Type': 'application/octet-stream', ...(code ? CONFIRM : {}) },
  });

/* ============================================================================ export */

test('catalogue : feuilles et colonnes, droits d\'export et d\'import selon le profil', async () => {
  const daf = (await h.call('GET', '/excel/catalogue', { token: await h.tokens.daf() })).data;
  assert.deepEqual(daf.map((s) => s.id), ['gestionnaires', 'adherents', 'banques', 'cotisations', 'depenses', 'versements', 'frais', 'employes', 'bulletins']);
  assert.ok(daf.every((s) => s.exportable));
  assert.equal(daf.find((s) => s.id === 'bulletins').importable, false, 'les bulletins sont calculés : export seul');
  const caisse = (await h.call('GET', '/excel/catalogue', { token: await h.tokens.caisse() })).data;
  assert.equal(caisse.find((s) => s.id === 'depenses').exportable, false);
  assert.equal(caisse.find((s) => s.id === 'cotisations').importable, true);
  assert.equal(caisse.find((s) => s.id === 'adherents').exportable, true);
});

test('export : une feuille par donnée, en-têtes du catalogue, lignes = base, montants numériques', async () => {
  const r = await exporter();
  assert.match(r.headers.get('content-type'), /spreadsheetml/);
  assert.match(r.headers.get('content-disposition'), /COSITI_Echange_\d{4}-\d{2}-\d{2}\.xlsx/);
  const wb = lire(r.buffer);
  for (const f of ['Gestionnaires', 'Adhérents', 'Banques', 'Cotisations', 'Dépenses', 'Versements', 'Frais Mobile Money', 'Employés', 'Bulletins de paie', 'Informations', 'Instructions']) {
    assert.ok(wb.SheetNames.includes(f), `feuille ${f} absente : ${wb.SheetNames}`);
  }
  const cot = lignes(wb, 'Cotisations');
  assert.equal(cot.length - 1, await count('cotisations'));
  assert.ok(cot[0].includes('Montant (FCFA)') && cot[0].includes('Matricule adhérent') && cot[0].includes('ID (ne pas modifier)'));
  const iMontant = cot[0].indexOf('Montant (FCFA)');
  assert.ok(cot.slice(1).every((row) => typeof row[iMontant] === 'number'), 'montants exportés comme nombres (sommables dans Excel)');
  assert.equal(Math.round(cot.slice(1).reduce((s, row) => s + row[iMontant], 0) * 100) / 100, await sum('cotisations'), 'somme de la feuille = SUM() MySQL');
  assert.equal(lignes(wb, 'Adhérents').length - 1, 7);
  assert.equal(lignes(wb, 'Dépenses').length - 1, await count('depenses_courantes'));
  assert.equal(lignes(wb, 'Bulletins de paie').length - 1, 14);
  // colonnes calculées par le serveur dans le fichier
  const adh = lignes(wb, 'Adhérents');
  assert.ok(adh[0].includes('Total cotisé (FCFA) [calculé]'));
  const iTot = adh[0].indexOf('Total cotisé (FCFA) [calculé]');
  assert.equal(Math.round(adh.slice(1).reduce((s, row) => s + (row[iTot] || 0), 0) * 100) / 100, await sum('cotisations'));
});

test('export : l\'export est tracé, limité aux droits du profil, filtrable par période et par sélection', async () => {
  assert.equal((await h.callBinary('GET', '/excel/export?entites=depenses', { token: await h.tokens.caisse() })).status, 403);
  assert.equal((await h.callBinary('GET', '/excel/export?entites=nimporte', { token: await h.tokens.daf() })).status, 400);
  assert.equal((await h.callBinary('GET', '/excel/export')).status, 401);
  // sans entites : uniquement ce que le profil a le droit d'exporter
  const wbCaisse = lire((await exporter('caisse')).buffer);
  assert.ok(wbCaisse.SheetNames.includes('Cotisations') && !wbCaisse.SheetNames.includes('Dépenses'));

  const periode = lire((await exporter('daf', '?entites=cotisations&du=2026-03-01&au=2026-03-31')).buffer);
  const sql = num((await h.query("SELECT COUNT(*) n FROM cotisations WHERE date_paiement BETWEEN '2026-03-01' AND '2026-03-31'"))[0].n);
  assert.equal(lignes(periode, 'Cotisations').length - 1, sql);

  const ids = (await h.call('GET', '/cotisations?pageSize=2', { token: await h.tokens.daf() })).data.map((c) => c.id);
  const sel = await h.callBinary('POST', '/excel/export', { token: await h.tokens.daf(), body: JSON.stringify({ entites: ['cotisations'], ids: { cotisations: ids } }), headers: { 'Content-Type': 'application/json' } });
  assert.equal(sel.status, 200);
  assert.equal(lignes(lire(sel.buffer), 'Cotisations').length - 1, 2, 'sélection de l\'écran');

  const j = (await h.call('GET', '/journal?typeOperation=EXPORT_DONNEES&pageSize=5', { token: await h.tokens.daf() })).data;
  assert.ok(j.length >= 1 && j[0].utilisateur);
});

test('modèle vierge : en-têtes et instructions, aucune donnée', async () => {
  const r = await h.callBinary('GET', '/excel/modele?entites=adherents,cotisations', { token: await h.tokens.caisse() });
  assert.equal(r.status, 200);
  const wb = lire(r.buffer);
  assert.equal(lignes(wb, 'Adhérents').length, 1);
  assert.equal(lignes(wb, 'Cotisations').length, 1);
  assert.ok(wb.SheetNames.includes('Instructions'));
  assert.ok(lignes(wb, 'Instructions').length > 10);
});

/* ============================================================================ aller-retour */

test('ALLER-RETOUR : le fichier exporté se réimporte tel quel — simulation puis import — sans rien modifier', async () => {
  const wb = (await exporter()).buffer;
  const avant = {};
  for (const [k, t] of Object.entries(TABLES)) avant[k] = await count(t);
  const sommes = { cot: await sum('cotisations'), dep: await sum('depenses_courantes'), vrs: await sum('versements_bancaires'), frais: await sum('frais_mobile_money', 'frais_preleves') };

  const sim = await importer(wb);
  assert.equal(sim.status, 200, JSON.stringify(sim.json));
  const rapport = sim.json.data;
  assert.equal(rapport.mode, 'simulation');
  assert.equal(rapport.applique, false);
  assert.equal(rapport.ok, true, JSON.stringify(rapport.feuilles.map((f) => f.erreurs)));
  assert.equal(rapport.totaux.crees, 0);
  assert.equal(rapport.totaux.misAJour, 0, JSON.stringify(rapport.feuilles.filter((f) => f.misAJour).map((f) => [f.feuille, f.misAJour])));
  assert.ok(rapport.totaux.inchanges > 40);
  assert.ok(rapport.feuillesInconnues.length === 0);
  const bull = rapport.feuilles.find((f) => f.id === 'bulletins');
  assert.equal(bull.erreurs.length, 0);
  assert.ok(bull.avertissements.some((a) => /calculée par le serveur/.test(a)), 'la feuille Bulletins (calculée) est ignorée avec un avertissement, pas refusée');

  // le fichier exporté tel quel (feuille « Bulletins de paie » comprise) s'importe sans aucune retouche
  const reel = await importer(wb, { mode: 'import' });
  assert.equal(reel.status, 200, JSON.stringify(reel.json));
  assert.equal(reel.json.data.applique, true);
  assert.equal(reel.json.data.totaux.crees + reel.json.data.totaux.misAJour, 0);

  for (const [k, t] of Object.entries(TABLES)) assert.equal(await count(t), avant[k], `${t} inchangée`);
  assert.deepEqual({ cot: await sum('cotisations'), dep: await sum('depenses_courantes'), vrs: await sum('versements_bancaires'), frais: await sum('frais_mobile_money', 'frais_preleves') }, sommes);
  const j = (await h.call('GET', '/journal?typeOperation=IMPORT_EXCEL&pageSize=5', { token: await h.tokens.daf() })).data;
  assert.ok(j.length === 1 && /0 créé/.test(j[0].description));
});

test('simulation : n\'écrit absolument rien (ni donnée, ni journal), même quand elle créerait des lignes', async () => {
  const avantJ = await count('journal_operations');
  const avantC = await count('cotisations');
  const buf = classeur({
    Cotisations: [['Matricule adhérent', 'Date de paiement', 'Montant (FCFA)', 'Mode de paiement'], ['COSITI-0001', '2026-07-01', 1234, 'Espèces']],
  });
  const r = await importer(buf, { role: 'caisse' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.data.totaux.crees, 1, 'la simulation annonce la création');
  assert.equal(await count('cotisations'), avantC);
  assert.equal(await count('journal_operations'), avantJ);
});

test('ALLER-RETOUR vers une base vidée : export → effacement SQL → import => mêmes données, mêmes ID, mêmes montants', async () => {
  const daf = await h.tokens.daf();
  const fichier = (await exporter()).buffer; // le fichier exporté tel quel

  const instantane = async () => ({
    adherents: (await h.call('GET', '/adherents?pageSize=500', { token: daf })).data.map((a) => [a.id, a.matricule, a.nom, a.prenom, a.telephone, a.statut, a.numeroCnps, a.tarifJournalier, a.dateAdhesion]).sort(),
    cotisations: (await h.call('GET', '/cotisations?pageSize=500', { token: daf })).data.map((c) => [c.id, c.reference, c.matricule, c.datePaiement, c.montant, c.modePaiement, c.mois, c.annee]).sort(),
    depenses: (await h.call('GET', '/depenses?pageSize=500', { token: daf })).data.map((d) => [d.id, d.date, d.categorie, d.montant, d.numeroPiece, d.origineFonds, d.statut, d.beneficiaire]).sort(),
    versements: (await h.call('GET', '/versements?pageSize=500', { token: daf })).data.map((v) => [v.id, v.date, v.banque, v.numeroBordereau, v.montant, v.arretCotisationId, v.nbCotisationsIncluses, v.cumulCotisationsIncluses]).sort(),
    frais: (await h.call('GET', '/frais-mobile-money?pageSize=500', { token: daf })).data.map((f) => [f.id, f.date, f.operateur, f.montantTransaction, f.fraisPreleves, f.montantNet, f.referenceTransaction]).sort(),
    employes: (await h.call('GET', '/employes?pageSize=500', { token: daf })).data.map((e) => [e.id, e.matricule, e.nom, e.salaireBase, e.indemniteTransport, e.actif]).sort(),
    gestionnaires: (await h.call('GET', '/gestionnaires?pageSize=500', { token: daf })).data.map((g) => [g.id, g.code, g.nom, g.objectifsRecouvrementMensuel]).sort(),
  });
  const avant = await instantane();
  const seq = (await h.call('GET', '/parametres', { token: daf })).data.dernierNumeroMatricule;

  // effacement DIRECT en base (simulation d'une base neuve) — dans l'ordre sans contrainte
  for (const t of ['cotisations', 'depenses_courantes', 'versements_bancaires', 'frais_mobile_money', 'dossiers_allocations', 'adherents', 'employes', 'gestionnaires_portefeuille']) await h.query(`DELETE FROM ${t}`);
  await h.query('UPDATE parametres SET dernier_numero_matricule = 0 WHERE id = 1');
  assert.equal(await count('adherents'), 0);
  assert.equal(await count('cotisations'), 0);

  const r = await importer(fichier, { mode: 'import' });
  assert.equal(r.status, 200, JSON.stringify(r.json?.data?.feuilles?.map((f) => f.erreurs)));
  const t = r.json.data.totaux;
  assert.ok(t.crees >= 7 + 17 + 6 + 3 + 5 + 6 + 3, `créations : ${t.crees}`);
  assert.equal(t.erreurs, 0);

  const apres = await instantane();
  for (const k of Object.keys(avant)) assert.deepEqual(apres[k], avant[k], `${k} : identique à l'original (id, montants, dates, valeurs calculées)`);
  assert.equal((await h.call('GET', '/parametres', { token: daf })).data.dernierNumeroMatricule, seq, 'la séquence des matricules est restaurée');

  // après redémarrage de la base : toujours là
  await h.restartDb();
  assert.deepEqual(await instantane(), avant);
  // les nouveaux adhérents continuent la numérotation sans collision
  const nv = await h.call('POST', '/adherents', { token: await h.tokens.dg(), body: { nom: 'Nouveau', prenom: 'Apres', telephone: '+225 07 07 07 07', profession: 'Tailleur' } });
  assert.equal(nv.data.matricule, `COSITI-${String(seq + 1).padStart(4, '0')}`);
  assert.equal((await h.call('GET', '/finances/controle', { token: daf })).data.ok, true, 'données financières cohérentes après réimport');
});

/* ============================================================================ import : règles de saisie */

test('import : modifications, créations, formats français (1 500,50 · 15/03/2026 · Oui/Non), cellules vides = valeur conservée', async () => {
  const daf = await h.tokens.daf();
  const avantAdh = (await h.call('GET', '/adherents/COSITI-0001', { token: daf })).data;
  const cotExistante = (await h.call('GET', '/cotisations?pageSize=1', { token: daf })).data[0];
  const buf = classeur({
    Adhérents: [
      ['Matricule', 'Profession', 'Téléphone', 'Sans enfant (Oui/Non)'],
      ['COSITI-0001', 'Directeur commercial', null, 'Non'], // téléphone vide => inchangé
      [null, null, '+225 05 00 00 00', null], // ligne sans nom : refusée (création incomplète)
    ],
    Cotisations: [
      ['ID (ne pas modifier)', 'Montant (FCFA)'],
      [cotExistante.id, '1 500,50'], // nombre à la française
      [null, '700'], // pas d'adhérent : refusée
    ],
    Dépenses: [
      ['Date', 'Catégorie', 'Motif', 'Montant (FCFA)', 'Mode de paiement', 'Bénéficiaire', 'N° pièce'],
      ['15/03/2026', 'Loyer & Charges locatives', 'Loyer mars (import)', '250 000', 'Virement bancaire', 'Bailleur SCI', 'LOY-IMPORT-1'], // date JJ/MM/AAAA
    ],
  });
  const sim = await importer(buf, { mode: 'simulation' });
  assert.equal(sim.status, 200);
  const adh = sim.json.data.feuilles.find((f) => f.id === 'adherents');
  assert.equal(adh.misAJour, 1);
  assert.equal(adh.erreurs.length, 1);
  assert.match(adh.erreurs[0].message, /Nom/, 'la ligne sans nom est refusée avec un message sur la colonne concernée');
  assert.equal(adh.erreurs[0].ligne, 3, 'numéro de ligne tel qu\'affiché dans Excel');
  const cot = sim.json.data.feuilles.find((f) => f.id === 'cotisations');
  assert.equal(cot.misAJour, 1);
  assert.equal(cot.erreurs.length, 1);

  // strict : une erreur => 422, rien d'écrit
  const strict = await importer(buf, { mode: 'import' });
  assert.equal(strict.status, 422);
  assert.equal(strict.json.data.applique, false);
  assert.equal((await h.call('GET', '/adherents/COSITI-0001', { token: daf })).data.profession, avantAdh.profession, 'rien n\'a été modifié');
  assert.equal(num((await h.query("SELECT COUNT(*) n FROM depenses_courantes WHERE numero_piece = 'LOY-IMPORT-1'"))[0].n), 0, 'aucune ligne valide n\'a été écrite non plus (tout ou rien)');
  assert.equal((await h.call('GET', '/journal?typeOperation=IMPORT_EXCEL_REJETE&pageSize=3', { token: daf })).data.length, 1, 'le refus est tracé');

  // tolérant : les lignes valides passent, les autres sont rapportées
  const ok = await importer(buf, { mode: 'import', ignorerErreurs: true });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.data.applique, true);
  assert.equal(ok.json.data.totaux.erreurs, 2);
  const apresAdh = (await h.call('GET', '/adherents/COSITI-0001', { token: daf })).data;
  assert.equal(apresAdh.profession, 'Directeur commercial');
  assert.equal(apresAdh.telephone, avantAdh.telephone, 'cellule vide => valeur existante conservée');
  const cotApres = (await h.call('GET', `/cotisations/${cotExistante.id}`, { token: daf })).data;
  assert.equal(cotApres.montant, 1500.5, '« 1 500,50 » compris');
  const dep = (await h.query("SELECT date_depense d, montant m, origine_fonds o FROM depenses_courantes WHERE numero_piece = 'LOY-IMPORT-1'"))[0];
  assert.equal(String(dep.d).slice(0, 10), '2026-03-15', 'date JJ/MM/AAAA convertie');
  assert.equal(num(dep.m), 250000);
  assert.equal(dep.o, 'Apport personnel du PCA', 'règle métier appliquée comme à la saisie (origine des fonds)');

  // idempotence : le même fichier réimporté ne double rien
  const rejoue = await importer(buf, { mode: 'import', ignorerErreurs: true });
  assert.equal(rejoue.json.data.totaux.crees, 0);
  assert.equal(num((await h.query("SELECT COUNT(*) n FROM depenses_courantes WHERE numero_piece = 'LOY-IMPORT-1'"))[0].n), 1);
  assert.ok(rejoue.json.data.totaux.doublons >= 1);
});

test('import : mêmes validations que la saisie (enum, montant, adhérent inconnu, radié, doublon de référence, frais > transaction)', async () => {
  const buf = classeur({
    Cotisations: [
      ['Matricule adhérent', 'Date de paiement', 'Montant (FCFA)', 'Mode de paiement', 'Référence'],
      ['COSITI-9999', '2026-07-01', 700, 'Espèces', null], // adhérent inconnu
      ['COSITI-0001', '2026-07-01', -5, 'Espèces', null], // montant négatif
      ['COSITI-0001', '2026-07-01', 700, 'Troc', null], // mode inconnu
      ['COSITI-0001', '2026-13-45', 700, 'Espèces', null], // date impossible
      ['COSITI-0001', '2026-07-01', 700.005, 'Espèces', null], // 3 décimales
    ],
    'Frais Mobile Money': [
      ['Date', 'Opérateur', 'Type de frais', 'Montant de la transaction (FCFA)', 'Frais prélevés (FCFA)', 'Référence de la transaction'],
      ['2026-07-01', 'Wave', 'Frais de retrait marchand', 1000, 5000, 'W-BAD'], // frais > transaction
    ],
  });
  const r = await importer(buf);
  assert.equal(r.status, 200);
  const cot = r.json.data.feuilles.find((f) => f.id === 'cotisations');
  assert.equal(cot.erreurs.length, 5, JSON.stringify(cot.erreurs));
  assert.equal(r.json.data.feuilles.find((f) => f.id === 'frais').erreurs.length, 1);
  assert.equal(r.json.data.ok, false);
  const refus = await importer(buf, { mode: 'import', role: 'daf' });
  assert.equal(refus.status, 422);
});

test('import : un adhérent radié ne peut pas recevoir de cotisation, la règle est la même que par l\'écran', async () => {
  const dg = await h.tokens.dg();
  const a = (await h.call('POST', '/adherents', { token: dg, body: { nom: 'Radie', prenom: 'Test', telephone: '+225 09 09 09 09', profession: 'Chauffeur' } })).data;
  await h.call('PATCH', `/adherents/${a.id}/statut`, { token: dg, body: { statut: 'Radié' } });
  const r = await importer(classeur({ Cotisations: [['Matricule adhérent', 'Date de paiement', 'Montant (FCFA)', 'Mode de paiement'], [a.matricule, '2026-07-02', 700, 'Espèces']] }));
  assert.match(r.json.data.feuilles[0].erreurs[0].message, /radié/i);
});

test('import : sécurité — code de confirmation, droits par feuille, droits de la route, fichier invalide', async () => {
  const buf = classeur({ Cotisations: [['Matricule adhérent', 'Date de paiement', 'Montant (FCFA)', 'Mode de paiement'], ['COSITI-0001', '2026-08-01', 900, 'Espèces']] });
  // import réel sans code / avec mauvais code
  assert.equal((await importer(buf, { mode: 'import', code: false })).status, 400);
  const mauvais = await h.callBinary('POST', '/excel/import?mode=import', { token: await h.tokens.daf(), body: buf, headers: { 'Content-Type': 'application/octet-stream', 'X-Confirmation-Code': '9999' } });
  assert.equal(mauvais.status, 403);
  assert.equal(num((await h.query("SELECT COUNT(*) n FROM cotisations WHERE date_paiement = '2026-08-01'"))[0].n), 0);
  // pas de jeton
  assert.equal((await h.callBinary('POST', '/excel/import', { body: buf, headers: { 'Content-Type': 'application/octet-stream' } })).status, 401);
  // profil sans aucun droit d'écriture
  assert.equal((await importer(buf, { role: 'pca' })).status, 403);
  assert.equal((await importer(buf, { role: 'cs' })).status, 403);
  // la caissière peut importer des cotisations mais pas des dépenses
  assert.equal((await importer(buf, { role: 'caisse' })).json.data.ok, true);
  const dep = classeur({ Dépenses: [['Date', 'Catégorie', 'Motif', 'Montant (FCFA)', 'Mode de paiement', 'Bénéficiaire', 'N° pièce'], ['2026-08-01', 'Loyer & Charges locatives', 'x', 100, 'Espèces / Caisse', 'x', 'X-1']] });
  const refus = await importer(dep, { role: 'caisse' });
  assert.equal(refus.json.data.ok, false);
  assert.match(refus.json.data.feuilles[0].erreurs[0].message, /ne permet pas/);
  // fichiers invalides
  assert.equal((await importer(Buffer.from('ceci n\'est pas un classeur'))).status, 400);
  assert.equal((await h.callBinary('POST', '/excel/import', { token: await h.tokens.daf(), body: Buffer.alloc(0), headers: { 'Content-Type': 'application/octet-stream' } })).status, 400);
  const sansFeuille = await importer(classeur({ 'Feuille inconnue': [['a'], ['b']] }));
  assert.equal(sansFeuille.status, 400);
});

test('import : feuilles et colonnes inconnues signalées sans bloquer ; en-têtes tolérants (casse, accents, unités)', async () => {
  const buf = classeur({
    'cotisations': [['matricule ADHERENT', 'date de paiement', 'montant', 'MODE DE PAIEMENT', 'Colonne inutile'], ['COSITI-0001', '2026-09-01', 800, 'Espèces', 'zzz']],
    'Brouillon perso': [['x'], [1]],
  });
  const r = await importer(buf);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const f = r.json.data.feuilles[0];
  assert.equal(f.crees, 1);
  assert.ok(f.avertissements.some((a) => a.includes('Colonne inutile')));
  assert.deepEqual(r.json.data.feuillesInconnues, ['Brouillon perso']);
});

test('import : les données déjà présentes ne sont jamais supprimées (un import ne retire aucune ligne)', async () => {
  const avant = await count('cotisations');
  const buf = classeur({ Cotisations: [['Matricule adhérent', 'Date de paiement', 'Montant (FCFA)', 'Mode de paiement'], ['COSITI-0002', '2026-09-02', 700, 'Wave']] });
  const r = await importer(buf, { mode: 'import', role: 'caisse' });
  assert.equal(r.status, 200);
  assert.equal(await count('cotisations'), avant + 1, 'le fichier ne contenait qu\'une ligne : les autres cotisations sont intactes');
});

test('import volumineux : 300 cotisations en une fois, total exact, un seul passage atomique', async () => {
  const dg = await h.tokens.dg();
  const adh = (await h.call('POST', '/adherents', { token: dg, body: { nom: 'Gros', prenom: 'Volume', telephone: '+225 01 11 11 11', profession: 'Grossiste' } })).data;
  const rows = [['Matricule adhérent', 'Date de paiement', 'Montant (FCFA)', 'Mode de paiement', 'Référence']];
  let attendu = 0;
  for (let i = 0; i < 300; i++) {
    const m = 700 + (i % 7) * 0.5;
    attendu = Math.round((attendu + m) * 100) / 100;
    rows.push([adh.matricule, '2026-10-01', m, i % 2 ? 'Wave' : 'Espèces', `VOL-${String(i).padStart(4, '0')}`]);
  }
  const avant = await sum('cotisations');
  const r = await importer(classeur({ Cotisations: rows }), { mode: 'import', role: 'caisse' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.data.totaux.crees, 300);
  assert.equal(Math.round((await sum('cotisations') - avant) * 100) / 100, attendu);
  const fiche = (await h.call('GET', `/adherents/${adh.id}`, { token: dg })).data;
  assert.equal(fiche.stats.totalCumule, attendu);
});

/* ============================================================================ non-régressions de la relecture indépendante */

/** Archive ZIP minimale (sans compression) : permet de fabriquer un .xlsx dont la plage DÉCLARÉE est mensongère. */
function zip(entrees) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const [nom, contenu] of Object.entries(entrees)) {
    const n = Buffer.from(nom);
    const d = Buffer.from(contenu);
    const crc = zlib.crc32(d);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(d.length, 18);
    local.writeUInt32LE(d.length, 22);
    local.writeUInt16LE(n.length, 26);
    parts.push(local, n, d);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(d.length, 20);
    c.writeUInt32LE(d.length, 24);
    c.writeUInt16LE(n.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(c, n);
    offset += 30 + n.length + d.length;
  }
  const cd = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(central.length / 2, 8);
  fin.writeUInt16LE(central.length / 2, 10);
  fin.writeUInt32LE(cd.length, 12);
  fin.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, fin]);
}
const xlsxPiege = (ref) =>
  zip({
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Cotisations" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${ref}"/><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Matricule adhérent</t></is></c></row></sheetData></worksheet>`,
  });

test('sécurité : un classeur minuscule qui DÉCLARE des millions de lignes / colonnes est refusé sans bloquer le serveur', async () => {
  const lignes = xlsxPiege('A1:AZ300000');
  assert.ok(lignes.length < 5000, 'le fichier piégé est minuscule');
  const t0 = Date.now();
  const r = await importer(lignes);
  assert.ok(Date.now() - t0 < 5000, `réponse en ${Date.now() - t0} ms (avant correction : plusieurs secondes à plusieurs heures)`);
  assert.ok([200, 400].includes(r.status));

  const t1 = Date.now();
  const colonnes = await importer(xlsxPiege('A1:XFD5'));
  assert.equal(colonnes.status, 400, 'trop de colonnes déclarées');
  assert.ok(Date.now() - t1 < 5000);
  const enorme = await importer(xlsxPiege('A1:XFD1048576'));
  assert.ok([200, 400].includes(enorme.status));
  assert.ok(Date.now() - t1 < 8000, 'même la plage maximale d\'Excel est traitée instantanément');
});

test('import : l\'assiette cotisable CNPS est réservée à la direction financière (et recalcule les bulletins)', async () => {
  const feuille = (matricule, montant) => classeur({ Adhérents: [['Matricule', 'Assiette cotisable CNPS (FCFA)'], [matricule, montant]] });
  const avant = num((await h.query("SELECT salaire_cotisable_cnps s FROM adherents WHERE matricule = 'COSITI-0002'"))[0].s);
  const refus = await importer(feuille('COSITI-0002', 91000), { role: 'caisse' });
  assert.equal(refus.status, 200);
  assert.match(refus.json.data.feuilles[0].erreurs[0].message, /direction financière/);
  assert.equal(num((await h.query("SELECT salaire_cotisable_cnps s FROM adherents WHERE matricule = 'COSITI-0002'"))[0].s), avant, 'inchangée');
  // même valeur par la caissière : sans effet, sans erreur
  assert.equal((await importer(feuille('COSITI-0002', avant), { role: 'caisse' })).json.data.ok, true);

  // la direction financière peut ; les bulletins brouillons sont recalculés
  const daf = await h.tokens.daf();
  await h.call('POST', '/paie/generer-adherents', { token: daf, body: { mois: '2028-01' } });
  const adh = (await h.call('GET', '/adherents/COSITI-0002', { token: daf })).data;
  const avantBulletin = (await h.call('GET', `/paie/bulletins?mois=2028-01&q=${adh.matricule}`, { token: daf })).data[0];
  const ok = await importer(feuille('COSITI-0002', 91000), { role: 'daf', mode: 'import' });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal(num((await h.query("SELECT salaire_cotisable_cnps s FROM adherents WHERE matricule = 'COSITI-0002'"))[0].s), 91000);
  const apres = (await h.call('GET', `/paie/bulletins?mois=2028-01&q=${adh.matricule}`, { token: daf })).data[0];
  assert.equal(apres.salaireBase, 91000, 'bulletin brouillon recalculé avec la nouvelle assiette');
  assert.notEqual(apres.netAPayer, avantBulletin.netAPayer);
});

test('import : deux paiements identiques d\'un MÊME fichier sont deux paiements ; le fichier rejoué ne double rien', async () => {
  const avant = num((await h.query("SELECT COUNT(*) n FROM cotisations WHERE matricule = 'COSITI-0004' AND date_paiement = '2026-12-05'"))[0].n);
  const buf = classeur({ Cotisations: [['Matricule adhérent', 'Date de paiement', 'Montant (FCFA)', 'Mode de paiement'], ['COSITI-0004', '2026-12-05', 700, 'Espèces'], ['COSITI-0004', '2026-12-05', 700, 'Espèces']] });
  const r = await importer(buf, { mode: 'import', role: 'caisse' });
  assert.equal(r.json.data.totaux.crees, 2, 'deux encaissements réels de 700 F le même jour');
  assert.equal(num((await h.query("SELECT COUNT(*) n FROM cotisations WHERE matricule = 'COSITI-0004' AND date_paiement = '2026-12-05'"))[0].n), avant + 2);
  const rejoue = await importer(buf, { mode: 'import', role: 'caisse' });
  assert.equal(rejoue.json.data.totaux.crees, 0, 'rejouer le fichier ne crée rien');
  assert.equal(rejoue.json.data.totaux.doublons, 2);
});

test('import : changer la date d\'une cotisation recalcule le mois et l\'année ; « 1.500 » est lu 1500', async () => {
  const caisse = await h.tokens.caisse();
  const c = (await h.call('POST', '/cotisations', { token: caisse, body: { matricule: 'COSITI-0005', datePaiement: '2026-02-10', montant: 1000, modePaiement: 'Espèces', reference: 'REF-PERIODE-1' } })).data;
  assert.equal(c.mois, 'Février');
  // le fichier garde l'ancien « Mois » / « Année » mais change la date et écrit le montant avec un point de milliers
  const buf = classeur({ Cotisations: [['ID (ne pas modifier)', 'Date de paiement', 'Montant (FCFA)', 'Mois', 'Année'], [c.id, '2026-05-20', '1.500', 'Février', 2026]] });
  const r = await importer(buf, { mode: 'import', role: 'daf' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const apres = (await h.call('GET', `/cotisations/${c.id}`, { token: caisse })).data;
  assert.equal(apres.mois, 'Mai');
  assert.equal(apres.annee, 2026);
  assert.equal(apres.montant, 1500);
});
