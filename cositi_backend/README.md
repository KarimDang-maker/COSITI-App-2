# COSITI — Backend (API REST + MySQL)

API Node.js / Express de la plateforme COSITI. Le front (`../src`) se connecte avec une **page de connexion** et
lit / écrit **toutes** ses données par cette API : règles métier, droits d'accès et piste d'audit sont appliqués côté
serveur, les données vivent dans une **base MySQL** alimentée par le dossier [`database_mysql/`](../database_mysql).

- Node ≥ 20, MySQL 8 (ou MariaDB 10.5+), Express 4, JWT, bcrypt, zod, **Swagger UI**
- 59 tests d'intégration contre une vraie base MySQL (`npm test`) + parcours vérifiés dans Chrome (connexion, création de compte, audit)
- Documentation : **Swagger** `http://localhost:4000/api/docs` · [`docs/ROLES.md`](docs/ROLES.md) · [`docs/ANALYSE_FRONT_BACK.md`](docs/ANALYSE_FRONT_BACK.md)

## Démarrage

```bash
cd Backend
npm install
cp .env.example .env            # renseigner DB_PASSWORD, DB_ADMIN_PASSWORD (compte root MySQL)
npm run db:setup                # crée la base `cositi_ci`, l'utilisateur MySQL, le schéma, importe database_mysql/
npm start                       # http://localhost:4000/api   —   Swagger : http://localhost:4000/api/docs
```

