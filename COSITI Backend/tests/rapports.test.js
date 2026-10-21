// MODÈLES DE LECTURE CALCULÉS PAR LE SERVEUR (rapprochement, état mensuel, tableau de bord, versements, paie) :
// chaque chiffre est recoupé avec un calcul SQL indépendant. Base jetable `cositi_test_rapports`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot } from './_harness.js';

let h;
before(async () => {
  h = await boot('cositi_test_rapports');
});
after(async () => h.close());

const num = (v) => Number(v ?? 0);
const r2 = (n) => Math.round(n * 100) / 100;
const sql = async (q, p = []) => (await h.query(q, p))[0];

test('rapprochement global : solde réel en banque = versements − réserve CNPS ; flux = SQL', async () => {
  const token = await h.tokens.daf();
  const r = (await h.call('GET', '/rapports/rapprochement', { token })).data;
  const vrs = num((await sql('SELECT SUM(montant) s FROM versements_bancaires')).s);
  const cot = num((await sql('SELECT SUM(montant) s FROM cotisations')).s);
  const dep = num((await sql('SELECT SUM(montant) s FROM depenses_courantes')).s);
  assert.equal(r.fondsBanque.total, vrs);
  assert.equal(r.fondsBanque.nombre, 3);
  assert.equal(r.reserveCnps.total, cot, 'réserve = cotisations perçues');
  assert.equal(r.soldeReelBanque, r2(vrs - cot));
  assert.equal(r.tauxCouverture, r2((vrs / cot) * 100));
  assert.equal(r.flux.encaissements.total, cot);
  assert.equal(r2(r.flux.decaissementsExploitation.total + r.flux.decaissementsApportPca.total), dep);
  assert.equal(r.flux.totalDecaissements, dep);
  assert.equal(r.flux.soldeNet, r2(cot - dep));
  assert.equal(r2(r.reserveCnps.adherents.reduce((s, a) => s + a.montantReserve, 0)), cot, 'somme des réserves individuelles = réserve globale');
  // origine des fonds : lue de la règle métier serveur (pas du front)
  const exp = (await h.query("SELECT COALESCE(SUM(montant),0) s FROM depenses_courantes WHERE origine_fonds = 'Exploitation (Cotisations CNPS)'"))[0].s;
  assert.equal(r.flux.decaissementsExploitation.total, num(exp));
});

test('rapprochement par mois, par banque et base « seuil »', async () => {
  const token = await h.tokens.daf();
  const mars = (await h.call('GET', '/rapports/rapprochement?periode=MOIS&mois=Mars&annee=2026', { token })).data;
  const cot = num((await sql("SELECT COALESCE(SUM(montant),0) s FROM cotisations WHERE mois = 'Mars' AND annee = 2026")).s);
  const vrs = num((await sql("SELECT COALESCE(SUM(montant),0) s FROM versements_bancaires WHERE date_versement BETWEEN '2026-03-01' AND '2026-03-31'")).s);
  const dep = num((await sql("SELECT COALESCE(SUM(montant),0) s FROM depenses_courantes WHERE date_depense BETWEEN '2026-03-01' AND '2026-03-31'")).s);
  assert.equal(mars.reserveCnps.total, cot);
  assert.equal(mars.fondsBanque.total, vrs);
  assert.equal(mars.flux.totalDecaissements, dep);
  assert.equal(mars.periode.mode, 'MOIS');

  const banque = (await sql('SELECT banque FROM versements_bancaires LIMIT 1')).banque;
  const filtre = (await h.call('GET', `/rapports/rapprochement?banque=${encodeURIComponent(banque)}`, { token })).data;
  assert.equal(filtre.fondsBanque.total, num((await sql('SELECT SUM(montant) s FROM versements_bancaires WHERE banque = ?', [banque])).s));

  const seuil = (await h.call('GET', '/rapports/rapprochement?base=SEUIL', { token })).data;
  const params = (await h.call('GET', '/parametres', { token })).data;
  for (const a of seuil.reserveCnps.adherents) assert.ok(a.montantReserve <= params.seuilImmatriculation, `${a.matricule} plafonné au seuil`);

  assert.equal((await h.call('GET', '/rapports/rapprochement?periode=MOIS', { token })).status, 400, 'mois et année requis');
  assert.equal((await h.call('GET', '/rapports/rapprochement', { token: await h.tokens.caisse() })).status, 403);
});

