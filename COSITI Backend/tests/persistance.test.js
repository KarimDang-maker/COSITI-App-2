// PERSISTANCE DE TOUS LES CRUD : pour chaque donnée de la plateforme, créer → relire → modifier → redémarrer la base
// → supprimer, en vérifiant À CHAQUE ÉTAPE le contenu réel de la table MySQL (SQL direct) et la trace au journal.
// Base jetable `cositi_test_persist`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot, CONFIRM, PW } from './_harness.js';

let h;
let TABLES;
before(async () => {
  h = await boot('cositi_test_persist');
  ({ TABLES } = await import('../src/db/tables.js'));
});
after(async () => h.close());

const num = (v) => Number(v ?? 0);
const count = async (table, where = '1=1', params = []) => num((await h.query(`SELECT COUNT(*) n FROM ${table} WHERE ${where}`, params))[0].n);
const journalCount = (type) => count('journal_operations', 'type_operation = ?', [type]);

const rowOf = async (collection, id) => {
  const d = TABLES[collection];
  return (await h.query(`SELECT * FROM ${d.table} WHERE ${d.byField.id.col} = ?`, [id]))[0];
};
/** Compare des valeurs attendues (noms de champs du document) au contenu BRUT de la ligne MySQL */
function expectRow(collection, row, expected, ctx = '') {
  assert.ok(row, `${ctx} ligne absente de la table ${TABLES[collection].table}`);
  for (const [field, v] of Object.entries(expected)) {
    const col = TABLES[collection].byField[field]?.col;
    assert.ok(col, `champ inconnu ${collection}.${field}`);
    const raw = row[col];
    if (typeof v === 'boolean') assert.equal(Number(raw), v ? 1 : 0, `${ctx} ${collection}.${field}`);
    else if (typeof v === 'number') assert.equal(Number(raw), v, `${ctx} ${collection}.${field}`);
    else if (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) && TABLES[collection].byField[field].type === 'd') assert.equal(String(raw).slice(0, 10), v, `${ctx} ${collection}.${field}`);
    else assert.equal(String(raw), String(v), `${ctx} ${collection}.${field}`);
  }
}

/** Colonne JSON d'une ligne brute (le pilote MySQL renvoie déjà l'objet décodé ; on accepte aussi du texte) */
const json = (collection, row, field) => {
  const v = row[TABLES[collection].byField[field].col];
  return typeof v === 'string' ? JSON.parse(v) : v;
};

/**
 * Cycle de vie complet d'une ressource CRUD.
 * @param o { collection, base, token, create, update, journal:{create,update,delete}, confirm:{update?,delete?}, noDelete? }
 */
async function lifecycle(o) {
  const h1 = (flag) => (o.confirm?.[flag] ? CONFIRM : {});
  const jAvant = {};
  for (const [k, t] of Object.entries(o.journal || {})) jAvant[k] = await journalCount(t);
  const n0 = await count(TABLES[o.collection].table);

  // 1. création
  const c = await h.call('POST', o.base, { token: o.token, body: o.create });
  assert.equal(c.status, 201, `${o.base} POST : ${JSON.stringify(c.body)}`);
  const id = c.data.id;
  assert.ok(id, 'id retourné');
  assert.equal(await count(TABLES[o.collection].table), n0 + 1, 'une ligne de plus en base');
  expectRow(o.collection, await rowOf(o.collection, id), o.expectCreate ?? o.create, 'après création');

  // 2. relecture par l'API = ce qui est en base
  const g = await h.call('GET', `${o.base}/${id}`, { token: o.token });
  assert.equal(g.status, 200);
  for (const [k, v] of Object.entries(o.expectCreate ?? o.create)) {
    if (typeof v !== 'object') assert.equal(String(g.data[k]), String(v), `GET ${k}`);
  }

  // 3. modification
  const u = await h.call('PUT', `${o.base}/${id}`, { token: o.token, body: o.update, headers: h1('update') });
  assert.equal(u.status, 200, `${o.base} PUT : ${JSON.stringify(u.body)}`);
  expectRow(o.collection, await rowOf(o.collection, id), o.expectUpdate ?? o.update, 'après modification');
  // les champs non modifiés sont intacts (mise à jour partielle)
  const untouched = Object.entries(o.expectCreate ?? o.create).filter(([k, v]) => !(k in (o.expectUpdate ?? o.update)) && typeof v !== 'object');
  expectRow(o.collection, await rowOf(o.collection, id), Object.fromEntries(untouched), 'champs non modifiés');

  // 4. redémarrage : tout est relu depuis MySQL
  await h.restartDb();
  const g2 = await h.call('GET', `${o.base}/${id}`, { token: o.token });
  assert.equal(g2.status, 200);
  for (const [k, v] of Object.entries(o.expectUpdate ?? o.update)) {
    if (typeof v !== 'object') assert.equal(String(g2.data[k]), String(v), `après redémarrage ${k}`);
  }

  // 5. liste : la ressource y figure
  const list = await h.call('GET', `${o.base}?pageSize=500`, { token: o.token });
  assert.ok(list.data.some((x) => x.id === id), 'présente dans la liste');

  // 6. suppression
  if (!o.noDelete) {
    const d = await h.call('DELETE', `${o.base}/${id}`, { token: o.token, headers: h1('delete') });
    assert.equal(d.status, 200, `${o.base} DELETE : ${JSON.stringify(d.body)}`);
    assert.equal(await rowOf(o.collection, id), undefined, 'ligne supprimée de la table');
    assert.equal((await h.call('GET', `${o.base}/${id}`, { token: o.token })).status, 404);
    assert.equal(await count(TABLES[o.collection].table), n0, 'retour au nombre initial');
  }

  // 7. journal : une entrée par opération
  for (const [k, t] of Object.entries(o.journal || {})) {
    if (k === 'delete' && o.noDelete) continue;
    assert.ok((await journalCount(t)) > jAvant[k], `journal ${t}`);
  }
  return id;
}

const dg = () => h.tokens.dg();
const daf = () => h.tokens.daf();

