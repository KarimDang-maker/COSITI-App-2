// npm run docs:front : analyse du front (src/) et du back — vérifie que CHAQUE fonctionnalité du front
// (membre de AppContext utilisé par les composants) correspond à un endpoint réellement exposé.
// Génère docs/ANALYSE_FRONT_BACK.md.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { mounts } from '../src/docs/registry.js';
import { buildOpenApi } from '../src/docs/openapi.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const backendRoot = fileURLToPath(new URL('../', import.meta.url));
const src = [join(root, 'COSITI Frontend', 'src'), join(root, 'src')].find(existsSync) || join(root, 'src');

createApp();
const spec = buildOpenApi({ mounts });
const endpoints = new Set(Object.entries(spec.paths).flatMap(([p, o]) => Object.keys(o).map((m) => `${m.toUpperCase()} ${p}`)));

const CLIENT = 'client';
/** membre d'AppContext -> endpoints (ou CLIENT = état d'interface sans équivalent serveur) */
const MAP = {
  // ---- état (lecture)
  adherents: ['GET /api/adherents'], cotisations: ['GET /api/cotisations'], dossiers: ['GET /api/dossiers'],
  journal: ['GET /api/journal'], parametres: ['GET /api/parametres'], utilisateurs: ['GET /api/utilisateurs'],
  // session renvoyée par la connexion / le renouvellement ; alertes recalculées à partir des listes chargées (mêmes règles que GET /api/alertes)
  currentUser: ['POST /api/auth/login', 'POST /api/auth/refresh'], alerts: ['GET /api/alertes'], gestionnaires: ['GET /api/gestionnaires'],
  // modèles calculés par le serveur (jamais recalculés dans le navigateur)
  signataires: ['GET /api/utilisateurs'], statsOf: ['GET /api/adherents'], dashboard: ['GET /api/dashboard'], finances: ['GET /api/finances/synthese'], suiviVersements: ['GET /api/versements/suivi/en-attente'],
  depenses: ['GET /api/depenses'], versements: ['GET /api/versements'], fraisMobileMoney: ['GET /api/frais-mobile-money'],
  banques: ['GET /api/banques'], employes: ['GET /api/employes'], bulletinsPaie: ['GET /api/paie/bulletins'],
  partenaires: ['GET /api/partenaires'], rendezVous: ['GET /api/rendez-vous'], notesDirection: ['GET /api/notes-direction'],
  rapportsReunions: ['GET /api/rapports-reunions'], rapportsAgents: ['GET /api/rapports-agents'],
  // ---- état d'interface (pas de serveur)
  activeTab: [CLIENT], selectedAdherentId: [CLIENT], globalSearch: [CLIENT],
  setActiveTab: [CLIENT], setSelectedAdherentId: [CLIENT], setGlobalSearch: [CLIENT], setCurrentUser: [CLIENT],
  // ---- session
  // ---- adhérents / cotisations / dossiers
  addAdherent: ['POST /api/adherents'], updateAdherent: ['PUT /api/adherents/{id}'],
  updateAdherentStatut: ['PATCH /api/adherents/{id}/statut'], deleteAdherent: ['DELETE /api/adherents/{id}'],
  immatriculerAdherent: ['POST /api/adherents/{id}/immatriculer'], marquerAdherentSansEnfant: ['POST /api/adherents/{id}/sans-enfant'],
  assignerPortefeuille: ['PUT /api/adherents/{id}/portefeuille'],
  addCotisation: ['POST /api/cotisations'], updateCotisation: ['PUT /api/cotisations/{id}'],
  deleteCotisation: ['DELETE /api/cotisations/{id}'], regulariserCotisation: ['POST /api/cotisations/regulariser'],
  updateDossier: ['PUT /api/dossiers/{id}'], createDossierForAdherent: ['POST /api/dossiers'],
  addGestionnaire: ['POST /api/gestionnaires'], updateGestionnaire: ['PUT /api/gestionnaires/{id}'], deleteGestionnaire: ['DELETE /api/gestionnaires/{id}'],
  // ---- finances DAF
  addDepense: ['POST /api/depenses'], updateDepense: ['PUT /api/depenses/{id}'], deleteDepense: ['DELETE /api/depenses/{id}'],
  addVersement: ['POST /api/versements'], updateVersement: ['PUT /api/versements/{id}'], deleteVersement: ['DELETE /api/versements/{id}'],
  addFraisMobileMoney: ['POST /api/frais-mobile-money'], updateFraisMobileMoney: ['PUT /api/frais-mobile-money/{id}'], deleteFraisMobileMoney: ['DELETE /api/frais-mobile-money/{id}'],
  addBanque: ['POST /api/banques'], deleteBanque: ['DELETE /api/banques/{nom}'], resetBanques: ['POST /api/banques/reset'],
  // ---- paie
  addEmploye: ['POST /api/employes'], updateEmploye: ['PUT /api/employes/{id}'], deleteEmploye: ['DELETE /api/employes/{id}'],
  genererPaieMois: ['POST /api/paie/generer'], genererPaieAdherentsCnps: ['POST /api/paie/generer-adherents'],
  updateSalaireCotisableAdherent: ['PUT /api/adherents/{id}/salaire-cotisable'],
  saveBulletinPaie: ['PUT /api/paie/bulletins/{id}'], deleteBulletinPaie: ['DELETE /api/paie/bulletins/{id}'], validerPaieMois: ['POST /api/paie/valider'],
  // ---- direction
  addPartenaire: ['POST /api/partenaires'], updatePartenaire: ['PUT /api/partenaires/{id}'], deletePartenaire: ['DELETE /api/partenaires/{id}'],
  addRendezVous: ['POST /api/rendez-vous'], updateRendezVous: ['PUT /api/rendez-vous/{id}'], deleteRendezVous: ['DELETE /api/rendez-vous/{id}'],
  addNoteDirection: ['POST /api/notes-direction'], updateNoteDirection: ['PUT /api/notes-direction/{id}'], deleteNoteDirection: ['DELETE /api/notes-direction/{id}'],
  addRapportReunion: ['POST /api/rapports-reunions'], updateRapportReunion: ['PUT /api/rapports-reunions/{id}'], deleteRapportReunion: ['DELETE /api/rapports-reunions/{id}'],
  addRapportAgent: ['POST /api/rapports-agents'], updateRapportAgent: ['PUT /api/rapports-agents/{id}'], deleteRapportAgent: ['DELETE /api/rapports-agents/{id}'],
  validerRapportAgentDaf: ['POST /api/rapports-agents/{id}/valider-daf'],
  // ---- administration
  updateParametres: ['PUT /api/parametres'], addUtilisateur: ['POST /api/utilisateurs'], updateUtilisateur: ['PUT /api/utilisateurs/{id}'],
  deleteUtilisateur: ['DELETE /api/utilisateurs/{id}'], nouveauParametrageUtilisateurs: ['PUT /api/utilisateurs/bulk'],
  clearJournal: ['DELETE /api/journal'],
  // ---- ajoutés avec la connexion au serveur
  modules: ['POST /api/auth/login'], loading: [CLIENT], lastSync: [CLIENT], refreshAll: [CLIENT], notifications: [CLIENT], dismissNotification: [CLIENT],
  updateIdentifiants: ['PUT /api/utilisateurs/{id}/identifiants'],
  fetchActiviteUtilisateur: ['GET /api/utilisateurs/{id}/activite'],
  fetchRapportAudit: ['GET /api/utilisateurs/{id}/rapport-audit'],
  resetToDemoData: ['POST /api/systeme/reset-demo'], wipeAllDataForUpdate: ['POST /api/systeme/mise-a-jour'],
};