test('état mensuel : cotisations de la période, ventilations, état nominatif — égaux au SQL', async () => {
  const token = await h.tokens.daf();
  const e = (await h.call('GET', '/rapports/etat-mensuel?mois=Mars&annee=2026', { token })).data;
  const q = await sql("SELECT COUNT(*) n, COALESCE(SUM(montant),0) s FROM cotisations WHERE mois = 'Mars' AND annee = 2026");
  assert.equal(e.cotisations.nombre, num(q.n));
  assert.equal(e.cotisations.total, num(q.s));
  assert.equal(e.cotisations.liste.length, num(q.n));
  assert.ok(e.cotisations.liste.every((c, i, a) => i === 0 || a[i - 1].datePaiement >= c.datePaiement), 'triées de la plus récente à la plus ancienne');
  assert.equal(r2(e.statsParMode.reduce((s, m) => s + m.montant, 0)), e.cotisations.total);
  assert.equal(r2(e.statsParAgent.reduce((s, m) => s + m.montant, 0)), e.cotisations.total);
  assert.equal(e.nominatif.length, 7);
  assert.equal(r2(e.nominatif.reduce((s, n) => s + n.montantMois, 0)), e.cotisations.total);
  assert.equal(e.comptes.tous, 7);
  assert.equal(e.comptes.cotisants + e.comptes.nonCotisants, 7);
  for (const n of e.nominatif) {
    const cumul = num((await sql('SELECT COALESCE(SUM(montant),0) s FROM cotisations WHERE matricule = ?', [n.adherent.matricule])).s);
    assert.equal(n.cumulTotal, cumul, `${n.adherent.matricule} : cumul`);
    assert.equal(n.seuil15000Atteint, cumul >= 15000);
    assert.equal(n.nbJoursMois, Math.floor(n.montantMois / n.adherent.tarifJournalier));
  }
  // volet financier
  assert.equal(e.finances.depenses.total, num((await sql("SELECT COALESCE(SUM(montant),0) s FROM depenses_courantes WHERE date_depense BETWEEN '2026-03-01' AND '2026-03-31'")).s));
  assert.equal(e.finances.soldeNet, r2(e.cotisations.total - e.finances.depenses.total));
  assert.ok(e.finances.rapprochement.soldeReelBanque !== undefined);
  // un profil sans droits financiers n'obtient que le volet adhérents / cotisations
  const caisse = (await h.call('GET', '/rapports/etat-mensuel?mois=Mars&annee=2026', { token: await h.tokens.caisse() })).data;
  assert.equal(caisse.finances, null);
  assert.equal(caisse.cotisations.total, e.cotisations.total);
  assert.equal((await h.call('GET', '/rapports/etat-mensuel?mois=Marsouin&annee=2026', { token })).status, 400);
});

test('tableau de bord : compteurs d\'adhérents et de dossiers calculés par le serveur = recoupement SQL', async () => {
  const token = await h.tokens.daf();
  const d = (await h.call('GET', '/dashboard', { token })).data;
  const total = num((await sql('SELECT COUNT(*) n FROM adherents')).n);
  assert.equal(d.adherents.total, total);
  assert.equal(d.adherents.actifs, num((await sql("SELECT COUNT(*) n FROM adherents WHERE statut = 'Actif'")).n));
  assert.equal(d.adherents.immatricules, num((await sql("SELECT COUNT(*) n FROM adherents WHERE statut_immatriculation = 'Immatriculé'")).n));
  assert.equal(d.adherents.immatricules + d.adherents.nonImmatricules, total);
  assert.equal(d.adherents.aJour + d.adherents.nonAJour, total);
  const seuil = num((await sql('SELECT COUNT(*) n FROM (SELECT matricule, SUM(montant) s FROM cotisations GROUP BY matricule HAVING s >= 15000) t')).n);
  assert.equal(d.adherents.seuilAtteint, seuil);
  const aImmat = num((await sql("SELECT COUNT(*) n FROM adherents a WHERE a.statut_immatriculation <> 'Immatriculé' AND (SELECT COALESCE(SUM(montant),0) FROM cotisations c WHERE c.matricule = a.matricule) >= 15000")).n);
  assert.equal(d.adherents.aImmatriculer, aImmat);
  const alertes = (await h.call('GET', '/alertes?type=DOSSIER_ALLOCATIONS', { token })).data;
  assert.equal(d.dossiers.aConstituer, alertes.length, 'la tuile « dossiers à constituer » = les alertes de dossier');
  assert.equal(d.cotisations.dernieres.length, 8);
  assert.ok(d.cotisations.dernieres.every((c, i, a) => i === 0 || a[i - 1].datePaiement >= c.datePaiement));
});