/* ============================================================================ données de référence */

test('gestionnaires : CRUD persistant, suppression détache les adhérents (en base)', async () => {
  const token = await dg();
  const id = await lifecycle({
    collection: 'gestionnaires', base: '/gestionnaires', token,
    create: { nom: 'DUPONT', prenom: 'Alice', telephone: '+225 01 02 03 04', zoneSecteur: 'Cocody', objectifsRecouvrementMensuel: 250000.5 },
    update: { zoneSecteur: 'Plateau', statut: 'En congé', objectifsRecouvrementMensuel: 300000 },
    journal: { create: 'CREATION_GESTIONNAIRE', update: 'MODIFICATION_GESTIONNAIRE', delete: 'SUPPRESSION_GESTIONNAIRE' },
    noDelete: true,
  });
  const g = (await h.call('GET', `/gestionnaires/${id}`, { token })).data;
  assert.match(g.code, /^GP-\d{3}$/, 'code généré par le serveur');
  // rattachement d'un adhérent, puis suppression du gestionnaire
  const a = (await h.call('POST', '/adherents', { token, body: { nom: 'Rattache', prenom: 'Test', telephone: '+225 07 07 07 07', profession: 'Tailleur', gestionnaireId: id } })).data;
  expectRow('adherents', await rowOf('adherents', a.id), { gestionnaireId: id });
  assert.equal((await h.call('PUT', `/gestionnaires/${id}`, { token, body: { nom: 'DURAND' } })).status, 200);
  assert.match((await rowOf('adherents', a.id)).gestionnaire_nom, /DURAND/, 'le nom dénormalisé suit la modification');
  assert.equal((await h.call('DELETE', `/gestionnaires/${id}`, { token })).status, 200);
  const apres = await rowOf('adherents', a.id);
  assert.equal(apres.gestionnaire_id, null);
  assert.equal(apres.gestionnaire_nom, null);
});

test('banques partenaires : ajout, doublon refusé, retrait, restauration — persistant', async () => {
  const token = await daf();
  const avant = await count('banques_partenaires');
  const r = await h.call('POST', '/banques', { token, body: { nom: 'Banque Test Persist' } });
  assert.equal(r.status, 201);
  assert.equal(await count('banques_partenaires', 'nom_banque = ?', ['Banque Test Persist']), 1);
  assert.equal((await h.call('POST', '/banques', { token, body: { nom: 'banque test persist' } })).status, 409, 'doublon (casse ignorée)');
  await h.restartDb();
  assert.ok((await h.call('GET', '/banques', { token })).data.includes('Banque Test Persist'));
  assert.equal((await h.call('DELETE', `/banques/${encodeURIComponent('Banque Test Persist')}`, { token })).status, 200);
  assert.equal(await count('banques_partenaires'), avant);
  await h.call('DELETE', `/banques/${encodeURIComponent('BICICI')}`, { token });
  assert.equal(await count('banques_partenaires', 'nom_banque = ?', ['BICICI']), 0);
  assert.equal((await h.call('POST', '/banques/reset', { token })).status, 200);
  assert.equal(await count('banques_partenaires'), 8, 'liste par défaut restaurée');
});

/* ============================================================================ adhérents & cotisations */

test('adhérents : CRUD, statut, portefeuille, assiette, immatriculation, sans enfant — chaque étape en base', async () => {
  const token = await dg();
  const id = await lifecycle({
    collection: 'adherents', base: '/adherents', token,
    create: { nom: 'Persist', prenom: 'Adh', telephone: '+225 05 05 05 05', profession: 'Électricien', adresse: 'Yopougon', cni: 'CNI-PERSIST-1', tarifJournalier: 1000, dateAdhesion: '2026-02-10' },
    expectCreate: { nom: 'PERSIST', prenom: 'Adh', telephone: '+225 05 05 05 05', profession: 'Électricien', adresse: 'Yopougon', cni: 'CNI-PERSIST-1', tarifJournalier: 1000, dateAdhesion: '2026-02-10', statut: 'Actif', statutImmatriculation: 'Non immatriculé' },
    update: { profession: 'Plombier', adresse: 'Abobo', observations: 'Modifié' },
    journal: { create: 'CREATION_ADHERENT', update: 'MODIFICATION_ADHERENT', delete: 'SUPPRESSION_ADHERENT' },
    confirm: { update: true, delete: true },
  });
  assert.ok(id);

  const a = (await h.call('POST', '/adherents', { token, body: { nom: 'Etapes', prenom: 'Multi', telephone: '+225 06 06 06 06', profession: 'Boulanger' } })).data;
  const ok = async (method, path, body, tok = token) => {
    const r = await h.call(method, path, { token: tok, body, headers: CONFIRM });
    assert.equal(r.status, 200, `${method} ${path} : ${JSON.stringify(r.body)}`);
    return r.data;
  };
  await ok('PATCH', `/adherents/${a.id}/statut`, { statut: 'Suspendu', motif: 'test' });
  expectRow('adherents', await rowOf('adherents', a.id), { statut: 'Suspendu' }, 'statut');
  await ok('PUT', `/adherents/${a.id}/salaire-cotisable`, { montant: 85000.5 }, await daf());
  expectRow('adherents', await rowOf('adherents', a.id), { salaireCotisableCnps: 85000.5 }, 'assiette');
  await ok('POST', `/adherents/${a.id}/immatriculer`, { numeroCnps: 'CNPS-PERSIST-9', dateImmatriculation: '2026-03-03' });
  expectRow('adherents', await rowOf('adherents', a.id), { statutImmatriculation: 'Immatriculé', numeroCnps: 'CNPS-PERSIST-9', dateImmatriculation: '2026-03-03' }, 'immatriculation');
  assert.equal(await count('dossiers_allocations', 'adherent_id = ?', [a.id]), 1, 'dossier CNPS créé en base à l\'immatriculation');
  await ok('POST', `/adherents/${a.id}/sans-enfant`, { motif: 'célibataire' });
  expectRow('adherents', await rowOf('adherents', a.id), { sansEnfant: true, nombreEnfants: 0 }, 'sans enfant');
  expectRow('dossiers', (await h.query('SELECT * FROM dossiers_allocations WHERE adherent_id = ?', [a.id]))[0], { sansEnfant: true, statut: 'Sans enfant (Non éligible allocations)' }, 'dossier sans enfant');
  const gest = (await h.call('GET', '/gestionnaires', { token })).data[0];
  await ok('PUT', `/adherents/${a.id}/portefeuille`, { gestionnaireId: gest.id });
  expectRow('adherents', await rowOf('adherents', a.id), { gestionnaireId: gest.id }, 'portefeuille');
  await h.restartDb();
  expectRow('adherents', await rowOf('adherents', a.id), { statut: 'Suspendu', numeroCnps: 'CNPS-PERSIST-9', gestionnaireId: gest.id }, 'après redémarrage');
});