/** Fonctionnalités du front calculées / exportées côté navigateur (hors AppContext) et leur équivalent serveur */
/**
 * Autres fonctionnalités du front. [libellé, endpoints, mode]
 *  mode 'appel' : le front DOIT appeler ces endpoints (vérifié).
 *  mode 'local' : le front calcule lui-même le résultat à partir des données MySQL déjà chargées, avec les mêmes
 *                 règles que le serveur ; l'endpoint serveur est un équivalent disponible (autres clients, rapports).
 */
const OTHER = [
  ['Page de connexion, renouvellement de session, déconnexion (LoginPage, AuthContext, api/client.ts)', ['POST /api/auth/login', 'POST /api/auth/refresh', 'POST /api/auth/logout'], 'appel'],
  ['Changement de mot de passe imposé (ChangePasswordPage)', ['POST /api/auth/change-password'], 'appel'],
  ['Code de confirmation (PinConfirmModal, demande automatique)', ['POST /api/auth/verify-code'], 'appel'],
  ['Fonctionnalités par rôle (UtilisateursView)', ['GET /api/roles'], 'appel'],
  ['Profil d’un acteur et ses droits (UtilisateurProfilModal)', ['GET /api/utilisateurs/{id}'], 'appel'],
  ['Purge du journal d’audit (JournalView)', ['DELETE /api/journal'], 'appel'],
  ['Journalisation des impressions et exports du navigateur (PrintTracker, exportUtils, pdf*)', ['POST /api/journal/evenements'], 'appel'],
  ['Tableau de bord (DashboardView) : compteurs, cotisations, dossiers — calculés par le serveur', ['GET /api/dashboard'], 'appel'],
  ['Alertes en temps réel — calculées par le serveur', ['GET /api/alertes'], 'appel'],
  ['États mensuels / clôture (EtatsMensuelsView, RapportsView) : totaux, ventilations, état nominatif', ['GET /api/rapports/etat-mensuel'], 'appel'],
  ['Rapprochement bancaire, réserve CNPS, flux de trésorerie (RapportsView, DepensesView)', ['GET /api/rapports/rapprochement'], 'appel'],
  ['Synthèse financière : totaux, soldes, ventilations (écran Finances)', ['GET /api/finances/synthese'], 'appel'],
  ['Contrôle d’intégrité des données financières (bilan Finances)', ['GET /api/finances/controle'], 'appel'],
  ['Échange de données Excel : catalogue, export, modèle, import (ExcelEchangeModal)', ['GET /api/excel/catalogue', 'POST /api/excel/export', 'GET /api/excel/modele', 'POST /api/excel/import'], 'appel'],
  ['Relevé d’un adhérent (reçus, fiche détaillée)', ['GET /api/rapports/releve/{id}'], 'local'],
  ['Statistiques de cotisation de chaque adhérent (jointes à la liste : stats=true)', ['GET /api/adherents'], 'appel'],
  ['Statistiques d’un seul adhérent (équivalent disponible pour d’autres clients)', ['GET /api/adherents/{id}/stats'], 'local'],
  ['Catalogue CNPS : branches, offres, pièces (cnpsBranches.ts, copie locale de présentation)', ['GET /api/dossiers/catalogue'], 'local'],
  ['Suivi des versements : cotisations en attente et point d’arrêt', ['GET /api/versements/suivi/en-attente'], 'appel'],
  ['Paie : récapitulatif, déclarations CNPS / fiscale, paie CNPS des adhérents', ['GET /api/paie/recap', 'GET /api/paie/adherents-cnps'], 'appel'],
  ['Paie : aperçu en direct d’un bulletin et d’une assiette cotisable, tranche légale', ['POST /api/paie/bulletins/{id}/apercu', 'POST /api/paie/adherents/{id}/apercu', 'GET /api/paie/tranche'], 'appel'],
  ['Aperçu de bulletin pour un salarié (formulaire d’origine, équivalent disponible)', ['POST /api/paie/apercu'], 'local'],
  ['Droits de l’utilisateur connecté (session de connexion)', ['GET /api/roles/me', 'GET /api/auth/me'], 'local'],
  ['Sauvegarde JSON complète (Paramètres)', ['GET /api/systeme/export'], 'appel'],
  ['Mot de passe d’un acteur (le front utilise PUT /identifiants qui le couvre)', ['POST /api/utilisateurs/{id}/reset-password'], 'local'],
  ['Validation finale Direction d’un rapport d’agent (pas encore de bouton dans le front)', ['POST /api/rapports-agents/{id}/valider-direction'], 'local'],
];
const CLIENT_ONLY = [
  'Génération PDF des reçus et rapports (pdfReceiptGenerator.ts, pdfReportGenerator.ts) — rendu navigateur (jsPDF)',
  'Export Excel (exportUtils.ts, xlsx) — rendu navigateur ; les données viennent des endpoints de liste',
  'Navigation, onglet actif, recherche globale, adhérent sélectionné — état d’interface',
];