test('versements : repères (précédent / actuel) joints par le serveur, premier versement et suivi', async () => {
  const token = await h.tokens.daf();
  const liste = (await h.call('GET', '/versements?pageSize=50', { token })).data;
  assert.ok(liste.length >= 3);
  assert.ok(liste.every((v) => v.reperes && v.reperes.precedent && v.reperes.actuel));
  const chrono = [...liste].sort((a, b) => a.date.localeCompare(b.date));
  assert.equal(chrono[0].reperes.precedent.estPremierVersement || !!chrono[0].arretPrecedentDate, true);
  for (const v of liste) {
    if (v.arretCotisationDate) assert.equal(v.reperes.actuel.date, v.arretCotisationDate, 'repère actuel = point d\'arrêt enregistré');
  }
  const detail = (await h.call('GET', `/versements/${liste[0].id}`, { token })).data;
  assert.ok(detail.reperes.actuel);

  const suivi = (await h.call('GET', '/versements/suivi/en-attente', { token })).data;
  assert.ok(suivi.reperePrecedent);
  assert.equal(suivi.nombre, suivi.cotisations.length);
  assert.equal(suivi.totalMontant, r2(suivi.cotisations.reduce((s, c) => s + c.montant, 0)));

  // un nouveau versement sans point d'arrêt explicite : le serveur le calcule
  await h.call('POST', '/cotisations', { token: await h.tokens.caisse(), body: { matricule: 'COSITI-0001', datePaiement: '2026-09-20', montant: 5000, modePaiement: 'Espèces' } });
  const apres = (await h.call('GET', '/versements/suivi/en-attente', { token })).data;
  assert.ok(apres.nombre >= 1);
  assert.equal(apres.cotisations.at(-1).datePaiement, '2026-09-20');
});

test('paie : tranche légale et aperçu en direct = ce que le serveur enregistre', async () => {
  const token = await h.tokens.daf();
  assert.equal((await h.call('GET', '/paie/tranche?salaire=59999', { token })).data.tranche, 'MOINS_DE_60K');
  assert.equal((await h.call('GET', '/paie/tranche?salaire=60000', { token })).data.tranche, 'EGAL_60K');
  assert.equal((await h.call('GET', '/paie/tranche?salaire=60001', { token })).data.tranche, 'PLUS_DE_60K');
  assert.equal((await h.call('GET', '/paie/tranche?salaire=-1', { token })).status, 400);
  assert.equal((await h.call('GET', '/paie/tranche?salaire=100', { token: await h.tokens.caisse() })).status, 403);

  await h.call('POST', '/paie/generer', { token, body: { mois: '2027-05' } });
  const b = (await h.call('GET', '/paie/bulletins?mois=2027-05&typeBeneficiaire=EMPLOYE', { token })).data[0];
  const edition = { primeRendement: 42000.5, indemniteTransport: 25000, acomptesAvances: 15000 };
  const avant = num((await sql('SELECT net_a_payer n FROM bulletins_paie WHERE id = ?', [b.id])).n);
  const apercu = await h.call('POST', `/paie/bulletins/${b.id}/apercu`, { token, body: edition });
  assert.equal(apercu.status, 200, JSON.stringify(apercu.body));
  assert.equal(num((await sql('SELECT net_a_payer n FROM bulletins_paie WHERE id = ?', [b.id])).n), avant, 'l\'aperçu n\'écrit rien');
  const saved = await h.call('PUT', `/paie/bulletins/${b.id}`, { token, body: edition });
  assert.equal(saved.status, 200);
  for (const k of ['netAPayer', 'totalGainsBruts', 'totalRetenuesSalariales', 'irppSalariale', 'cnpsPvidSalariale', 'totalChargesPatronales', 'coutTotalEmployeur']) {
    assert.equal(apercu.data[k], saved.data[k], `aperçu = enregistrement pour ${k}`);
  }
  assert.ok(apercu.data.netAPayerEnLettres);
  assert.equal((await h.call('POST', '/paie/bulletins/inexistant/apercu', { token, body: {} })).status, 404);
});