test('cotisations : CRUD persistant, régularisation, cumul adhérent mis à jour', async () => {
  const caisse = await h.tokens.caisse();
  const adh = (await h.call('POST', '/adherents', { token: await dg(), body: { nom: 'Cotise', prenom: 'Persist', telephone: '+225 04 04 04 04', profession: 'Peintre' } })).data;
  const id = await lifecycle({
    collection: 'cotisations', base: '/cotisations', token: await dg(),
    create: { adherentId: adh.id, datePaiement: '2026-03-05', montant: 7000, modePaiement: 'Espèces', reference: 'REF-PERSIST-1', observations: 'test' },
    expectCreate: { adherentId: adh.id, matricule: adh.matricule, datePaiement: '2026-03-05', montant: 7000, modePaiement: 'Espèces', reference: 'REF-PERSIST-1', mois: 'Mars', annee: 2026, estRegularisation: false },
    update: { montant: 7500.5, modePaiement: 'Wave', datePaiement: '2026-04-02' },
    expectUpdate: { montant: 7500.5, modePaiement: 'Wave', datePaiement: '2026-04-02', mois: 'Avril', annee: 2026 },
    journal: { create: 'ENREGISTREMENT_COTISATION', update: 'MODIFICATION_COTISATION', delete: 'SUPPRESSION_COTISATION' },
    confirm: { update: true, delete: true },
    noDelete: true,
  });
  // régularisation rétroactive (complément sur une cotisation existante, puis rattrapage)
  const reg = await h.call('POST', '/cotisations/regulariser', { token: await daf(), body: { cotisationId: id, montant: 9000, modePaiement: 'Espèces', datePaiement: '2026-04-02', mois: 'Avril', annee: 2026, typeRegularisation: 'Complément de montant antérieur', motifRegularisation: 'Complément versé en retard' } });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  expectRow('cotisations', await rowOf('cotisations', id), { montant: 9000, estRegularisation: true, montantAnterieurInitial: 7500.5, montantComplementaire: 1499.5, typeRegularisation: 'Complément de montant antérieur' }, 'régularisation');
  const rat = await h.call('POST', '/cotisations/regulariser', { token: await daf(), body: { adherentId: adh.id, montant: 2100, modePaiement: 'Espèces', datePaiement: '2026-01-15', mois: 'Janvier', annee: 2026, typeRegularisation: 'Rattrapage arriérés (depuis Juillet)', motifRegularisation: 'Arriérés de janvier' } });
  assert.equal(rat.status, 201);
  expectRow('cotisations', await rowOf('cotisations', rat.data.id), { montant: 2100, estRegularisation: true, matricule: adh.matricule }, 'rattrapage');
  const fiche = (await h.call('GET', `/adherents/${adh.id}`, { token: caisse })).data;
  assert.equal(fiche.stats.totalCumule, 11100, 'cumul = somme des cotisations en base (9000 + 2100)');
  assert.equal(num((await h.query('SELECT SUM(montant) s FROM cotisations WHERE adherent_id = ?', [adh.id]))[0].s), 11100);
  // suppression (code requis) : disparaît de la base et du cumul
  assert.equal((await h.call('DELETE', `/cotisations/${rat.data.id}`, { token: await dg() })).status, 400, 'sans code de confirmation');
  assert.equal((await h.call('DELETE', `/cotisations/${rat.data.id}`, { token: await dg(), headers: CONFIRM })).status, 200);
  assert.equal(await rowOf('cotisations', rat.data.id), undefined);
  assert.equal((await h.call('GET', `/adherents/${adh.id}`, { token: caisse })).data.stats.totalCumule, 9000);
});

test('dossiers CNPS : création, mise à jour avec historique persistant, synchronisation adhérent', async () => {
  const token = await dg();
  const adh = (await h.call('POST', '/adherents', { token, body: { nom: 'Dossier', prenom: 'Persist', telephone: '+225 03 03 03 03', profession: 'Cuisinier' } })).data;
  const cat = (await h.call('GET', '/dossiers/catalogue', { token })).data;
  assert.ok(Array.isArray(cat) && cat.length >= 1);
  const c = await h.call('POST', '/dossiers', { token, body: { adherentId: adh.id } });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  expectRow('dossiers', await rowOf('dossiers', c.data.id), { adherentId: adh.id, matricule: adh.matricule, statut: 'Dossier non commencé', branche: 'PRESTATIONS_FAMILIALES' }, 'création');
  const pieces = c.data.pieces.map((p, i) => ({ ...p, recu: i < 2, dateReception: i < 2 ? '2026-03-01' : undefined }));
  const u = await h.call('PUT', `/dossiers/${c.data.id}`, { token, body: { statut: 'Dossier transmis', nombreEnfants: 3, pieces, montantPrestation: 45000.5, noteAction: 'Transmis à la CNPS' } });
  assert.equal(u.status, 200, JSON.stringify(u.body));
  const row = await rowOf('dossiers', c.data.id);
  expectRow('dossiers', row, { statut: 'Dossier transmis', nombreEnfants: 3, montantPrestation: 45000.5 }, 'mise à jour');
  assert.ok(row.date_transmission, 'date de transmission posée automatiquement');
  const histo = json('dossiers', row, 'historique');
  assert.equal(histo[0].action, 'Transmis à la CNPS');
  assert.equal(histo.length, 2, 'historique : création + mise à jour');
  assert.equal(json('dossiers', row, 'pieces').filter((p) => p.recu).length, 2);
  expectRow('adherents', await rowOf('adherents', adh.id), { nombreEnfants: 3 }, 'nombre d\'enfants synchronisé sur l\'adhérent');
  await h.restartDb();
  assert.equal(json('dossiers', await rowOf('dossiers', c.data.id), 'historique').length, 2);
});