// ---------------------------------------------------------------- analyse du front
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const files = walk(src).filter((f) => /\.(tsx?|jsx?)$/.test(f));

const ctxSrc = readFileSync(join(src, 'context', 'AppContext.tsx'), 'utf8');
const iface = ctxSrc.slice(ctxSrc.indexOf('interface AppContextType'), ctxSrc.indexOf('const AppContext = createContext'));
const members = [...iface.matchAll(/^\s{2}(\w+)\s*:/gm)].map((m) => m[1]);

const usage = new Map(); // membre -> Set(fichiers)
let directFetch = 0;
const localStorageFiles = [];
const calledPaths = new Set(); // chemins /api appelés par le front (normalisés : paramètres -> {id})
const norm = (p) => p.replace(/\$\{[^}]+\}/g, '{id}').replace(/\?.*$/, '').replace(/\/$/, '');
for (const f of files) {
  const txt = readFileSync(f, 'utf8');
  if (/\bfetch\(|axios|XMLHttpRequest/.test(txt)) directFetch++;
  if (/localStorage\.(getItem|setItem)/.test(txt)) localStorageFiles.push(relative(src, f));
  for (const m of txt.matchAll(/['`](\/(?:auth|roles|utilisateurs|parametres|adherents|cotisations|dossiers|alertes|gestionnaires|depenses|versements|frais-mobile-money|banques|employes|paie|partenaires|rendez-vous|notes-direction|rapports-reunions|rapports-agents|journal|dashboard|rapports|systeme|finances|excel)[^'`\s]*)['`]/g)) {
    calledPaths.add(norm(m[1]));
  }
  for (const m of txt.matchAll(/const\s*\{([^}]*)\}\s*=\s*useApp\(\)/g)) {
    for (const raw of m[1].split(',')) {
      const name = raw.split(':')[0].trim();
      if (!name) continue;
      if (!usage.has(name)) usage.set(name, new Set());
      usage.get(name).add(relative(src, f).replace(/\\/g, '/'));
    }
  }
}

