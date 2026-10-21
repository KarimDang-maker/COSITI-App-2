// DONNÉES FINANCIÈRES — priorité critique : précision au centime, cohérence calculs ↔ MySQL, intégrité, atomicité,
// concurrence, persistance après redémarrage. Base jetable `cositi_test_finances`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot, CONFIRM } from './_harness.js';

let h;
let repos;
before(async () => {
  h = await boot('cositi_test_finances');
  ({ repos } = await import('../src/db/repository.js'));
});
after(async () => h.close());

const num = (v) => Number(v ?? 0);
const sqlSum = async (table, col = 'montant') => num((await h.query(`SELECT COALESCE(SUM(${col}), 0) AS s FROM ${table}`))[0].s);
const synthese = async (query = '') => (await h.call('GET', `/finances/synthese${query}`, { token: await h.tokens.daf() })).data;

const depenseBody = (over = {}) => ({
  date: '2026-06-10',
  categorie: 'Fournitures de bureau & Imprimés',
  motif: 'Achat de rames de papier',
  montant: 15000,
  modePaiement: 'Espèces / Caisse',
  beneficiaire: 'Papeterie Centrale',
  numeroPiece: 'FAC-001',
  ...over,
});

async function nouvelAdherent(over = {}) {
  const r = await h.call('POST', '/adherents', {
    token: await h.tokens.dg(),
    body: { nom: 'Testeur', prenom: 'Fin', telephone: '+225 07 00 00 00', profession: 'Couturier', cni: `CNI-${Math.random().toString(36).slice(2, 10)}`, ...over },
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.data;
}

/* ====================================================================== précision monétaire */

test('montants : validation stricte (2 décimales max, positif, borné) — refus avant d\'atteindre la base', async () => {
  const token = await h.tokens.daf();
  for (const montant of [100.005, -5, 0, 'abc', 1e15, null]) {
    const r = await h.call('POST', '/depenses', { token, body: depenseBody({ montant }) });
    assert.equal(r.status, 400, `montant ${montant} doit être refusé : ${JSON.stringify(r.body)}`);
  }
  const frais = await h.call('POST', '/frais-mobile-money', { token, body: { date: '2026-06-10', operateur: 'Wave', typeFrais: 'Frais de retrait marchand', montantTransaction: 1000, fraisPreleves: 10.123, referenceTransaction: 'R-DEC' } });
  assert.equal(frais.status, 400, 'frais à 3 décimales refusés');
  assert.equal(await h.query('SELECT COUNT(*) n FROM depenses_courantes WHERE numero_piece = ?', ['FAC-001']).then((r) => num(r[0].n)), 0, 'rien n\'a été écrit');
});

test('arithmétique exacte : 0,10 + 0,20 = 0,30 dans les totaux (pas de 0,30000000000000004)', async () => {
  const token = await h.tokens.daf();
  const avant = (await synthese()).global.depenses.total;
  for (const montant of [0.1, 0.2]) {
    const r = await h.call('POST', '/depenses', { token, body: depenseBody({ montant, numeroPiece: `CENT-${montant}` }) });
    assert.equal(r.status, 201, JSON.stringify(r.body));
  }
  const apres = (await synthese()).global.depenses.total;
  assert.equal(Math.round((apres - avant) * 100) / 100, 0.3);
  assert.equal(Number.isInteger(Math.round(apres * 100)), true);
  assert.equal(String(apres).length < 14, true, `pas de bruit de virgule flottante : ${apres}`);
  assert.equal(apres, await sqlSum('depenses_courantes'), 'total du serveur = SUM() de MySQL au centime');
});

test('un montant décimal est stocké et relu à l\'identique (DECIMAL(15,2))', async () => {
  const token = await h.tokens.daf();
  const r = await h.call('POST', '/depenses', { token, body: depenseBody({ montant: 1234567.89, numeroPiece: 'DEC-1' }) });
  assert.equal(r.status, 201);
  assert.equal(r.data.montant, 1234567.89);
  const [row] = await h.query('SELECT montant FROM depenses_courantes WHERE id = ?', [r.data.id]);
  assert.equal(row.montant, 1234567.89);
  await h.restartDb();
  assert.equal((await h.call('GET', `/depenses/${r.data.id}`, { token })).data.montant, 1234567.89, 'identique après redémarrage');
});

/* ====================================================================== cotisations */

test('cotisation : écrite en base, cumul adhérent et seuil recalculés par le serveur', async () => {
  const token = await h.tokens.caisse();
  const adh = await nouvelAdherent();
  let attendu = 0;
  for (const [i, montant] of [7000, 7000.5, 1500].entries()) {
    const r = await h.call('POST', '/cotisations', { token, body: { adherentId: adh.id, datePaiement: `2026-03-0${i + 1}`, montant, modePaiement: i === 1 ? 'Wave' : 'Espèces' } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    attendu = Math.round((attendu + montant) * 100) / 100;
    const [row] = await h.query('SELECT montant, matricule FROM cotisations WHERE id = ?', [r.data.id]);
    assert.equal(row.montant, montant);
    assert.equal(row.matricule, adh.matricule);
  }
  const fiche = (await h.call('GET', `/adherents/${adh.id}`, { token })).data;
  assert.equal(fiche.stats.totalCumule, attendu);
  assert.equal(fiche.stats.totalCumule, 15500.5);
  assert.equal(fiche.statutImmatriculation, 'Éligible (seuil atteint)', 'seuil de 15 000 FCFA franchi => éligible, écrit en base');
  const [db] = await h.query('SELECT statut_immatriculation s FROM adherents WHERE id = ?', [adh.id]);
  assert.equal(db.s, 'Éligible (seuil atteint)');
});

test('cotisation refusée : aucune écriture, aucun résidu (atomicité)', async () => {
  const token = await h.tokens.dg();
  const adh = await nouvelAdherent();
  await h.call('PATCH', `/adherents/${adh.id}/statut`, { token, body: { statut: 'Radié', motif: 'test' } });
  const avant = { cot: num((await h.query('SELECT COUNT(*) n FROM cotisations'))[0].n), jr: num((await h.query('SELECT COUNT(*) n FROM journal_operations'))[0].n) };
  const r = await h.call('POST', '/cotisations', { token, body: { adherentId: adh.id, datePaiement: '2026-03-01', montant: 700, modePaiement: 'Espèces' } });
  assert.equal(r.status, 400);
  assert.equal(num((await h.query('SELECT COUNT(*) n FROM cotisations'))[0].n), avant.cot);
  assert.equal(num((await h.query('SELECT COUNT(*) n FROM journal_operations'))[0].n), avant.jr, 'pas de journal pour une opération refusée');
});

test('concurrence : 15 cotisations simultanées => toutes écrites, références uniques, total exact', async () => {
  const token = await h.tokens.caisse();
  const adh = await nouvelAdherent();
  const montants = Array.from({ length: 15 }, (_, i) => 700 + i * 1.5);
  const avant = await sqlSum('cotisations');
  const res = await Promise.all(montants.map((montant) => h.call('POST', '/cotisations', { token, body: { adherentId: adh.id, datePaiement: '2026-04-01', montant, modePaiement: 'Espèces' } })));
  assert.deepEqual([...new Set(res.map((r) => r.status))], [201], JSON.stringify(res.filter((r) => r.status !== 201).map((r) => r.body)));
  assert.equal(new Set(res.map((r) => r.data.reference)).size, 15, 'références uniques');
  const delta = Math.round((await sqlSum('cotisations') - avant) * 100) / 100;
  assert.equal(delta, Math.round(montants.reduce((s, m) => s + m, 0) * 100) / 100);
  const fiche = (await h.call('GET', `/adherents/${adh.id}`, { token })).data;
  assert.equal(fiche.cotisations.length, 15);
});

test('concurrence : 8 adhérents créés en même temps => matricules uniques et séquence cohérente', async () => {
  const token = await h.tokens.dg();
  const avant = (await h.call('GET', '/parametres', { token })).data.dernierNumeroMatricule;
  const res = await Promise.all(Array.from({ length: 8 }, (_, i) => h.call('POST', '/adherents', { token, body: { nom: `Para${i}`, prenom: 'Llele', telephone: '+225 01 02 03 04', profession: 'Maçon', cni: `PARA-${i}-${Date.now()}` } })));
  assert.deepEqual([...new Set(res.map((r) => r.status))], [201], JSON.stringify(res.filter((r) => r.status !== 201).map((r) => r.body)));
  const matricules = res.map((r) => r.data.matricule);
  assert.equal(new Set(matricules).size, 8);
  const apres = (await h.call('GET', '/parametres', { token })).data.dernierNumeroMatricule;
  assert.equal(apres, avant + 8, 'la séquence avance exactement du nombre de créations');
  const nums = matricules.map((m) => Number(m.split('-')[1])).sort((a, b) => a - b);
  assert.deepEqual(nums, Array.from({ length: 8 }, (_, i) => avant + 1 + i), 'aucun trou, aucun doublon');
});

/* ====================================================================== frais mobile money & versements */

test('frais Mobile Money : net = transaction − frais, recalculé à la modification, persisté', async () => {
  const token = await h.tokens.daf();
  const c = await h.call('POST', '/frais-mobile-money', { token, body: { date: '2026-06-11', operateur: 'Orange Money', typeFrais: 'Frais de retrait marchand', montantTransaction: 50000, fraisPreleves: 250.5, referenceTransaction: 'OM-FIN-1' } });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  assert.equal(c.data.montantNet, 49749.5);
  const u = await h.call('PUT', `/frais-mobile-money/${c.data.id}`, { token, body: { fraisPreleves: 1000 } });
  assert.equal(u.status, 200);
  assert.equal(u.data.montantNet, 49000);
  const [row] = await h.query('SELECT frais_preleves f, montant_net n FROM frais_mobile_money WHERE id = ?', [c.data.id]);
  assert.deepEqual({ f: row.f, n: row.n }, { f: 1000, n: 49000 });
  const bad = await h.call('PUT', `/frais-mobile-money/${c.data.id}`, { token, body: { fraisPreleves: 60000 } });
  assert.equal(bad.status, 400, 'frais > transaction refusés');
  assert.equal((await h.call('GET', `/frais-mobile-money/${c.data.id}`, { token })).data.fraisPreleves, 1000, 'valeur inchangée après refus');
});

test('versement : tranche de cotisations recalculée quand la date change', async () => {
  const token = await h.tokens.daf();
  const adh = await nouvelAdherent();
  const cot = await h.call('POST', '/cotisations', { token: await h.tokens.caisse(), body: { adherentId: adh.id, datePaiement: '2026-05-20', montant: 3000, modePaiement: 'Espèces' } });
  const v = await h.call('POST', '/versements', { token, body: { date: '2026-05-01', banque: 'BICICI', numeroBordereau: 'BRD-FIN-1', montant: 1000, sourceFonds: 'Recettes Cotisations Adhérents', deposant: 'DAF' } });
  assert.equal(v.status, 201, JSON.stringify(v.body));
  assert.notEqual(v.data.arretCotisationId, cot.data.id, 'à la date du 1er mai la cotisation du 20 mai n\'est pas couverte');
  const u = await h.call('PUT', `/versements/${v.data.id}`, { token, body: { date: '2026-05-31' } });
  assert.equal(u.status, 200, JSON.stringify(u.body));
  assert.equal(u.data.arretCotisationId, cot.data.id, 'le point d\'arrêt suit la nouvelle date');
  assert.ok(u.data.nbCotisationsIncluses >= 1);
  const [row] = await h.query('SELECT arret_cotisation_id a FROM versements_bancaires WHERE id = ?', [v.data.id]);
  assert.equal(row.a, cot.data.id, 'recalcul persisté');
});

/* ====================================================================== synthèse = SQL */

test('synthèse financière : chaque total du serveur égale le calcul direct sur MySQL', async () => {
  const s = await synthese();
  const g = s.global;
  assert.equal(g.cotisations.total, await sqlSum('cotisations'));
  assert.equal(g.cotisations.nombre, num((await h.query('SELECT COUNT(*) n FROM cotisations'))[0].n));
  assert.equal(g.depenses.total, await sqlSum('depenses_courantes'));
  assert.equal(g.versements.total, await sqlSum('versements_bancaires'));
  assert.equal(g.fraisMobileMoney.totalFrais, await sqlSum('frais_mobile_money', 'frais_preleves'));
  assert.equal(g.fraisMobileMoney.totalNet, await sqlSum('frais_mobile_money', 'montant_net'));
  // réserve CNPS & solde réel en banque
  assert.equal(g.reserveCnps.totalReserve, g.cotisations.total);
  assert.equal(g.reserveCnps.soldeReelBanque, Math.round((g.versements.total - g.cotisations.total) * 100) / 100);
  // ventilation exploitation + apport = total des dépenses
  assert.equal(Math.round((g.depenses.exploitationCnps.total + g.depenses.apportPca.total) * 100) / 100, g.depenses.total);
  // ventilation par mode = total
  assert.equal(Math.round(Object.values(g.cotisations.parMode).reduce((a, b) => a + b, 0) * 100) / 100, g.cotisations.total);
  assert.equal(Math.round(Object.values(g.depenses.parCategorie).reduce((a, b) => a + b, 0) * 100) / 100, g.depenses.total);
  assert.equal(Math.round(Object.values(g.versements.parBanque).reduce((a, b) => a + b, 0) * 100) / 100, g.versements.total);
  // suivi : cotisations en attente de versement
  const attente = (await h.call('GET', '/versements/suivi/en-attente', { token: await h.tokens.daf() })).data;
  assert.equal(s.suiviVersements.cotisationsEnAttente.nombre, attente.nombre);
  assert.equal(s.suiviVersements.cotisationsEnAttente.total, attente.totalMontant);
});

test('synthèse sur une période : bloc `periode` = SQL filtré par dates', async () => {
  const s = await synthese('?du=2026-03-01&au=2026-03-31');
  assert.equal(s.periode.du, '2026-03-01');
  const cot = num((await h.query("SELECT COALESCE(SUM(montant),0) s FROM cotisations WHERE date_paiement BETWEEN '2026-03-01' AND '2026-03-31'"))[0].s);
  const dep = num((await h.query("SELECT COALESCE(SUM(montant),0) s FROM depenses_courantes WHERE date_depense BETWEEN '2026-03-01' AND '2026-03-31'"))[0].s);
  assert.equal(s.periode.cotisations.total, cot);
  assert.equal(s.periode.depenses.total, dep);
  assert.ok(s.global.cotisations.total >= s.periode.cotisations.total);
});

test('synthèse : réserve par adhérent (detail=reserves) = cotisations de chaque adhérent', async () => {
  const s = await synthese('?detail=reserves');
  assert.ok(s.reservesAdherents.length > 0);
  const total = Math.round(s.reservesAdherents.reduce((a, r) => a + r.montantReserve, 0) * 100) / 100;
  assert.equal(total, s.global.reserveCnps.totalReserve, 'la somme des réserves individuelles = réserve globale');
});

test('finances : accès réservé à la direction financière', async () => {
  for (const role of ['caisse', 'pca', 'cs']) {
    const t = await h.tokens[role]();
    assert.equal((await h.call('GET', '/finances/synthese', { token: t })).status, 403, role);
    assert.equal((await h.call('GET', '/finances/controle', { token: t })).status, 403, role);
  }
  assert.equal((await h.call('GET', '/finances/synthese')).status, 401);
});

/* ====================================================================== paie ↔ comptabilité */

test('paie : validation => UNE dépense = somme des nets ; revalidation après modification => dépense resynchronisée', async () => {
  const token = await h.tokens.daf();
  assert.equal((await h.call('POST', '/paie/generer', { token, body: { mois: '2027-01' } })).status, 200);
  const v1 = await h.call('POST', '/paie/valider', { token, body: { mois: '2027-01' } });
  assert.equal(v1.status, 200, JSON.stringify(v1.body));
  const netSql = async () => num((await h.query("SELECT COALESCE(SUM(net_a_payer),0) s FROM bulletins_paie WHERE mois = '2027-01' AND type_beneficiaire <> 'ADHERENT_CNPS'"))[0].s);
  const depSql = async () => (await h.query("SELECT montant FROM depenses_courantes WHERE numero_piece = 'PAIE-2027-01'")).map((r) => num(r.montant));
  assert.deepEqual(await depSql(), [await netSql()], 'une seule écriture, égale à la masse salariale nette');
  assert.equal(v1.data.totalNetPersonnel, await netSql());

  // on repasse un bulletin en brouillon, on augmente une prime, on revalide
  const liste = (await h.call('GET', '/paie/bulletins?mois=2027-01&typeBeneficiaire=EMPLOYE', { token })).data;
  const b = liste[0];
  const maj = await h.call('PUT', `/paie/bulletins/${b.id}`, { token, body: { statut: 'Brouillon', primeRendement: 75000.5 } });
  assert.equal(maj.status, 200, JSON.stringify(maj.body));
  assert.ok(maj.data.netAPayer !== b.netAPayer, 'le serveur a recalculé le net');
  const v2 = await h.call('POST', '/paie/valider', { token, body: { mois: '2027-01' } });
  assert.equal(v2.status, 200);
  assert.deepEqual(await depSql(), [await netSql()], 'toujours UNE écriture, montant mis à jour');
  assert.equal((await h.call('GET', '/finances/controle', { token })).data.anomalies.filter((a) => a.code === 'PAIE_DEPENSE_ECART').length, 0);

  // la dépense de paie est protégée
  const dep = (await h.call('GET', '/depenses?q=PAIE-2027-01', { token })).data[0];
  assert.equal((await h.call('DELETE', `/depenses/${dep.id}`, { token, headers: CONFIRM })).status, 409);
  assert.equal((await h.call('PUT', `/depenses/${dep.id}`, { token, body: { montant: 1 } })).status, 409);
});

test('paie : le serveur ne fait jamais confiance aux totaux envoyés', async () => {
  const token = await h.tokens.daf();
  const b = (await h.call('GET', '/paie/bulletins?mois=2027-01&typeBeneficiaire=EMPLOYE', { token })).data.find((x) => x.statut === 'Brouillon' || true);
  await h.call('PUT', `/paie/bulletins/${b.id}`, { token, body: { statut: 'Brouillon' } });
  const r = await h.call('PUT', `/paie/bulletins/${b.id}`, { token, body: { netAPayer: 999999999, totalGainsBruts: 1, indemniteTransport: 20000 } });
  assert.equal(r.status, 200);
  assert.notEqual(r.data.netAPayer, 999999999);
  assert.ok(r.data.totalGainsBruts > 20000);
  const [row] = await h.query('SELECT net_a_payer n FROM bulletins_paie WHERE id = ?', [b.id]);
  assert.equal(row.n, r.data.netAPayer);
});

/* ====================================================================== contrôle d'intégrité */

test('contrôle d\'intégrité : détecte une cotisation orpheline, un net incohérent, un total de rapport faux, un écart de paie', async () => {
  const token = await h.tokens.daf();
  // Le test précédent a laissé un bulletin en brouillon : l'écart avec la dépense de paie est signalé, mais comme simple avertissement
  const transitoire = (await h.call('GET', '/finances/controle', { token })).data;
  assert.equal(transitoire.ok, true, 'paie en cours de révision : pas une erreur');
  assert.ok(transitoire.anomalies.some((a) => a.code === 'PAIE_DEPENSE_ECART' && a.gravite === 'avertissement'));
  await h.call('POST', '/paie/valider', { token, body: { mois: '2027-01' } }); // revalidation : la dépense se resynchronise

  const propre = (await h.call('GET', '/finances/controle', { token })).data;
  assert.equal(propre.ok, true, JSON.stringify(propre.anomalies.filter((a) => a.gravite === 'erreur')));
  assert.equal(propre.anomalies.filter((a) => a.code === 'PAIE_DEPENSE_ECART').length, 0, 'plus aucun écart après revalidation');
  assert.ok(propre.verifie.cotisations > 0 && propre.verifie.bulletins > 0);

  // corruptions directes en base (hors API) : le contrôle doit les voir
  const orphan = await repos.cotisations.insert({ id: 'cot-orphan', adherentId: 'inexistant', matricule: 'COSITI-9999', adherentNomPrenom: 'Fantôme', datePaiement: '2026-06-01', montant: 500, modePaiement: 'Espèces', reference: 'REC-ORPH', mois: 'Juin', annee: 2026, agentEnregistreur: 'x', createdAt: new Date().toISOString() });
  const frais = (await h.call('GET', '/frais-mobile-money?pageSize=1', { token })).data[0];
  await repos.frais_mobile_money.patch(frais.id, { montantNet: 1 });
  const rapport = await h.call('POST', '/rapports-agents', { token, body: { dateRapport: '2026-06-01', agentNom: 'Agent X', zoneSecteur: 'Zone', typeMission: 'Collecte', adherentsVisites: 1, adherentsCotisants: 1, nouvellesAdhesions: 0, montantEspecesRemis: 1000, montantMobileMoneyDeclare: 500, conformiteCaisse: 'Conforme (Fonds complets)' } });
  assert.equal(rapport.status, 201, JSON.stringify(rapport.body));
  assert.equal(rapport.data.montantTotalCollecte, 1500);
  await repos.rapports_agents.patch(rapport.data.id, { montantTotalCollecte: 99 });
  const depPaie = (await h.call('GET', '/depenses?q=PAIE-2027-01', { token })).data[0];
  await repos.depenses.patch(depPaie.id, { montant: depPaie.montant + 1000 });

  const sale = (await h.call('GET', '/finances/controle', { token })).data;
  const codes = sale.anomalies.map((a) => a.code);
  assert.equal(sale.ok, false);
  for (const c of ['COTISATION_ORPHELINE', 'FRAIS_NET_INCOHERENT', 'RAPPORT_AGENT_TOTAL', 'PAIE_DEPENSE_ECART']) assert.ok(codes.includes(c), `${c} non détecté : ${codes}`);
  assert.ok(sale.resume.erreurs >= 4);

  // remise en état => le contrôle repasse au vert
  await repos.cotisations.delete(orphan.id);
  await repos.frais_mobile_money.patch(frais.id, { montantNet: frais.montantNet });
  await repos.rapports_agents.delete(rapport.data.id);
  await repos.depenses.patch(depPaie.id, { montant: depPaie.montant });
  assert.equal((await h.call('GET', '/finances/controle', { token })).data.ok, true);
});

/* ====================================================================== robustesse & persistance */

test('erreurs MySQL : correspondance vers des statuts HTTP clairs (jamais de 500 pour une donnée refusée)', async () => {
  const { errorHandler } = await import('../src/middleware/errorHandler.js');
  const call = (code) => {
    let out;
    const res = { status(s) { out = { s }; return this; }, json(b) { out.b = b; return this; } };
    errorHandler(Object.assign(new Error('x'), { code }), { method: 'GET', originalUrl: '/x' }, res, () => {});
    return out;
  };
  assert.equal(call('ER_DUP_ENTRY').s, 409);
  assert.equal(call('ER_DATA_TOO_LONG').s, 400);
  assert.equal(call('ER_WARN_DATA_OUT_OF_RANGE').s, 400);
  assert.equal(call('ER_LOCK_DEADLOCK').s, 503);
  assert.equal(call('ER_QUELQUE_CHOSE_D_INCONNU').s, 500);
});

test('doublons : CNI, référence de cotisation, numéro CNPS refusés avec 409', async () => {
  const token = await h.tokens.dg();
  const a = await nouvelAdherent({ cni: 'CNI-DOUBLON-1' });
  const dup = await h.call('POST', '/adherents', { token, body: { nom: 'Autre', prenom: 'X', telephone: '+225 01 01 01 01', profession: 'Menuisier', cni: 'CNI-DOUBLON-1' } });
  assert.equal(dup.status, 409);
  const c1 = await h.call('POST', '/cotisations', { token, body: { adherentId: a.id, datePaiement: '2026-06-01', montant: 700, modePaiement: 'Espèces', reference: 'REF-UNIQUE-1' } });
  assert.equal(c1.status, 201);
  const c2 = await h.call('POST', '/cotisations', { token, body: { adherentId: a.id, datePaiement: '2026-06-02', montant: 700, modePaiement: 'Espèces', reference: 'REF-UNIQUE-1' } });
  assert.equal(c2.status, 409);
});

test('PERSISTANCE : après redémarrage (pool MySQL fermé puis rouvert) tous les totaux financiers sont identiques', async () => {
  const sans = (s) => JSON.parse(JSON.stringify(s, (k, v) => (k === 'genereLe' ? undefined : v)));
  const avant = sans(await synthese('?detail=reserves'));
  const compteurs = await h.query('SELECT (SELECT COUNT(*) FROM cotisations) c, (SELECT COUNT(*) FROM depenses_courantes) d, (SELECT COUNT(*) FROM versements_bancaires) v, (SELECT COUNT(*) FROM frais_mobile_money) f, (SELECT COUNT(*) FROM bulletins_paie) b, (SELECT COUNT(*) FROM journal_operations) j');
  await h.restartDb();
  const apres = sans(await synthese('?detail=reserves'));
  assert.deepEqual(apres, avant, 'synthèse identique après redémarrage');
  const compteurs2 = await h.query('SELECT (SELECT COUNT(*) FROM cotisations) c, (SELECT COUNT(*) FROM depenses_courantes) d, (SELECT COUNT(*) FROM versements_bancaires) v, (SELECT COUNT(*) FROM frais_mobile_money) f, (SELECT COUNT(*) FROM bulletins_paie) b, (SELECT COUNT(*) FROM journal_operations) j');
  assert.deepEqual(compteurs2, compteurs);
  // le redémarrage n'a ni réimporté ni écrasé : la donnée de test créée plus haut est toujours là
  assert.equal(num((await h.query("SELECT COUNT(*) n FROM depenses_courantes WHERE numero_piece = 'DEC-1'"))[0].n), 1);
});

test('chaque opération financière laisse une trace au journal, avec son auteur', async () => {
  const token = await h.tokens.daf();
  const r = await h.call('POST', '/depenses', { token, body: depenseBody({ numeroPiece: 'TRACE-1', montant: 4321 }) });
  assert.equal(r.status, 201);
  const j = (await h.call('GET', '/journal?typeOperation=ENREGISTREMENT_DEPENSE&pageSize=5', { token })).data;
  assert.ok(j.some((e) => e.description.includes('4') && e.utilisateur && e.role === 'DAF'));
  const d = await h.call('DELETE', `/depenses/${r.data.id}`, { token, headers: CONFIRM });
  assert.equal(d.status, 200);
  assert.equal(num((await h.query('SELECT COUNT(*) n FROM depenses_courantes WHERE id = ?', [r.data.id]))[0].n), 0, 'supprimée en base');
  assert.ok((await h.call('GET', '/journal?typeOperation=SUPPRESSION_DEPENSE&pageSize=5', { token })).data.length >= 1);
});

/* ====================================================================== non-régressions de la relecture indépendante */

test('montants : chaînes vides, null, booléens, notation 0x / exposant et montants inférieurs au centime sont refusés', async () => {
  const token = await h.tokens.daf();
  for (const montant of ['', null, true, [], '0x10', '1e3', '  ', 1e-9, 0.001, '12,5', 'NaN']) {
    const r = await h.call('POST', '/depenses', { token, body: depenseBody({ montant, numeroPiece: 'MONTANT-BAD' }) });
    assert.equal(r.status, 400, `montant ${JSON.stringify(montant)} doit être refusé (obtenu ${r.status})`);
  }
  // champs « money » (non positifs) : vide / null ne valent plus 0 en silence
  for (const fraisPreleves of ['', null, false, '0x1']) {
    const r = await h.call('POST', '/frais-mobile-money', { token, body: { date: '2026-06-12', operateur: 'Wave', typeFrais: 'Frais de retrait marchand', montantTransaction: 1000, fraisPreleves, referenceTransaction: 'W-VIDE' } });
    assert.equal(r.status, 400, `frais ${JSON.stringify(fraisPreleves)}`);
  }
  assert.equal(num((await h.query("SELECT COUNT(*) n FROM depenses_courantes WHERE numero_piece = 'MONTANT-BAD'"))[0].n), 0);
  // valeurs valides : chaîne numérique propre acceptée, normalisée au centime
  const ok = await h.call('POST', '/depenses', { token, body: depenseBody({ montant: '1234.50', numeroPiece: 'MONTANT-OK' }) });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  assert.equal(ok.data.montant, 1234.5);
  const zero = await h.call('POST', '/frais-mobile-money', { token, body: { date: '2026-06-12', operateur: 'Wave', typeFrais: 'Frais de retrait marchand', montantTransaction: 1000, fraisPreleves: 0, referenceTransaction: 'W-ZERO' } });
  assert.equal(zero.status, 201, 'zéro frais reste valide');
});

test('paie : deux validations simultanées du même mois ne créent QU\'UNE écriture de dépense', async () => {
  const token = await h.tokens.daf();
  await h.call('POST', '/paie/generer', { token, body: { mois: '2028-02' } });
  const res = await Promise.all([1, 2, 3].map(() => h.call('POST', '/paie/valider', { token, body: { mois: '2028-02' } })));
  assert.ok(res.every((r) => r.status === 200), JSON.stringify(res.map((r) => r.status)));
  assert.equal(num((await h.query("SELECT COUNT(*) n FROM depenses_courantes WHERE numero_piece = 'PAIE-2028-02'"))[0].n), 1);
  const ids = new Set(res.map((r) => r.data.depenseId));
  assert.equal(ids.size, 1, 'les trois réponses désignent la même dépense');
});

test('référence de cotisation : l\'unicité est garantie par la base (index UNIQUE), pas seulement par l\'application', async () => {
  const [ligne] = await h.query("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cotisations' AND INDEX_NAME = 'uq_cotis_reference' LIMIT 1");
  assert.ok(ligne, 'index uq_cotis_reference présent');
  await assert.rejects(
    h.query("INSERT INTO cotisations (id, adherent_id, matricule, adherent_nom_prenom, date_paiement, montant, mode_paiement, reference, mois, annee, agent_enregistreur) SELECT 'dup-1', adherent_id, matricule, adherent_nom_prenom, date_paiement, montant, mode_paiement, reference, mois, annee, agent_enregistreur FROM cotisations LIMIT 1"),
    (e) => e.code === 'ER_DUP_ENTRY'
  );
});