/* ============================================================================ finances */

test('dépenses : CRUD persistant', async () => {
  await lifecycle({
    collection: 'depenses', base: '/depenses', token: await daf(),
    create: { date: '2026-05-02', categorie: 'Carburant & Déplacements', motif: 'Carburant mission', montant: 45000.75, modePaiement: 'Espèces / Caisse', beneficiaire: 'Station Total', numeroPiece: 'PJ-PERSIST-1' },
    expectCreate: { date: '2026-05-02', categorie: 'Carburant & Déplacements', montant: 45000.75, numeroPiece: 'PJ-PERSIST-1', statut: 'Payé', origineFonds: 'Apport personnel du PCA' },
    update: { montant: 48000, statut: 'En attente', motif: 'Carburant mission (corrigé)' },
    journal: { create: 'ENREGISTREMENT_DEPENSE', update: 'MODIFICATION_DEPENSE', delete: 'SUPPRESSION_DEPENSE' },
    confirm: { delete: true },
  });
});

test('versements bancaires : CRUD persistant avec point d\'arrêt calculé', async () => {
  const id = await lifecycle({
    collection: 'versements', base: '/versements', token: await daf(),
    create: { date: '2026-05-10', banque: 'BICICI', numeroBordereau: 'BRD-PERSIST-1', montant: 120000, sourceFonds: 'Recettes Cotisations Adhérents', deposant: 'DAF' },
    update: { montant: 125000.5, statut: 'En attente de relevé', observations: 'Relevé attendu' },
    journal: { create: 'ENREGISTREMENT_VERSEMENT_BANCAIRE', update: 'MODIFICATION_VERSEMENT_BANCAIRE', delete: 'SUPPRESSION_VERSEMENT_BANCAIRE' },
    confirm: { delete: true },
    noDelete: true,
  });
  const row = await rowOf('versements', id);
  assert.ok(row.arret_cotisation_date, 'point d\'arrêt calculé et stocké');
  assert.ok(num(row.nb_cotisations_incluses) >= 0);
  assert.equal((await h.call('DELETE', `/versements/${id}`, { token: await daf(), headers: CONFIRM })).status, 200);
  assert.equal(await rowOf('versements', id), undefined);
});

test('frais Mobile Money : CRUD persistant, net calculé', async () => {
  await lifecycle({
    collection: 'frais_mobile_money', base: '/frais-mobile-money', token: await daf(),
    create: { date: '2026-05-11', operateur: 'MTN MoMo', typeFrais: 'Frais de transfert opérateur', montantTransaction: 80000, fraisPreleves: 800, referenceTransaction: 'MTN-PERSIST-1' },
    expectCreate: { date: '2026-05-11', operateur: 'MTN MoMo', montantTransaction: 80000, fraisPreleves: 800, montantNet: 79200, referenceTransaction: 'MTN-PERSIST-1' },
    update: { fraisPreleves: 1200.5 },
    expectUpdate: { fraisPreleves: 1200.5, montantNet: 78799.5 },
    journal: { create: 'ENREGISTREMENT_FRAIS_MOBILE_MONEY', update: 'MODIFICATION_FRAIS_MOBILE_MONEY', delete: 'SUPPRESSION_FRAIS_MOBILE_MONEY' },
    confirm: { delete: true },
  });
});

/* ============================================================================ paie */

test('employés : CRUD persistant ; suppression refusée s\'il a des bulletins', async () => {
  await lifecycle({
    collection: 'employes', base: '/employes', token: await daf(),
    create: { nom: 'EMPLOYE', prenom: 'Persist', sexe: 'F', poste: 'Assistante', departement: 'Finances & Comptabilité', typeContrat: 'CDI', dateEmbauche: '2026-01-05', salaireBase: 150000, modePaiement: 'Virement bancaire', telephone: '+225 01 01 01 01' },
    expectCreate: { nom: 'EMPLOYE', prenom: 'Persist', salaireBase: 150000, typeContrat: 'CDI', dateEmbauche: '2026-01-05', actif: true, nombrePartsFiscales: 1, indemniteTransport: 0 },
    update: { salaireBase: 175000.5, poste: 'Comptable', actif: false },
    journal: { create: 'AJOUT_EMPLOYE', update: 'MODIFICATION_EMPLOYE', delete: 'SUPPRESSION_EMPLOYE' },
    confirm: { delete: true },
  });
  const salarieAvecBulletins = (await h.call('GET', '/employes?pageSize=1', { token: await daf() })).data[0];
  assert.equal((await h.call('DELETE', `/employes/${salarieAvecBulletins.id}`, { token: await daf(), headers: CONFIRM })).status, 409);
  assert.ok(await rowOf('employes', salarieAvecBulletins.id), 'toujours en base');
});