`npm run db:setup` utilise le compte administrateur **uniquement pour créer ce qui manque** : la base, l'utilisateur
dédié `DB_USER` et ses privilèges (`SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX` sur la base, rien de global).
Il est idempotent : un utilisateur existant garde son mot de passe (`-- --reset-password` pour l'aligner sur `DB_PASSWORD`),
`-- --with-tests` donne en plus les droits sur la base de test `cositi_test`. Sans lui : exécutez `database/00_create_database_and_user.sql`.

**Au démarrage** (`npm start`), avant d'ouvrir le port HTTP, l'API :
1. se connecte au serveur MySQL avec `DB_USER` (message explicite si le serveur est injoignable ou l'accès refusé) ;
2. vérifie la base `DB_NAME` et la crée si elle manque (`DB_AUTO_CREATE=true`, privilège `CREATE` requis ; sinon erreur
   indiquant les privilèges à accorder) ;
3. crée les tables manquantes et ajoute les colonnes / index manquants (`database/schema.sql`) — jamais de suppression ;
4. importe `database_mysql/` **uniquement si toutes les tables sont vides**, puis garantit le Super Administrateur.

Le compte administrateur n'est **jamais** utilisé automatiquement au démarrage, sauf si `DB_PROVISION_ON_START=true`.
Dans ce cas, et seulement si `DB_USER` est refusé ou manque de privilèges, l'API fait la même chose que `db:setup`, puis réessaie une fois.

Puis le front, dans un second terminal (le serveur Vite relaie `/api` vers le port 4000) :

```bash
cd ..                            # racine du projet
npm install
npm run dev                      # http://localhost:3000  →  page de connexion COSITI
```

Pour un autre hôte d'API : `VITE_API_PROXY=http://serveur:4000 npm run dev` (ou `VITE_API_URL` pour un appel direct).

Autres scripts : `npm run db:seed` (réimporte le dump, **efface** les données) · `npm test` · `npm run docs:all`
(valide l'OpenAPI, régénère `docs/ROLES.md` et `docs/ANALYSE_FRONT_BACK.md`).

## Base de données MySQL

| | |
|---|---|
| Base | `cositi_ci` (utf8mb4 / `utf8mb4_unicode_ci`), 19 tables |
| Schéma | [`database/schema.sql`](database/schema.sql) — **les 13 tables et toutes les colonnes du dump**, plus : identifiants de connexion, colonnes manquantes, 5 tables absentes du dump (`partenaires`, `rendez_vous`, `notes_direction`, `rapports_reunions`, `rapports_agents`) et `refresh_tokens` |
| Données | celles de `database_mysql/cositi_database_mysql_dump.sql`, **importées telles quelles** (INSERT du dump, mêmes valeurs) |
| Auto-réparation | si vous importez d'abord le dump brut avec `mysql < …dump.sql` (qui recrée les tables d'origine), le démarrage de l'API **ajoute les colonnes/index/tables manquants** et crée les identifiants de connexion |

Données importées (vérifiées par les tests) : 1 paramétrage, 6 utilisateurs (+ le Super Administrateur créé au démarrage), 3 gestionnaires, 7 adhérents, 17 cotisations
(102 400 FCFA), 2 dossiers CNPS, 6 dépenses (378 000), 3 versements (360 000), 5 frais Mobile Money, 8 banques, 6 salariés,
14 bulletins, 6 entrées de journal. Les tables absentes du dump (partenaires, rendez-vous, notes, PV, rapports d'agents) sont vides.

Compléments appliqués à l'import (le dump ne les contient pas) :
- **Identifiants de connexion** : mot de passe et code PIN de chaque compte, **hachés (bcrypt)**.
- Le **code de confirmation** du dump (`0000` en clair) est haché ; la colonne en clair est vidée.
- **Fiche des salariés** (sexe, contrat, indemnités, banque…) et **détail des bulletins** : calculés/complétés ; les montants du dump font foi (aucun écart constaté).
- `dernier_acces` des utilisateurs : colonne en `VARCHAR` (le dump la déclare `DATETIME` mais y met du texte libre).

### Comptes de connexion (créés en base, mots de passe hachés)

| E-mail | Rôle | Mot de passe initial |
|---|---|---|
| `superadmin@cositi-ci.org` | **Super Administrateur** | `SuperAdmin@2026!` (`SUPERADMIN_PASSWORD`) |
| `dg@cositi-ci.org` | DG | `Cositi@2026!` |
| `dga@cositi-ci.org` | DGA | `Cositi@2026!` |
| `daf@cositi-ci.org` | DAF | `Cositi@2026!` |
| `caisse@cositi-ci.org` | Caissière & Agent d'enregistrement | `Cositi@2026!` |
| `pca@cositi-ci.org` | PCA | `Cositi@2026!` |
| `surveillance@cositi-ci.org` | Conseil de Surveillance | `Cositi@2026!` |

Code de confirmation des actions sensibles **`0000`** (`SEED_DEFAULT_PASSWORD` pour les mots de passe). Il n'existe **aucun code PIN de compte
ni basculement entre rôles** : chaque personne se connecte uniquement avec les identifiants créés pour elle par le Super Administrateur.
Le Super Administrateur est créé au démarrage s'il n'en existe aucun ; en production, laissez `SUPERADMIN_PASSWORD` vide :
un mot de passe aléatoire est affiché **une seule fois** dans la console et son changement est imposé.
**Tous ces mots de passe sont à changer en production** ; `SEED_FORCE_PASSWORD_CHANGE=true` impose le changement à la
première connexion (le front affiche alors l'écran « Choisissez votre mot de passe »).

## Authentification & sécurité

| Étape | Endpoint | Détail |
|---|---|---|
| Connexion | `POST /api/auth/login` `{email, password}` | `accessToken` (JWT 15 min), `refreshToken` (7 j, usage unique), `user`, `permissions`, `modules`, `mustChangePassword` |
| Renouvellement | `POST /api/auth/refresh` `{refreshToken}` | **rotation** ; rejouer un ancien jeton coupe toute la session ; deux requêtes simultanées : une seule réussit |
| Déconnexion | `POST /api/auth/logout` | révoque la session |
| Profil + droits | `GET /api/auth/me` | |
| Mot de passe | `POST /api/auth/change-password` | 8+ car., majuscule, minuscule, chiffre ; ferme les autres sessions |
| Code de confirmation | `POST /api/auth/verify-code` `{pinCode}` | |

**Dans le front** : page de connexion (logo COSITI, illustration du secteur informel), écran de changement de mot de passe
imposé, bouton « Se déconnecter » dans le menu du profil, reprise de session après rechargement (jeton de renouvellement
en `sessionStorage`, fermé avec le navigateur), demande automatique du code de confirmation quand le serveur l'exige.

Dans Swagger : *POST /api/auth/login* → copier `data.accessToken` → bouton **Authorize**.

Mesures : bcrypt, verrouillage du compte après 5 échecs (15 min), message identique « compte inconnu / mauvais mot de
passe », jetons révoqués immédiatement si rôle/statut/mot de passe change, validation stricte (champs inconnus ignorés),
SQL toujours paramétré, CORS en liste blanche, helmet, limitation de débit (`API_RATE_LIMIT`, `LOGIN_RATE_LIMIT`),
aucun secret dans les réponses ni l'export.

**Codes de sécurité** : *code de confirmation* (`X-Confirmation-Code`, haché en base, modifiable dans Paramètres) pour
modifier/supprimer les données sensibles ; *code de maintenance* (`X-Maintenance-Code`, `MAINTENANCE_CODE`) pour la mise à jour logicielle.

## Rôles et fonctionnalités

Dix profils, séparés mais avec des **accès partagés** (détail et matrice complète : [`docs/ROLES.md`](docs/ROLES.md)) :

| Famille | Rôles | Périmètre |
|---|---|---|
| Administration des accès | **Super Administrateur** | crée les comptes de **tous les rôles** ; **seul** à modifier les informations de connexion d'un acteur (e-mail, mot de passe, code PIN, déverrouillage) ; audite tous les acteurs ; accès complet |
| Direction générale | DG, DGA, Administrateur | tous les modules métier (notes confidentielles, validation finale des rapports d'agents, correction des PV signés : DG/DGA) ; audit des acteurs |
| Direction financière | DAF | tous les modules métier sauf purge du journal, validation finale Direction, notes confidentielles ; audit des acteurs |
| Saisie / caisse | Caissière & Agent d'enregistrement, Agent d'enregistrement | adhérents, cotisations, immatriculation, dossiers, rapports d'agents ; ni suppression, ni finances, ni administration |
| Supervision | PCA, Conseil de Surveillance, Agent de consultation | lecture seule ; PCA et Conseil de Surveillance auditent tous les acteurs ; le PCA peut lancer la mise à jour |

Tous consultent adhérents, cotisations, dossiers, alertes, journal, PV, rapports d'agents, gestionnaires, tableau de bord ;
**Finances, Paie et Agenda Direction** sont réservés à la direction. Le serveur expose ces droits :
`GET /api/roles` (10 fiches, affichées dans l'écran *Utilisateurs* du front), `GET /api/roles/me` et `modules` dans la réponse de login.
Un test vérifie, pour chacun des 10 rôles et plus de 300 combinaisons rôle × action, que **la matrice publiée = le comportement réel du serveur**.

## Journal d'audit et rapport par acteur

- **Chaque action est journalisée** avec son auteur (`utilisateur_id`) : toutes les créations / modifications / suppressions,
  connexions, échecs de connexion, déconnexions, changements de mot de passe et d'identifiants,
  codes de confirmation erronés, exports, impressions (reçus, rapports, bulletins — tracés par le front via
  `POST /api/journal/evenements`) et consultations d'audit.
- **Profil d'un acteur** (écran *Utilisateurs* → clic sur l'acteur) : identité, droits, statistiques et **toutes ses actions**,
  filtrables par période et par type (`GET /api/utilisateurs/{id}/activite`). Les entrées historiques du dump, sans identifiant,
  sont rattachées par le nom.
- **Rapport d'audit imprimable** (bouton *Rapport d'audit*, `GET /api/utilisateurs/{id}/rapport-audit`) : en-tête COSITI,
  acteur, période, synthèse, répartition par opération, droits du profil, détail des actions, zones de visa. Sa génération
  et son impression sont elles-mêmes tracées.
- Visibilité : Super Administrateur, DG, DGA, DAF, PCA, Conseil de Surveillance, Administrateur voient tous les acteurs ;
  les autres ne voient que leur propre activité.

## Endpoints (133) — détail dans Swagger

Chaque opération Swagger indique ses **rôles autorisés**, ses codes de sécurité et son schéma de requête (généré à
partir des routes réelles : la doc ne peut pas diverger du code). Réponses : `{ success, data, meta? }` / `{ success: false, error, details?, code? }`.

| Domaine | Endpoints |
|---|---|
| Authentification | `/auth/login · refresh · logout · me · change-password · verify-code` |
| Rôles | `/roles`, `/roles/me`, `/roles/{role}` |
| Utilisateurs | `/utilisateurs` (CRUD, `/bulk`, `/{id}/identifiants`, `/{id}/reset-password`, `/{id}/activite`, `/{id}/rapport-audit`) |
| Paramètres | `/parametres` |
| Adhérents | `/adherents` (CRUD, `/{id}/stats · statut · immatriculer · sans-enfant · portefeuille · salaire-cotisable`) |
| Gestionnaires | `/gestionnaires` |
| Cotisations | `/cotisations` (CRUD, `/regulariser`) |
| Dossiers CNPS / alertes | `/dossiers` (+ `/catalogue`), `/alertes` |
| Finances DAF | `/depenses`, `/versements` (+ `/suivi/en-attente`), `/frais-mobile-money`, `/banques`, `/finances/synthese`, `/finances/controle` |
| Paie | `/employes`, `/paie/bulletins` (+ `/{id}/apercu`), `/paie/generer · generer-adherents · valider · apercu · recap · adherents-cnps · tranche`, `/paie/adherents/{id}/apercu` |
| Direction | `/partenaires`, `/rendez-vous`, `/notes-direction` |
| PV & rapports d'agents | `/rapports-reunions`, `/rapports-agents` (+ `/valider-daf`, `/valider-direction`) |
| Audit & pilotage | `/journal` (+ `/evenements`), `/dashboard`, `/rapports/etat-mensuel`, `/rapports/rapprochement`, `/rapports/etats-mensuels`, `/rapports/releve/{id}` |
| Échange Excel | `/excel/catalogue · modele · export · import` |
| Système | `/systeme/health · export · reset-demo · mise-a-jour` |

## Front ↔ back

Le front est **branché sur l'API** : `src/api/client.ts` (jetons, renouvellement, code de confirmation), `src/context/AuthContext.tsx`
(session), `src/context/AppContext.tsx` (chaque liste chargée par `GET`, chaque action envoyée au serveur puis listes rechargées).
Le `localStorage` n'est plus utilisé et `mockData.ts` a été supprimé : **les données affichées sont celles de MySQL**.

Vérifications faites :
- `npm run docs:front` ([`docs/ANALYSE_FRONT_BACK.md`](docs/ANALYSE_FRONT_BACK.md)) : les 98 membres d'`AppContext` sont couverts,
  chaque endpoint attendu est effectivement appelé par le code du front, aucune donnée métier dans le navigateur ;
- dans Chrome : une valeur modifiée directement en SQL apparaît à l'écran, et un compte créé depuis l'écran est bien en base (mot de passe haché) ;
- TypeScript : les types React manquaient (`@types/react`), ce qui masquait toutes les erreurs ; une fois ajoutés, 84 erreurs ont été corrigées,
  dont des **champs mal nommés qui empêchaient l'affichage** (objectif des gestionnaires, motif / pièce des dépenses, complément des
  régularisations, jours de retard dans les alertes, mode « MTN MoMo » exclu des totaux Mobile Money…).

## Calculs financiers : tout est fait par le serveur

Le navigateur n'additionne ni ne calcule plus aucun montant métier : il **affiche** ce que le serveur calcule à partir de MySQL.

| Donnée affichée | Calculée par |
|---|---|
| Statistiques de cotisation de chaque adhérent (cumul, retard, seuil) | `GET /adherents?stats=true` |
| Tableau de bord, alertes | `GET /dashboard`, `GET /alertes` |
| Totaux, réserve CNPS, solde réel en banque, taux de couverture, ventilations | `GET /finances/synthese`, `GET /rapports/rapprochement` |
| État mensuel (totaux, modes, agents, état nominatif) | `GET /rapports/etat-mensuel` |
| Cotisations en attente de versement, repères des versements | `GET /versements/suivi/en-attente`, `reperes` joints à `GET /versements` |
| Paie : bulletins, déclarations CNPS et DGI, paie CNPS des adhérents, tranche légale, aperçus en direct | `/paie/recap`, `/paie/adherents-cnps`, `/paie/tranche`, `…/apercu` |
| Cohérence des données financières | `GET /finances/controle` (lecture seule : orphelins, doublons, écarts de calcul, écriture de paie ≠ bulletins) |

Arithmétique **exacte au centime** (`src/utils/money.js`) : les sommes se font en centimes entiers (colonnes `DECIMAL(15,2)`), les montants
à plus de 2 décimales ou hors capacité sont refusés (400) avant d'atteindre la base. Une erreur MySQL (doublon, valeur trop longue…) devient
un statut 4xx clair, jamais un plantage.

## Échange de données Excel (export ⇄ import, même format)

Le serveur produit **et relit** le même classeur (`src/services/excel.js`) : une feuille par donnée (Adhérents, Cotisations, Dépenses,
Versements, Frais Mobile Money, Employés, Gestionnaires, Banques ; Bulletins de paie en export seul), montants numériques en FCFA, dates
AAAA-MM-JJ, colonne « ID » stable. Un fichier exporté peut être modifié hors de l'application puis **réimporté tel quel**.

- **Export** : `GET|POST /excel/export` (sélection, période, liste filtrée) · **modèle vierge** : `GET /excel/modele` — chacun limité aux données autorisées au profil.
- **Import** en deux temps : `POST /excel/import?mode=simulation` (tout est exécuté puis annulé : rapport exact ligne par ligne) puis `mode=import`
  (code de confirmation exigé). **Tout ou rien** : une ligne refusée annule l'import (sauf `ignorerErreurs=true`).
- Chaque ligne passe par les **mêmes validations, règles métier et journal** que la saisie manuelle (adhérent radié, doublon de référence, frais > transaction…).
- **Jamais de suppression** ; une cellule vide laisse la valeur existante ; réimporter deux fois le même fichier ne crée aucun doublon.
- Interface : Paramètres → « Échange de données Excel », Finances → « Excel : exporter / importer », boutons d'export des listes.

## Règles métier côté serveur

Matricule `COSITI-xxxx` atomique (verrou de ligne) · seuil d'immatriculation (15 000 FCFA ⇒ « Éligible ») · dossier CNPS créé à
l'immatriculation · travailleur « sans enfant » · retard de cotisation sur cycle de 30 jours · 4 types d'alertes · origine des fonds
· suivi des versements (points d'arrêt, tranche couverte) · moteur de paie CNPS/CGI Cameroun · journal d'audit transactionnel
(une opération et sa trace sont validées ou annulées ensemble).

### Écarts volontaires avec le front
1. Suppression d'un adhérent ayant des cotisations refusée (409) : passer son statut à « Radié ».
2. Références de cotisation uniques ; cotisation refusée pour un adhérent « Radié ».
3. Paie : bulletins générés en *Brouillon* ; validation idempotente (une seule dépense `PAIE-AAAA-MM`, personnel uniquement) ; bulletin validé verrouillé ; montants toujours recalculés par le serveur.
4. Mots de passe et codes **hachés** (le front les affichait en clair) ; création de comptes et modification des identifiants : **Super Administrateur uniquement**.
5. `1111` / `0000` ne sont plus codés en dur : code de confirmation configurable, code de maintenance en variable d'environnement.
6. PV signé modifiable par DG/DGA seulement ; rapport d'agent visé verrouillé pour la caissière ; statuts de validation uniquement via les endpoints de visa.
7. Dépense de paie non modifiable/supprimable tant que la paie est validée ; salarié avec bulletins et partenaire avec rendez-vous non supprimables.
8. `dateRegularisation` est un horodatage ISO (colonne `DATETIME`), plus un texte `jj/mm/aaaa hh:mm`.

## Tests

`npm test` exécute 126 scénarios sur des **bases MySQL jetables** (une par fichier, importées depuis le dump) avec un vrai serveur HTTP :

| Fichier | Contenu |
|---|---|
| `tests/api.test.js` (59) | données = dump, connexion, droits des 10 rôles, règles métier, paie, journal, Swagger |
| `tests/persistance.test.js` (19) | **CRUD de chaque donnée** : création → relecture → modification → redémarrage de la base → suppression, avec contrôle SQL direct et journal |
| `tests/finances.test.js` (23) | précision au centime, totaux = SQL, paie ↔ dépense, contrôle d'intégrité, concurrence (15 cotisations / 8 adhérents simultanés), persistance après redémarrage |
| `tests/rapports.test.js` (7) | rapprochement, état mensuel, tableau de bord, repères de versements, paie CNPS : chaque chiffre recoupé avec SQL |
| `tests/excel.test.js` (18) | export, modèle, **aller-retour** (export → effacement SQL → import = mêmes ID et montants), validations, sécurité, 300 lignes |

Le compte MySQL doit pouvoir créer/supprimer les bases `cositi_test*` (`npm run db:setup -- --with-tests` lui en donne le droit).
Le parcours **navigateur réel** (Chrome → front → API → MySQL, 30 contrôles : chiffres affichés = chiffres du serveur, export et import Excel
via l'interface) est décrit dans `docs/RECAP_PLATEFORME.md`.

## Production — checklist

- `NODE_ENV=production`, `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` aléatoires (32+ caractères, distincts) — le serveur refuse de démarrer sinon
- changer `DB_PASSWORD`, `MAINTENANCE_CODE`, le code de confirmation (Paramètres), les mots de passe/PIN des comptes ; `SEED_FORCE_PASSWORD_CHANGE=true`
- `CORS_ORIGINS` = URL réelle du front ; `TRUST_PROXY=1` derrière un reverse proxy ; HTTPS
- `ALLOW_DEMO_RESET` est désactivé par défaut en production (l'endpoint efface toutes les données)
- sauvegardes MySQL régulières (`mysqldump cositi_ci`) ou `GET /api/systeme/export`