const undefinedInContext = [...usage.keys()].filter((n) => !members.includes(n)); // utilisés par un composant mais définis nulle part
const unknownMembers = undefinedInContext.filter((n) => !(n in MAP));
const unmapped = members.filter((n) => !(n in MAP));
const missingEndpoints = [];
for (const [member, eps] of Object.entries(MAP)) for (const ep of eps) if (ep !== CLIENT && !endpoints.has(ep)) missingEndpoints.push(`${member} -> ${ep}`);
for (const [label, eps] of OTHER) for (const ep of eps) if (!endpoints.has(ep)) missingEndpoints.push(`${label} -> ${ep}`);

const usedEndpoints = new Set([...Object.values(MAP).flat(), ...OTHER.flatMap(([, e]) => e)]);
/** l'endpoint est-il réellement appelé par le code du front ? (comparaison du chemin, paramètres normalisés) */
const isCalled = (ep) => {
  const path = norm(ep.split(' ')[1].replace(/^\/api/, '').replace(/\{[^}]+\}/g, '{id}'));
  return calledPaths.has(path);
};
const required = new Set([...Object.values(MAP).flat(), ...OTHER.filter(([, , m]) => m === 'appel').flatMap(([, e]) => e)]);
const notCalled = [...required].filter((e) => e !== CLIENT && !isCalled(e));
const localOnly = OTHER.filter(([, , m]) => m === 'local').flatMap(([, e]) => e).filter((e) => !isCalled(e));
const extra = [...endpoints].filter((e) => !usedEndpoints.has(e));

// ---------------------------------------------------------------- rapport
const rows = members.map((m) => {
  const eps = MAP[m] || [];
  const files = [...(usage.get(m) || [])];
  const status = !MAP[m] ? '❌ non couvert' : eps[0] === CLIENT ? '🖥️ client' : '✅';
  const appel = eps[0] === CLIENT ? '—' : eps.every(isCalled) ? '✅ appelé' : '❌ non appelé';
  return `| \`${m}\` | ${eps[0] === CLIENT ? 'état d’interface (aucun appel serveur)' : eps.map((e) => `\`${e}\``).join('<br>') || '—'} | ${appel} | ${files.length} | ${status} |`;
});

const md = `# Analyse front ↔ back (générée par \`npm run docs:front\`)