test('paie : génération, modification recalculée, validation, suppression — chaque étape en base', async () => {
  const token = await daf();
  const mois = '2027-02';
  const gen = await h.call('POST', '/paie/generer', { token, body: { mois } });
  assert.equal(gen.status, 200, JSON.stringify(gen.body));
  const nbEmp = await count('employes', 'actif = 1');
  assert.equal(gen.data.count, nbEmp);
  assert.equal(await count('bulletins_paie', 'mois = ?', [mois]), nbEmp);
  assert.equal((await h.call('POST', '/paie/generer', { token, body: { mois } })).data.ignores, nbEmp, 'rejouer ne duplique rien');
  assert.equal(await count('bulletins_paie', 'mois = ?', [mois]), nbEmp);

  // adhérents immatriculés
  await h.call('POST', '/adherents/COSITI-0002/sans-enfant', { token: await dg(), body: {} });
  const genAdh = await h.call('POST', '/paie/generer-adherents', { token, body: { mois, salaireCotisableDefaut: 60000 } });
  assert.equal(genAdh.status, 200, JSON.stringify(genAdh.body));
  assert.ok(await count('bulletins_paie', 'mois = ? AND type_beneficiaire = ?', [mois, 'ADHERENT_CNPS']) >= 1);

  const b = (await h.call('GET', `/paie/bulletins?mois=${mois}&typeBeneficiaire=EMPLOYE`, { token })).data[0];
  const maj = await h.call('PUT', `/paie/bulletins/${b.id}`, { token, body: { primeRendement: 50000, acomptesAvances: 10000.5 } });
  assert.equal(maj.status, 200);
  const rec = await rowOf('bulletins_paie', b.id);
  assert.equal(num(rec.net_a_payer), maj.data.netAPayer, 'net recalculé par le serveur et stocké');
  assert.ok(maj.data.netAPayer !== b.netAPayer);

  const val = await h.call('POST', '/paie/valider', { token, body: { mois } });
  assert.equal(val.status, 200);
  assert.equal(await count('bulletins_paie', "mois = ? AND statut = 'Validé DAF'", [mois]), nbEmp + (await count('bulletins_paie', 'mois = ? AND type_beneficiaire = ?', [mois, 'ADHERENT_CNPS'])));
  assert.equal(await count('depenses_courantes', 'numero_piece = ?', [`PAIE-${mois}`]), 1);
  assert.equal((await h.call('PUT', `/paie/bulletins/${b.id}`, { token, body: { primeRendement: 1 } })).status, 409, 'bulletin validé verrouillé');
  assert.equal((await h.call('DELETE', `/paie/bulletins/${b.id}`, { token })).status, 409, 'bulletin lié à une écriture non supprimable');

  // suppression d'un bulletin de brouillon
  await h.call('POST', '/paie/generer', { token, body: { mois: '2027-03' } });
  const brouillon = (await h.call('GET', '/paie/bulletins?mois=2027-03&typeBeneficiaire=EMPLOYE', { token })).data[0];
  assert.equal((await h.call('DELETE', `/paie/bulletins/${brouillon.id}`, { token })).status, 200);
  assert.equal(await rowOf('bulletins_paie', brouillon.id), undefined);
});

/* ============================================================================ direction */

test('partenaires, rendez-vous, notes de direction : CRUD persistants', async () => {
  const token = await dg();
  const p = await lifecycle({
    collection: 'partenaires', base: '/partenaires', token,
    create: { nomOrganisation: 'Banque Persist', secteur: 'Banque & Microfinance', personneContact: 'M. Kouassi', titreContact: 'Directeur', telephone: '+225 27 00 00 00', statut: 'Prospection préliminaire', priorite: 'Standard (P3)', potentielSynergie: 'Épargne des adhérents' },
    update: { statut: 'Négociations en cours', priorite: 'Stratégique (P1)' },
    journal: { create: 'CREATION_PARTENAIRE', update: 'MODIFICATION_PARTENAIRE', delete: 'SUPPRESSION_PARTENAIRE' },
    noDelete: true,
  });
  await lifecycle({
    collection: 'rendez_vous', base: '/rendez-vous', token,
    create: { titre: 'Rencontre Persist', partenaireId: p, nomInterlocuteurOuPartenaire: 'M. Kouassi', date: '2026-11-10', heure: '09:30', modalite: 'Siège COSITI', participantsDirection: 'DG, DGA', responsablePrincipal: 'DG', statut: 'Prévu', ordreDuJour: 'Convention' },
    update: { statut: 'Confirmé', compteRendu: 'Accord de principe', heure: '10:15' },
    journal: { create: 'CREATION_RENDEZ_VOUS', update: 'MODIFICATION_RENDEZ_VOUS', delete: 'SUPPRESSION_RENDEZ_VOUS' },
  });
  await lifecycle({
    collection: 'notes_direction', base: '/notes-direction', token,
    create: { titre: 'Note Persist', date: '2026-11-11', categorie: 'Stratégie & Partenariats', contenu: 'Contenu long', pointsCles: ['point 1', 'point 2'], niveauConfidentialite: 'Direction Élargie' },
    update: { contenu: 'Contenu corrigé', prochaineEcheance: '2026-12-31' },
    journal: { create: 'CREATION_NOTE_DIRECTION', update: 'MODIFICATION_NOTE_DIRECTION', delete: 'SUPPRESSION_NOTE_DIRECTION' },
  });
  const note = (await h.call('POST', '/notes-direction', { token, body: { titre: 'Pts', date: '2026-11-11', categorie: 'Stratégie & Partenariats', contenu: 'c', pointsCles: ['a', 'b'], niveauConfidentialite: 'Direction Élargie' } })).data;
  assert.deepEqual(json('notes_direction', await rowOf('notes_direction', note.id), 'pointsCles'), ['a', 'b'], 'tableau JSON stocké tel quel');
  assert.equal((await h.call('DELETE', `/partenaires/${p}`, { token })).status, 200, 'les rendez-vous liés ont été supprimés avant');
});