test('paie : récapitulatif, déclarations CNPS / fiscale et paie CNPS des adhérents = SQL et barème serveur', async () => {
  const token = await h.tokens.daf();
  const mois = '2026-03';
  const recap = (await h.call('GET', `/paie/recap?mois=${mois}`, { token })).data;
  const brut = num((await sql('SELECT COALESCE(SUM(total_gains_bruts),0) s FROM bulletins_paie WHERE mois = ?', [mois])).s);
  const net = num((await sql('SELECT COALESCE(SUM(net_a_payer),0) s FROM bulletins_paie WHERE mois = ?', [mois])).s);
  assert.equal(recap.statsMois.totalBrut, brut);
  assert.equal(recap.statsMois.totalNet, net);
  assert.equal(recap.statsMois.count, num((await sql('SELECT COUNT(*) n FROM bulletins_paie WHERE mois = ?', [mois])).n));
  assert.equal(recap.statsMois.nbMoins60k + recap.statsMois.nbEgal60k + recap.statsMois.nbPlus60k, recap.statsMois.count);
  const cnps = recap.declarations.cnps;
  assert.equal(r2(cnps.pvidSalariale + cnps.pvidPatronale + cnps.prestationsFamiliales + cnps.accidentsTravail), cnps.total, 'total CNPS = somme des 4 composantes');
  const fisc = recap.declarations.fiscal;
  assert.equal(r2(fisc.irpp + fisc.cac + fisc.cfc + fisc.tdl + fisc.fne), fisc.total);
  assert.equal(fisc.exoneres + fisc.assujettis, fisc.nombreBulletins);

  // bulletins : totaux calculés à la lecture
  const b = (await h.call('GET', `/paie/bulletins?mois=${mois}&pageSize=1`, { token })).data[0];
  assert.equal(b.totalCnpsPatronale, r2(b.cnpsPvidPatronale + b.cnpsPfPatronale + b.cnpsAtmpPatronale));
  assert.equal(b.totalCotisationsCnps, r2(b.cnpsPvidSalariale + b.totalCnpsPatronale));
  // tranche légale jointe aux salariés
  const emp = (await h.call('GET', '/employes?pageSize=50', { token })).data;
  for (const e of emp) {
    const attendu = e.salaireBase < 60000 ? 'MOINS_DE_60K' : e.salaireBase === 60000 ? 'EGAL_60K' : 'PLUS_DE_60K';
    assert.equal(e.trancheLoi.tranche, attendu, e.matricule);
  }

  // paie CNPS des adhérents : projection avec le VRAI barème (TDL 250 F de 60 000 à 100 000, etc.)
  await h.call('PUT', '/adherents/COSITI-0002/salaire-cotisable', { token, body: { montant: 85000 } });
  const cnpsAdh = (await h.call('GET', `/paie/adherents-cnps?mois=2031-01`, { token })).data;
  const ligne = cnpsAdh.lignes.find((l) => l.adherent.matricule === 'COSITI-0002');
  assert.ok(ligne && ligne.genere === false, 'projection : aucun bulletin enregistré pour ce mois');
  assert.equal(ligne.bulletin.tdlSalariale, 250, 'barème TDL serveur (l\'ancien calcul de l\'écran donnait 500)');
  assert.equal(ligne.bulletin.cnpsPvidSalariale, Math.round(85000 * 0.042));
  assert.equal(cnpsAdh.totaux.count, cnpsAdh.lignes.length);
  assert.equal(cnpsAdh.totaux.totalNet, r2(cnpsAdh.lignes.reduce((s, l) => s + l.bulletin.netAPayer, 0)));
  assert.equal(cnpsAdh.totaux.bulletinsGeneresCount, 0);

  // simulation d'assiette = bulletin réellement généré ensuite
  const sim = (await h.call('POST', '/paie/adherents/COSITI-0002/apercu'.replace('COSITI-0002', ligne.adherent.id), { token, body: { mois: '2031-01', montant: 120000 } })).data;
  assert.equal(sim.tdlSalariale, 500);
  await h.call('PUT', `/adherents/${ligne.adherent.id}/salaire-cotisable`, { token, body: { montant: 120000 } });
  await h.call('POST', '/paie/generer-adherents', { token, body: { mois: '2031-01' } });
  const apres = (await h.call('GET', '/paie/adherents-cnps?mois=2031-01', { token })).data.lignes.find((l) => l.adherent.id === ligne.adherent.id);
  assert.equal(apres.genere, true);
  assert.equal(apres.bulletin.netAPayer, sim.netAPayer, 'la simulation annonçait exactement le net enregistré');
  assert.equal(apres.bulletin.totalCotisationsCnps, sim.totalCotisationsCnps);
});