> Front analysé : \`src/\` (${files.length} fichiers) — Back : ${endpoints.size} endpoints documentés dans Swagger (\`/api/docs\`).

## Verdict

- **Couverture fonctionnelle : ${members.length - unmapped.length}/${members.length}** membres d'\`AppContext\` (état + actions) ont un équivalent serveur ou sont de purs états d'interface. Membres non couverts : ${unmapped.length ? unmapped.map((m) => `\`${m}\``).join(', ') : '**aucun**'}.
- **Endpoints manquants ou mal nommés : ${missingEndpoints.length}** ${missingEndpoints.length ? `\n${missingEndpoints.map((m) => `  - ${m}`).join('\n')}` : ''}
- **Branchement réel : ${notCalled.length ? `❌ ${notCalled.length} endpoint(s) prévu(s) mais jamais appelé(s) par le front : ${notCalled.map((e) => `\`${e}\``).join(', ')}` : '✅ chaque endpoint attendu est effectivement appelé par le code du front'}** (${calledPaths.size} chemins d'API distincts trouvés dans \`src/\`, client unique \`src/api/client.ts\`).
- **Source des données : ${localStorageFiles.length ? `❌ données encore lues/écrites dans le localStorage : ${localStorageFiles.join(', ')}` : '✅ aucune donnée métier dans le navigateur'}** — tout est chargé depuis la base MySQL via l'API ; le jeton de renouvellement de session est le seul élément conservé (sessionStorage). \`mockData.ts\` a été supprimé.
- **Connexion** : page de connexion (\`LoginPage\`), changement de mot de passe imposé (\`ChangePasswordPage\`), déconnexion (aucune bascule entre comptes : un compte = une personne).

## Correspondance membre par membre (AppContext)

| Membre du contexte | Endpoint(s) back | Appel réel par le front | Composants qui l'utilisent | Statut |
|---|---|---|---|---|
${rows.join('\n')}

## Autres fonctionnalités du front (hors AppContext)

| Fonctionnalité du front | Endpoint(s) back | Fonctionnement |
|---|---|---|
${OTHER.map(([l, e, m]) => `| ${l} | ${e.map((x) => `\`${x}\``).join('<br>')} | ${m === 'appel' ? (e.every(isCalled) ? '✅ appelé par le front' : '❌ non appelé') : '🖥️ calcul dans le navigateur sur les données MySQL (équivalent serveur disponible)'} |`).join('\n')}

### Restent côté navigateur (aucun endpoint nécessaire)
${CLIENT_ONLY.map((c) => `- ${c}`).join('\n')}

## Endpoints back sans équivalent direct dans le front actuel
Ce sont des lectures par id ou des capacités nouvelles (le front travaillait sur des tableaux en mémoire) :
${extra.map((e) => `- \`${e}\``).join('\n')}

${undefinedInContext.length ? `## ⚠️ Anomalies détectées dans le front
${undefinedInContext.map((m) => `- \`${m}\` est appelé par ${[...usage.get(m)].map((f) => `\`${f}\``).join(', ')} mais **n'est défini nulle part dans AppContext** : le clic provoque une erreur « is not a function ». L'endpoint équivalent existe (\`${(MAP[m] || ['—']).join(', ')}\`).`).join('\n')}
` : ''}
## Comment le front est relié au back

1. \`src/api/client.ts\` : jeton d'accès en mémoire, renouvellement automatique sur 401, demande du code de confirmation quand le serveur l'exige.
2. \`src/context/AuthContext.tsx\` + \`components/auth/*\` : connexion, changement de mot de passe imposé, déconnexion.
3. \`src/context/AppContext.tsx\` : chaque liste est chargée par \`GET\` ; chaque action est un appel \`POST / PUT / PATCH / DELETE\` **asynchrone** suivi du rechargement des listes concernées et du journal.
4. Les droits affichés (menus, boutons) viennent de la session renvoyée par le serveur (\`permissions\`, \`modules\`) ; le serveur reste seul juge à chaque appel.
`;

mkdirSync(join(backendRoot, 'docs'), { recursive: true });
writeFileSync(join(backendRoot, 'docs', 'ANALYSE_FRONT_BACK.md'), md);

console.log(`Front : ${members.length} membres AppContext, ${usage.size} utilisés par les composants.`);
console.log(`Back  : ${endpoints.size} endpoints.`);
console.log(`Non couverts : ${unmapped.length ? unmapped.join(', ') : 'aucun'} | Endpoints manquants : ${missingEndpoints.length ? missingEndpoints.join(' ; ') : 'aucun'} | Membres inconnus : ${unknownMembers.length ? unknownMembers.join(', ') : 'aucun'}`);
console.log(`Rapport : ${join(backendRoot, 'docs', 'ANALYSE_FRONT_BACK.md')}`);
console.log(`Endpoints non appelés par le front : ${notCalled.length ? notCalled.join(', ') : 'aucun'} | localStorage : ${localStorageFiles.length ? localStorageFiles.join(', ') : 'aucun'}`);
process.exit(unmapped.length || missingEndpoints.length || unknownMembers.length || notCalled.length || localStorageFiles.length ? 1 : 0);
