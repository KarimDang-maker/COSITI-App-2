// npm run docs:roles : génère docs/ROLES.md à partir de la matrice RÉELLEMENT appliquée par le serveur
// (utils/roles.js, vérifiée contre le comportement HTTP par les tests « rôles »).
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ROLES } from '../src/utils/permissions.js';
import { MODULES, ROLES_DESCRIPTION, roleSheet } from '../src/utils/roles.js';

const sheets = Object.fromEntries(ROLES.map((r) => [r, roleSheet(r)]));
const short = (r) => r.replace("Caissière & Agent d'enregistrement", 'Caissière').replace('Conseil de Surveillance', 'Conseil Surv.').replace("Agent d'enregistrement", 'Agent enreg.').replace('Agent de consultation', 'Agent consult.');
const niveauIcon = { ecriture: '✏️ écriture', lecture: '👁️ lecture', aucun: '⛔ aucun' };
const who = (pred) => ROLES.filter(pred).map(short).join(', ') || '—';

const lines = [];
lines.push('# Rôles et fonctionnalités de la plateforme COSITI');
lines.push('');
lines.push('> Document généré par `npm run docs:roles` à partir de la matrice appliquée par le serveur (`src/utils/roles.js`). Les tests automatiques vérifient, pour **chacun des 9 rôles** et chaque action, que le serveur refuse (`403`) ou autorise exactement ce que dit ce tableau. Même chose en direct : `GET /api/roles`, `GET /api/roles/me`, et `modules` dans la réponse de `/api/auth/login`.');
lines.push('');
lines.push('## 1. Principe : des périmètres distincts, des accès partagés');
lines.push('');
lines.push('| Famille | Rôles | Périmètre |');
lines.push('|---|---|---|');
lines.push('| **Administration des accès** | Super Administrateur | Crée les comptes de tous les rôles ; **seul** à modifier les informations de connexion (e-mail, mot de passe, code PIN, déverrouillage) ; audite tous les acteurs ; accès complet aux modules |');
lines.push('| **Direction générale** | DG, DGA, Administrateur | Tous les modules métier. Seuls DG et DGA : notes confidentielles, validation finale des rapports d\'agents, correction des PV signés. Purge du journal : DG, DGA, Administrateur. Audit des acteurs |');
lines.push('| **Direction financière** | DAF | Tous les modules métier sauf purge du journal, validation finale Direction et notes confidentielles. Audit des acteurs |');
lines.push('| **Saisie / caisse** | Caissière & Agent d\'enregistrement, Agent d\'enregistrement | Adhérents, cotisations, immatriculation, dossiers, rapports d\'agents ; ni suppression, ni finances, ni administration ; leur propre activité seulement |');
lines.push('| **Supervision (lecture)** | PCA, Conseil de Surveillance, Agent de consultation | Consultation. PCA et Conseil de Surveillance : audit de tous les acteurs ; le PCA peut aussi lancer la mise à jour logicielle |');
lines.push('');
lines.push('**Accès partagés** : tous les rôles consultent adhérents, cotisations, dossiers, alertes, journal, PV, rapports d\'agents, gestionnaires et tableau de bord. Les modules **Finances**, **Paie** et **Agenda Direction** sont réservés à la direction (Super Administrateur, DG, DGA, Administrateur, DAF). Le volet financier du tableau de bord et des états mensuels suit la même règle. **Comptes et informations de connexion : Super Administrateur uniquement.** Chaque action de chaque acteur est journalisée ; son profil montre l\'historique complet et permet d\'imprimer son rapport d\'audit.');
lines.push('');
lines.push('## 2. Matrice complète (action × rôle)');
lines.push('');
lines.push(`| Module | Action | ${ROLES.map(short).join(' | ')} |`);
lines.push(`|---|---|${ROLES.map(() => ':-:').join('|')}|`);
for (const m of MODULES) {
  m.actions.forEach((a, i) => {
    const cells = ROLES.map((r) => (sheets[r].modules.find((x) => x.id === m.id).actions.find((x) => x.id === a.id).autorise ? '✅' : '—'));
    lines.push(`| ${i === 0 ? `**${m.label}**` : ''} | ${a.label}${a.kind === 'ecriture' ? ' ✏️' : ''} | ${cells.join(' | ')} |`);
  });
}
lines.push('');
lines.push('✅ autorisé · — refusé · ✏️ action qui modifie des données · Les actions marquées « (code de confirmation) » exigent en plus le code `X-Confirmation-Code`.');
lines.push('');
lines.push('## 3. Qui peut faire quoi, module par module');
lines.push('');
for (const m of MODULES) {
  lines.push(`### ${m.label}`);
  for (const a of m.actions) {
    const roles = ROLES.filter((r) => sheets[r].modules.find((x) => x.id === m.id).actions.find((x) => x.id === a.id).autorise);
    const all = roles.length === ROLES.length;
    lines.push(`- ${a.label}${a.kind === 'ecriture' ? ' ✏️' : ''} : ${all ? '**tous les rôles**' : roles.map(short).join(', ') || '*personne*'}`);
  }
  lines.push('');
}
lines.push('## 4. Fiche par rôle');
lines.push('');
for (const r of ROLES) {
  const d = ROLES_DESCRIPTION[r];
  const s = sheets[r];
  lines.push(`### ${r}`);
  lines.push(`*${d.titreOfficiel}* — accès « ${s.typeAcces} »`);
  lines.push('');
  lines.push(d.description);
  lines.push('');
  lines.push('**Droits clés**');
  d.droitsCles.forEach((x) => lines.push(`- ${x}`));
  if (d.restrictions.length) {
    lines.push('');
    lines.push('**Restrictions**');
    d.restrictions.forEach((x) => lines.push(`- ${x}`));
  }
  lines.push('');
  lines.push('| Module | Niveau |');
  lines.push('|---|---|');
  s.modules.forEach((m) => lines.push(`| ${m.label} | ${niveauIcon[m.niveau]} |`));
  lines.push('');
}
lines.push('## 5. Autres règles qui dépendent de la donnée (pas seulement du rôle)');
lines.push('');
lines.push('- **Notes de direction « Confidentiel Direction »** : invisibles (et 404) pour tout autre que DG et DGA, y compris le DAF.');
lines.push('- **PV de réunion** « Validé & Signé » / « Diffusé » : seuls DG et DGA peuvent les corriger ou les supprimer ; les autres peuvent seulement les passer à « Diffusé ».');
lines.push('- **Rapports d\'agents** : statut forcé à « Enregistré par Caissière » à la saisie ; « Vérifié DAF » via le visa du DAF ; « Validé Direction » via DG/DGA après le visa. Un rapport visé n\'est plus modifiable par la caissière.');
lines.push('- **Comptes utilisateurs** : un utilisateur sans droit de gestion ne peut modifier que son nom et son téléphone (pas d\'auto-promotion) ; impossible de supprimer/désactiver son propre compte ou le dernier gestionnaire de comptes actif.');
lines.push('- **Bulletins de paie validés** : verrouillés pour tous (repasser en brouillon pour modifier).');
lines.push('- **Adhérent ayant des cotisations** : non supprimable (statut « Radié » à la place).');
lines.push('- **Surcharge par compte** : un compte peut recevoir un `typeAcces` différent du défaut de son rôle ; les droits suivent alors ce `typeAcces` (`GET /api/auth/me` donne les droits effectifs de la personne connectée).');
lines.push('');

const out = fileURLToPath(new URL('../docs/ROLES.md', import.meta.url));
mkdirSync(fileURLToPath(new URL('../docs', import.meta.url)), { recursive: true });
writeFileSync(out, lines.join('\n'));
console.log(`docs/ROLES.md généré (${MODULES.length} modules, ${MODULES.reduce((n, m) => n + m.actions.length, 0)} actions, ${ROLES.length} rôles).`);