test('PV de réunion : CRUD persistant, décisions JSON conservées', async () => {
  const token = await dg();
  const decisions = [{ id: 'd1', description: 'Valider le budget', responsable: 'DAF', echeance: '2026-12-01', statut: 'À faire' }];
  const id = await lifecycle({
    collection: 'rapports_reunions', base: '/rapports-reunions', token,
    create: { titre: 'CA de décembre', typeReunion: "Conseil d'Administration", date: '2026-12-02', heureDebut: '10:00', lieu: 'Siège', presidentSeance: 'PCA', secretaireSeance: 'DG', participantsPresents: 'DG, DGA, DAF', ordreDuJour: 'Budget', syntheseDiscussions: 'Discussion longue', decisions },
    expectCreate: { titre: 'CA de décembre', date: '2026-12-02', heureDebut: '10:00', statut: 'Brouillon' },
    update: { statut: 'Validé & Signé', syntheseDiscussions: 'Synthèse finale' },
    journal: { create: 'CREATION_RAPPORT_REUNION', update: 'MODIFICATION_RAPPORT_REUNION', delete: 'SUPPRESSION_RAPPORT_REUNION' },
    noDelete: true,
  });
  assert.deepEqual(json('rapports_reunions', await rowOf('rapports_reunions', id), 'decisions'), decisions);
  assert.equal((await h.call('DELETE', `/rapports-reunions/${id}`, { token: await daf() })).status, 409, 'PV signé : seule la Direction Générale supprime');
  assert.equal((await h.call('DELETE', `/rapports-reunions/${id}`, { token })).status, 200);
});

test('rapports des agents : CRUD, total recalculé, visas DAF puis Direction persistants', async () => {
  const token = await h.tokens.caisse();
  const c = await h.call('POST', '/rapports-agents', { token, body: { dateRapport: '2026-06-02', agentNom: 'Agent Persist', zoneSecteur: 'Zone Est', typeMission: 'Collecte', adherentsVisites: 20, adherentsCotisants: 15, nouvellesAdhesions: 2, montantEspecesRemis: 55000.5, montantMobileMoneyDeclare: 20000, conformiteCaisse: 'Conforme (Fonds complets)' } });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  expectRow('rapports_agents', await rowOf('rapports_agents', c.data.id), { montantTotalCollecte: 75000.5, statutValidation: 'Enregistré par Caissière', dateRapport: '2026-06-02' }, 'création');
  assert.equal((await h.call('PUT', `/rapports-agents/${c.data.id}`, { token, body: { montantEspecesRemis: 60000 } })).status, 200);
  expectRow('rapports_agents', await rowOf('rapports_agents', c.data.id), { montantEspecesRemis: 60000, montantTotalCollecte: 80000 }, 'total recalculé');
  assert.equal((await h.call('POST', `/rapports-agents/${c.data.id}/valider-direction`, { token: await dg() })).status, 409, 'visa DAF préalable obligatoire');
  assert.equal((await h.call('POST', `/rapports-agents/${c.data.id}/valider-daf`, { token: await daf(), body: { visa: 'Vu DAF' } })).status, 200);
  expectRow('rapports_agents', await rowOf('rapports_agents', c.data.id), { statutValidation: 'Vérifié DAF' }, 'visa DAF');
  assert.equal((await h.call('POST', `/rapports-agents/${c.data.id}/valider-direction`, { token: await dg() })).status, 200);
  expectRow('rapports_agents', await rowOf('rapports_agents', c.data.id), { statutValidation: 'Validé Direction' }, 'validation Direction');
  assert.equal((await h.call('PUT', `/rapports-agents/${c.data.id}`, { token, body: { agentNom: 'x' } })).status, 409, 'rapport visé : la caissière ne peut plus le modifier');
  await h.restartDb();
  expectRow('rapports_agents', await rowOf('rapports_agents', c.data.id), { statutValidation: 'Validé Direction', montantTotalCollecte: 80000 }, 'après redémarrage');
  assert.equal((await h.call('DELETE', `/rapports-agents/${c.data.id}`, { token: await dg() })).status, 200);
  assert.equal(await rowOf('rapports_agents', c.data.id), undefined);
});

/* ============================================================================ administration */

test('paramètres : modification persistante, code de confirmation haché', async () => {
  const token = await daf();
  const avant = (await h.call('GET', '/parametres', { token })).data;
  const r = await h.call('PUT', '/parametres', { token, body: { nomOrganisation: 'COSITI PERSIST', seuilImmatriculation: 20000.5, montantsCotisationDefauts: [500, 1000, 1500], joursVerification: [10, 20] } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const row = (await h.query('SELECT * FROM parametres WHERE id = 1'))[0];
  assert.equal(row.nom_organisation, 'COSITI PERSIST');
  assert.equal(num(row.seuil_immatriculation), 20000.5);
  assert.deepEqual(json('parametres', row, 'montantsCotisationDefauts'), [500, 1000, 1500]);
  assert.deepEqual(json('parametres', row, 'joursVerification'), [10, 20]);
  // changement du code de confirmation : stocké haché, ancien code exigé
  assert.equal((await h.call('PUT', '/parametres', { token, body: { codeConfirmationSecurite: '4321' } })).status, 403);
  assert.equal((await h.call('PUT', '/parametres', { token, body: { codeConfirmationSecurite: '4321', ancienCodeConfirmation: '0000' } })).status, 200);
  const hash = (await h.query('SELECT code_confirmation_hash h, code_confirmation_securite c FROM parametres WHERE id = 1'))[0];
  assert.match(hash.h, /^\$2[aby]\$/);
  assert.ok(!hash.c, 'aucun code en clair en base');
  assert.equal((await h.call('DELETE', '/adherents/x', { token: await dg(), headers: { 'X-Confirmation-Code': '0000' } })).status, 403, 'ancien code refusé');
  assert.equal((await h.call('DELETE', '/adherents/x', { token: await dg(), headers: { 'X-Confirmation-Code': '4321' } })).status, 404, 'nouveau code accepté (la cible n\'existe pas)');
  // remise en état
  await h.call('PUT', '/parametres', { token, body: { codeConfirmationSecurite: '0000', ancienCodeConfirmation: '4321', nomOrganisation: avant.nomOrganisation, seuilImmatriculation: avant.seuilImmatriculation, montantsCotisationDefauts: avant.montantsCotisationDefauts, joursVerification: avant.joursVerification } });
  assert.equal((await h.call('PUT', '/parametres', { token: await h.tokens.caisse(), body: { sigle: 'X' } })).status, 403);
});

test('utilisateurs : création, connexion, identifiants, mot de passe, suppression — mots de passe hachés en base', async () => {
  const sa = await h.tokens.sa();
  const c = await h.call('POST', '/utilisateurs', { token: sa, body: { nom: 'Persist User', email: 'persist@cositi-ci.org', role: "Agent d'enregistrement", password: 'Persist@Pass1', mustChangePassword: false } });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  const row = await rowOf('utilisateurs', c.data.id);
  expectRow('utilisateurs', row, { nom: 'Persist User', email: 'persist@cositi-ci.org', role: "Agent d'enregistrement", actif: true }, 'création');
  assert.match(row.password_hash, /^\$2[aby]\$/);
  assert.ok(!JSON.stringify(row).includes('Persist@Pass1'), 'aucun mot de passe en clair en base');
  assert.equal(row.pin_hash, null, 'aucun code PIN de compte');
  assert.equal((await h.call('POST', '/auth/login', { body: { email: 'persist@cositi-ci.org', password: 'Persist@Pass1' } })).status, 200);

  assert.equal((await h.call('PUT', `/utilisateurs/${c.data.id}`, { token: sa, body: { poste: 'Agent terrain', telephone: '+225 09 09 09 09' } })).status, 200);
  expectRow('utilisateurs', await rowOf('utilisateurs', c.data.id), { poste: 'Agent terrain', telephone: '+225 09 09 09 09' }, 'profil');
  const ident = await h.call('PUT', `/utilisateurs/${c.data.id}/identifiants`, { token: sa, body: { email: 'persist2@cositi-ci.org', password: 'Autre@Pass22', mustChangePassword: true } });
  assert.equal(ident.status, 200);
  expectRow('utilisateurs', await rowOf('utilisateurs', c.data.id), { email: 'persist2@cositi-ci.org', mustChangePassword: true }, 'identifiants');
  assert.equal((await h.call('POST', '/auth/login', { body: { email: 'persist@cositi-ci.org', password: 'Persist@Pass1' } })).status, 401);
  const l = await h.call('POST', '/auth/login', { body: { email: 'persist2@cositi-ci.org', password: 'Autre@Pass22' } });
  assert.equal(l.status, 200);
  assert.equal(l.data.mustChangePassword, true);
  // changement de mot de passe par l'utilisateur lui-même
  assert.equal((await h.call('POST', '/auth/change-password', { token: l.data.accessToken, body: { currentPassword: 'Autre@Pass22', newPassword: 'Final@Pass333' } })).status, 200);
  expectRow('utilisateurs', await rowOf('utilisateurs', c.data.id), { mustChangePassword: false }, 'après changement');
  assert.equal((await h.call('POST', `/utilisateurs/${c.data.id}/reset-password`, { token: sa, body: { newPassword: 'Reset@Pass444' } })).status, 200);
  assert.equal((await h.call('POST', '/auth/login', { body: { email: 'persist2@cositi-ci.org', password: 'Reset@Pass444' } })).status, 200);
  // paramétrage groupé
  const bulk = await h.call('PUT', '/utilisateurs/bulk', { token: sa, body: { utilisateurs: [{ id: c.data.id, nom: 'Persist Bulk', email: 'persist2@cositi-ci.org', role: "Agent d'enregistrement", telephone: '+225 00 00 00 00' }] } });
  assert.equal(bulk.status, 200, JSON.stringify(bulk.body));
  expectRow('utilisateurs', await rowOf('utilisateurs', c.data.id), { nom: 'Persist Bulk' }, 'bulk');
  await h.restartDb();
  expectRow('utilisateurs', await rowOf('utilisateurs', c.data.id), { nom: 'Persist Bulk', email: 'persist2@cositi-ci.org' }, 'après redémarrage');
  // suppression
  assert.equal((await h.call('DELETE', `/utilisateurs/${c.data.id}`, { token: sa, headers: CONFIRM })).status, 200);
  assert.equal(await rowOf('utilisateurs', c.data.id), undefined);
  assert.equal((await h.call('POST', '/auth/login', { body: { email: 'persist2@cositi-ci.org', password: 'Reset@Pass444' } })).status, 401);
  // sessions : les renouvellements sont stockés hachés
  assert.equal(await count('refresh_tokens', 'user_id = ?', [c.data.id]) >= 0, true);
  const [tok] = await h.query('SELECT token_hash FROM refresh_tokens LIMIT 1');
  if (tok) assert.match(tok.token_hash, /^[0-9a-f]{64}$/, 'refresh token stocké sous forme de hash sha256');
});

test('journal : événements du navigateur persistés, consultation filtrée, purge tracée', async () => {
  const token = await dg();
  const e = await h.call('POST', '/journal/evenements', { token, body: { typeOperation: 'IMPRESSION_RECU', description: 'Impression du reçu REC-PERSIST', matricule: 'COSITI-0001' } });
  assert.equal(e.status, 201);
  const row = await rowOf('journal', e.data.id);
  expectRow('journal', row, { typeOperation: 'IMPRESSION_RECU', action: 'CLIENT', matricule: 'COSITI-0001' }, 'événement');
  assert.ok(row.utilisateur_id, 'auteur enregistré');
  assert.equal((await h.call('GET', '/journal?typeOperation=IMPRESSION_RECU', { token })).data.length, 1);
  const avant = await count('journal_operations');
  const purge = await h.call('DELETE', '/journal', { token, headers: CONFIRM });
  assert.equal(purge.status, 200);
  assert.equal(purge.data.supprimees, avant);
  assert.equal(await count('journal_operations'), 1, 'seule subsiste la trace de la purge elle-même');
  assert.equal((await h.call('DELETE', '/journal', { token: await h.tokens.caisse(), headers: CONFIRM })).status, 403);
});

/* ============================================================================ lectures calculées = SQL */

test('tableau de bord, alertes, états mensuels, relevé : chiffres du serveur = calcul direct MySQL', async () => {
  const token = await daf();
  const dash = (await h.call('GET', '/dashboard', { token })).data;
  assert.equal(dash.adherents.total, await count('adherents'));
  assert.equal(dash.cotisations.nombre, await count('cotisations'));
  assert.equal(dash.cotisations.totalGlobal, num((await h.query('SELECT COALESCE(SUM(montant),0) s FROM cotisations'))[0].s));
  assert.equal(dash.finances.depensesTotal, num((await h.query('SELECT COALESCE(SUM(montant),0) s FROM depenses_courantes'))[0].s));
  assert.equal(dash.finances.versementsTotal, num((await h.query('SELECT COALESCE(SUM(montant),0) s FROM versements_bancaires'))[0].s));
  assert.equal(dash.finances.fraisMobileMoneyTotal, num((await h.query('SELECT COALESCE(SUM(frais_preleves),0) s FROM frais_mobile_money'))[0].s));
  assert.equal((await h.call('GET', '/dashboard', { token: await h.tokens.caisse() })).data.finances, undefined);

  const mois = '2026-03';
  const etat = (await h.call('GET', `/rapports/etats-mensuels?mois=${mois}`, { token })).data;
  const cot = (await h.query("SELECT COUNT(*) n, COALESCE(SUM(montant),0) s FROM cotisations WHERE date_paiement BETWEEN '2026-03-01' AND '2026-03-31'"))[0];
  assert.equal(etat.cotisations.nombre, num(cot.n));
  assert.equal(etat.cotisations.total, num(cot.s));
  assert.equal(etat.finances.depenses.total, num((await h.query("SELECT COALESCE(SUM(montant),0) s FROM depenses_courantes WHERE date_depense BETWEEN '2026-03-01' AND '2026-03-31'"))[0].s));

  const al = await h.call('GET', '/alertes', { token });
  assert.equal(al.status, 200);
  assert.equal(al.body.meta.total, al.data.length);
  assert.ok(al.data.every((a) => a.id && a.type && a.niveau && a.matricule));

  const rel = (await h.call('GET', '/rapports/releve/COSITI-0001', { token })).data;
  assert.equal(rel.stats.totalCumule, num((await h.query("SELECT COALESCE(SUM(montant),0) s FROM cotisations WHERE matricule = 'COSITI-0001'"))[0].s));
  assert.equal(rel.cotisations.length, await count('cotisations', "matricule = 'COSITI-0001'"));
  assert.equal((await h.call('GET', '/adherents/COSITI-0001/stats', { token })).data.totalCumule, rel.stats.totalCumule);
});

test('listes : pagination, recherche et filtres s\'appuient sur la base (aucune donnée en mémoire serveur)', async () => {
  const token = await daf();
  const p1 = (await h.call('GET', '/cotisations?pageSize=5&page=1', { token })).body;
  const p2 = (await h.call('GET', '/cotisations?pageSize=5&page=2', { token })).body;
  assert.equal(p1.data.length, 5);
  assert.equal(p1.meta.total, await count('cotisations'));
  assert.ok(!p1.data.some((c) => p2.data.some((d) => d.id === c.id)), 'pages disjointes');
  const q = (await h.call('GET', '/adherents?q=KOUAM', { token })).body;
  assert.ok(q.data.length >= 1 && q.data.every((a) => /kouam/i.test(JSON.stringify(a))));
  assert.equal((await h.call('GET', "/adherents?q=%27%3B%20DROP%20TABLE%20adherents%3B%20--", { token })).status, 200, 'injection SQL inoffensive');
  assert.ok(await count('adherents') > 0);
  const f = (await h.call('GET', '/cotisations?modePaiement=Wave', { token })).body;
  assert.equal(f.meta.total, await count('cotisations', "mode_paiement = 'Wave'"));
});

/* ============================================================================ opérations globales (en dernier : destructives) */

test('mise à jour logicielle puis réinitialisation de démonstration : effacement et rechargement réels en base', async () => {
  const pca = await h.tokens.pca();
  // sans code de maintenance : refusé, rien n'est effacé
  const avant = await count('adherents');
  assert.ok(avant > 0);
  assert.equal((await h.call('POST', '/systeme/mise-a-jour', { token: pca })).status, 400);
  assert.equal((await h.call('POST', '/systeme/mise-a-jour', { token: pca, headers: { 'X-Maintenance-Code': '0000' } })).status, 403);
  assert.equal(await count('adherents'), avant);
  // avec le bon code : données d'exploitation effacées, comptes / paramètres / salariés / banques conservés
  const ok = await h.call('POST', '/systeme/mise-a-jour', { token: pca, headers: { 'X-Maintenance-Code': '1111' } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  for (const t of ['adherents', 'cotisations', 'dossiers_allocations', 'depenses_courantes', 'versements_bancaires', 'frais_mobile_money', 'rapports_agents']) assert.equal(await count(t), 0, t);
  assert.equal(num((await h.query('SELECT dernier_numero_matricule m FROM parametres WHERE id = 1'))[0].m), 0);
  assert.ok(await count('utilisateurs') >= 7, 'comptes conservés');
  assert.ok(await count('employes') >= 6 && await count('banques_partenaires') === 8);
  await h.restartDb();
  assert.equal(await count('adherents'), 0, 'effacement persistant');

  // réinitialisation de démonstration : le dump est rechargé
  const dgTok = await h.login('dg@cositi-ci.org');
  const reset = await h.call('POST', '/systeme/reset-demo', { token: dgTok, headers: CONFIRM });
  assert.equal(reset.status, 200, JSON.stringify(reset.body));
  assert.equal(await count('adherents'), 7);
  assert.equal(await count('cotisations'), 17);
  assert.equal(await count('depenses_courantes'), 6);
  assert.equal(await count('versements_bancaires'), 3);
  assert.equal(await count('frais_mobile_money'), 5);
  assert.equal(await count('bulletins_paie'), 14);
  // les identifiants de connexion sont recréés (hachés) : on peut se reconnecter
  const l = await h.call('POST', '/auth/login', { body: { email: 'dg@cositi-ci.org', password: PW } });
  assert.equal(l.status, 200);
  assert.equal(await count('utilisateurs', 'password_hash IS NULL'), 0);
});
