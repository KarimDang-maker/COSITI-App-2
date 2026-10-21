# Analyse front ↔ back (générée par `npm run docs:front`)

> Front analysé : `src/` (65 fichiers) — Back : 133 endpoints documentés dans Swagger (`/api/docs`).

## Verdict

- **Couverture fonctionnelle : 102/102** membres d'`AppContext` (état + actions) ont un équivalent serveur ou sont de purs états d'interface. Membres non couverts : **aucun**.
- **Endpoints manquants ou mal nommés : 0** 
- **Branchement réel : ✅ chaque endpoint attendu est effectivement appelé par le code du front** (75 chemins d'API distincts trouvés dans `src/`, client unique `src/api/client.ts`).
- **Source des données : ✅ aucune donnée métier dans le navigateur** — tout est chargé depuis la base MySQL via l'API ; le jeton de renouvellement de session est le seul élément conservé (sessionStorage). `mockData.ts` a été supprimé.
- **Connexion** : page de connexion (`LoginPage`), changement de mot de passe imposé (`ChangePasswordPage`), déconnexion (aucune bascule entre comptes : un compte = une personne).

## Correspondance membre par membre (AppContext)

| Membre du contexte | Endpoint(s) back | Appel réel par le front | Composants qui l'utilisent | Statut |
|---|---|---|---|---|
| `adherents` | `GET /api/adherents` | ✅ appelé | 17 | ✅ |
| `cotisations` | `GET /api/cotisations` | ✅ appelé | 15 | ✅ |
| `dossiers` | `GET /api/dossiers` | ✅ appelé | 6 | ✅ |
| `journal` | `GET /api/journal` | ✅ appelé | 2 | ✅ |
| `parametres` | `GET /api/parametres` | ✅ appelé | 25 | ✅ |
| `utilisateurs` | `GET /api/utilisateurs` | ✅ appelé | 4 | ✅ |
| `currentUser` | `POST /api/auth/login`<br>`POST /api/auth/refresh` | ✅ appelé | 25 | ✅ |
| `modules` | `POST /api/auth/login` | ✅ appelé | 0 | ✅ |
| `alerts` | `GET /api/alertes` | ✅ appelé | 4 | ✅ |
| `signataires` | `GET /api/utilisateurs` | ✅ appelé | 4 | ✅ |
| `statsOf` | `GET /api/adherents` | ✅ appelé | 7 | ✅ |
| `dashboard` | `GET /api/dashboard` | ✅ appelé | 2 | ✅ |
| `finances` | `GET /api/finances/synthese` | ✅ appelé | 1 | ✅ |
| `suiviVersements` | `GET /api/versements/suivi/en-attente` | ✅ appelé | 1 | ✅ |
| `gestionnaires` | `GET /api/gestionnaires` | ✅ appelé | 6 | ✅ |
| `depenses` | `GET /api/depenses` | ✅ appelé | 3 | ✅ |
| `versements` | `GET /api/versements` | ✅ appelé | 3 | ✅ |
| `fraisMobileMoney` | `GET /api/frais-mobile-money` | ✅ appelé | 2 | ✅ |
| `banques` | `GET /api/banques` | ✅ appelé | 5 | ✅ |
| `employes` | `GET /api/employes` | ✅ appelé | 2 | ✅ |
| `bulletinsPaie` | `GET /api/paie/bulletins` | ✅ appelé | 2 | ✅ |
| `partenaires` | `GET /api/partenaires` | ✅ appelé | 1 | ✅ |
| `rendezVous` | `GET /api/rendez-vous` | ✅ appelé | 1 | ✅ |
| `notesDirection` | `GET /api/notes-direction` | ✅ appelé | 1 | ✅ |
| `rapportsReunions` | `GET /api/rapports-reunions` | ✅ appelé | 1 | ✅ |
| `rapportsAgents` | `GET /api/rapports-agents` | ✅ appelé | 1 | ✅ |
| `loading` | état d’interface (aucun appel serveur) | — | 0 | 🖥️ client |
| `lastSync` | état d’interface (aucun appel serveur) | — | 1 | 🖥️ client |
| `refreshAll` | état d’interface (aucun appel serveur) | — | 1 | 🖥️ client |
| `notifications` | état d’interface (aucun appel serveur) | — | 1 | 🖥️ client |
| `dismissNotification` | état d’interface (aucun appel serveur) | — | 1 | 🖥️ client |
| `activeTab` | état d’interface (aucun appel serveur) | — | 2 | 🖥️ client |
| `selectedAdherentId` | état d’interface (aucun appel serveur) | — | 0 | 🖥️ client |
| `globalSearch` | état d’interface (aucun appel serveur) | — | 0 | 🖥️ client |
| `setActiveTab` | état d’interface (aucun appel serveur) | — | 8 | 🖥️ client |
| `setSelectedAdherentId` | état d’interface (aucun appel serveur) | — | 1 | 🖥️ client |
| `setGlobalSearch` | état d’interface (aucun appel serveur) | — | 0 | 🖥️ client |
| `setCurrentUser` | état d’interface (aucun appel serveur) | — | 2 | 🖥️ client |
| `addGestionnaire` | `POST /api/gestionnaires` | ✅ appelé | 1 | ✅ |
| `updateGestionnaire` | `PUT /api/gestionnaires/{id}` | ✅ appelé | 1 | ✅ |
| `deleteGestionnaire` | `DELETE /api/gestionnaires/{id}` | ✅ appelé | 1 | ✅ |
| `assignerPortefeuille` | `PUT /api/adherents/{id}/portefeuille` | ✅ appelé | 1 | ✅ |
| `addRapportReunion` | `POST /api/rapports-reunions` | ✅ appelé | 1 | ✅ |
| `updateRapportReunion` | `PUT /api/rapports-reunions/{id}` | ✅ appelé | 1 | ✅ |
| `deleteRapportReunion` | `DELETE /api/rapports-reunions/{id}` | ✅ appelé | 1 | ✅ |
| `addRapportAgent` | `POST /api/rapports-agents` | ✅ appelé | 1 | ✅ |
| `updateRapportAgent` | `PUT /api/rapports-agents/{id}` | ✅ appelé | 1 | ✅ |
| `deleteRapportAgent` | `DELETE /api/rapports-agents/{id}` | ✅ appelé | 1 | ✅ |
| `validerRapportAgentDaf` | `POST /api/rapports-agents/{id}/valider-daf` | ✅ appelé | 1 | ✅ |
| `addAdherent` | `POST /api/adherents` | ✅ appelé | 1 | ✅ |
| `updateAdherent` | `PUT /api/adherents/{id}` | ✅ appelé | 1 | ✅ |
| `updateAdherentStatut` | `PATCH /api/adherents/{id}/statut` | ✅ appelé | 2 | ✅ |
| `deleteAdherent` | `DELETE /api/adherents/{id}` | ✅ appelé | 1 | ✅ |
| `addCotisation` | `POST /api/cotisations` | ✅ appelé | 1 | ✅ |
| `updateCotisation` | `PUT /api/cotisations/{id}` | ✅ appelé | 1 | ✅ |
| `deleteCotisation` | `DELETE /api/cotisations/{id}` | ✅ appelé | 1 | ✅ |
| `regulariserCotisation` | `POST /api/cotisations/regulariser` | ✅ appelé | 1 | ✅ |
| `immatriculerAdherent` | `POST /api/adherents/{id}/immatriculer` | ✅ appelé | 1 | ✅ |
| `updateDossier` | `PUT /api/dossiers/{id}` | ✅ appelé | 1 | ✅ |
| `createDossierForAdherent` | `POST /api/dossiers` | ✅ appelé | 1 | ✅ |
| `marquerAdherentSansEnfant` | `POST /api/adherents/{id}/sans-enfant` | ✅ appelé | 1 | ✅ |
| `addDepense` | `POST /api/depenses` | ✅ appelé | 1 | ✅ |
| `updateDepense` | `PUT /api/depenses/{id}` | ✅ appelé | 1 | ✅ |
| `deleteDepense` | `DELETE /api/depenses/{id}` | ✅ appelé | 1 | ✅ |
| `addVersement` | `POST /api/versements` | ✅ appelé | 1 | ✅ |
| `updateVersement` | `PUT /api/versements/{id}` | ✅ appelé | 1 | ✅ |
| `deleteVersement` | `DELETE /api/versements/{id}` | ✅ appelé | 1 | ✅ |
| `addBanque` | `POST /api/banques` | ✅ appelé | 2 | ✅ |
| `deleteBanque` | `DELETE /api/banques/{nom}` | ✅ appelé | 1 | ✅ |
| `resetBanques` | `POST /api/banques/reset` | ✅ appelé | 1 | ✅ |
| `addFraisMobileMoney` | `POST /api/frais-mobile-money` | ✅ appelé | 1 | ✅ |
| `updateFraisMobileMoney` | `PUT /api/frais-mobile-money/{id}` | ✅ appelé | 1 | ✅ |
| `deleteFraisMobileMoney` | `DELETE /api/frais-mobile-money/{id}` | ✅ appelé | 1 | ✅ |
| `addEmploye` | `POST /api/employes` | ✅ appelé | 1 | ✅ |
| `updateEmploye` | `PUT /api/employes/{id}` | ✅ appelé | 1 | ✅ |
| `deleteEmploye` | `DELETE /api/employes/{id}` | ✅ appelé | 1 | ✅ |
| `genererPaieMois` | `POST /api/paie/generer` | ✅ appelé | 1 | ✅ |
| `genererPaieAdherentsCnps` | `POST /api/paie/generer-adherents` | ✅ appelé | 1 | ✅ |
| `updateSalaireCotisableAdherent` | `PUT /api/adherents/{id}/salaire-cotisable` | ✅ appelé | 1 | ✅ |
| `saveBulletinPaie` | `PUT /api/paie/bulletins/{id}` | ✅ appelé | 1 | ✅ |
| `deleteBulletinPaie` | `DELETE /api/paie/bulletins/{id}` | ✅ appelé | 1 | ✅ |
| `validerPaieMois` | `POST /api/paie/valider` | ✅ appelé | 1 | ✅ |
| `addPartenaire` | `POST /api/partenaires` | ✅ appelé | 1 | ✅ |
| `updatePartenaire` | `PUT /api/partenaires/{id}` | ✅ appelé | 1 | ✅ |
| `deletePartenaire` | `DELETE /api/partenaires/{id}` | ✅ appelé | 1 | ✅ |
| `addRendezVous` | `POST /api/rendez-vous` | ✅ appelé | 1 | ✅ |
| `updateRendezVous` | `PUT /api/rendez-vous/{id}` | ✅ appelé | 1 | ✅ |
| `deleteRendezVous` | `DELETE /api/rendez-vous/{id}` | ✅ appelé | 1 | ✅ |
| `addNoteDirection` | `POST /api/notes-direction` | ✅ appelé | 1 | ✅ |
| `updateNoteDirection` | `PUT /api/notes-direction/{id}` | ✅ appelé | 1 | ✅ |
| `deleteNoteDirection` | `DELETE /api/notes-direction/{id}` | ✅ appelé | 1 | ✅ |
| `updateParametres` | `PUT /api/parametres` | ✅ appelé | 1 | ✅ |
| `addUtilisateur` | `POST /api/utilisateurs` | ✅ appelé | 1 | ✅ |
| `updateUtilisateur` | `PUT /api/utilisateurs/{id}` | ✅ appelé | 1 | ✅ |
| `updateIdentifiants` | `PUT /api/utilisateurs/{id}/identifiants` | ✅ appelé | 1 | ✅ |
| `deleteUtilisateur` | `DELETE /api/utilisateurs/{id}` | ✅ appelé | 1 | ✅ |
| `nouveauParametrageUtilisateurs` | `PUT /api/utilisateurs/bulk` | ✅ appelé | 0 | ✅ |
| `fetchActiviteUtilisateur` | `GET /api/utilisateurs/{id}/activite` | ✅ appelé | 1 | ✅ |
| `fetchRapportAudit` | `GET /api/utilisateurs/{id}/rapport-audit` | ✅ appelé | 1 | ✅ |
| `clearJournal` | `DELETE /api/journal` | ✅ appelé | 1 | ✅ |
| `resetToDemoData` | `POST /api/systeme/reset-demo` | ✅ appelé | 1 | ✅ |
| `wipeAllDataForUpdate` | `POST /api/systeme/mise-a-jour` | ✅ appelé | 1 | ✅ |

## Autres fonctionnalités du front (hors AppContext)

| Fonctionnalité du front | Endpoint(s) back | Fonctionnement |
|---|---|---|
| Page de connexion, renouvellement de session, déconnexion (LoginPage, AuthContext, api/client.ts) | `POST /api/auth/login`<br>`POST /api/auth/refresh`<br>`POST /api/auth/logout` | ✅ appelé par le front |
| Changement de mot de passe imposé (ChangePasswordPage) | `POST /api/auth/change-password` | ✅ appelé par le front |
| Code de confirmation (PinConfirmModal, demande automatique) | `POST /api/auth/verify-code` | ✅ appelé par le front |
| Fonctionnalités par rôle (UtilisateursView) | `GET /api/roles` | ✅ appelé par le front |
| Profil d’un acteur et ses droits (UtilisateurProfilModal) | `GET /api/utilisateurs/{id}` | ✅ appelé par le front |
| Purge du journal d’audit (JournalView) | `DELETE /api/journal` | ✅ appelé par le front |
| Journalisation des impressions et exports du navigateur (PrintTracker, exportUtils, pdf*) | `POST /api/journal/evenements` | ✅ appelé par le front |
| Tableau de bord (DashboardView) : compteurs, cotisations, dossiers — calculés par le serveur | `GET /api/dashboard` | ✅ appelé par le front |
| Alertes en temps réel — calculées par le serveur | `GET /api/alertes` | ✅ appelé par le front |
| États mensuels / clôture (EtatsMensuelsView, RapportsView) : totaux, ventilations, état nominatif | `GET /api/rapports/etat-mensuel` | ✅ appelé par le front |
| Rapprochement bancaire, réserve CNPS, flux de trésorerie (RapportsView, DepensesView) | `GET /api/rapports/rapprochement` | ✅ appelé par le front |
| Synthèse financière : totaux, soldes, ventilations (écran Finances) | `GET /api/finances/synthese` | ✅ appelé par le front |
| Contrôle d’intégrité des données financières (bilan Finances) | `GET /api/finances/controle` | ✅ appelé par le front |
| Échange de données Excel : catalogue, export, modèle, import (ExcelEchangeModal) | `GET /api/excel/catalogue`<br>`POST /api/excel/export`<br>`GET /api/excel/modele`<br>`POST /api/excel/import` | ✅ appelé par le front |
| Relevé d’un adhérent (reçus, fiche détaillée) | `GET /api/rapports/releve/{id}` | 🖥️ calcul dans le navigateur sur les données MySQL (équivalent serveur disponible) |
| Statistiques de cotisation de chaque adhérent (jointes à la liste : stats=true) | `GET /api/adherents` | ✅ appelé par le front |
| Statistiques d’un seul adhérent (équivalent disponible pour d’autres clients) | `GET /api/adherents/{id}/stats` | 🖥️ calcul dans le navigateur sur les données MySQL (équivalent serveur disponible) |
| Catalogue CNPS : branches, offres, pièces (cnpsBranches.ts, copie locale de présentation) | `GET /api/dossiers/catalogue` | 🖥️ calcul dans le navigateur sur les données MySQL (équivalent serveur disponible) |
| Suivi des versements : cotisations en attente et point d’arrêt | `GET /api/versements/suivi/en-attente` | ✅ appelé par le front |
| Paie : récapitulatif, déclarations CNPS / fiscale, paie CNPS des adhérents | `GET /api/paie/recap`<br>`GET /api/paie/adherents-cnps` | ✅ appelé par le front |
| Paie : aperçu en direct d’un bulletin et d’une assiette cotisable, tranche légale | `POST /api/paie/bulletins/{id}/apercu`<br>`POST /api/paie/adherents/{id}/apercu`<br>`GET /api/paie/tranche` | ✅ appelé par le front |
| Aperçu de bulletin pour un salarié (formulaire d’origine, équivalent disponible) | `POST /api/paie/apercu` | 🖥️ calcul dans le navigateur sur les données MySQL (équivalent serveur disponible) |
| Droits de l’utilisateur connecté (session de connexion) | `GET /api/roles/me`<br>`GET /api/auth/me` | 🖥️ calcul dans le navigateur sur les données MySQL (équivalent serveur disponible) |
| Sauvegarde JSON complète (Paramètres) | `GET /api/systeme/export` | ✅ appelé par le front |
| Mot de passe d’un acteur (le front utilise PUT /identifiants qui le couvre) | `POST /api/utilisateurs/{id}/reset-password` | 🖥️ calcul dans le navigateur sur les données MySQL (équivalent serveur disponible) |
| Validation finale Direction d’un rapport d’agent (pas encore de bouton dans le front) | `POST /api/rapports-agents/{id}/valider-direction` | 🖥️ calcul dans le navigateur sur les données MySQL (équivalent serveur disponible) |

### Restent côté navigateur (aucun endpoint nécessaire)
- Génération PDF des reçus et rapports (pdfReceiptGenerator.ts, pdfReportGenerator.ts) — rendu navigateur (jsPDF)
- Export Excel (exportUtils.ts, xlsx) — rendu navigateur ; les données viennent des endpoints de liste
- Navigation, onglet actif, recherche globale, adhérent sélectionné — état d’interface

## Endpoints back sans équivalent direct dans le front actuel
Ce sont des lectures par id ou des capacités nouvelles (le front travaillait sur des tableaux en mémoire) :
- `GET /api/systeme/health`
- `GET /api/roles/{role}`
- `GET /api/adherents/{id}`
- `GET /api/cotisations/{id}`
- `GET /api/dossiers/{id}`
- `GET /api/gestionnaires/{id}`
- `GET /api/depenses/{id}`
- `GET /api/versements/{id}`
- `GET /api/frais-mobile-money/{id}`
- `GET /api/excel/export`
- `GET /api/employes/{id}`
- `GET /api/paie/bulletins/{id}`
- `GET /api/partenaires/{id}`
- `GET /api/rendez-vous/{id}`
- `GET /api/notes-direction/{id}`
- `GET /api/rapports-reunions/{id}`
- `GET /api/rapports-agents/{id}`
- `GET /api/rapports/etats-mensuels`


## Comment le front est relié au back

1. `src/api/client.ts` : jeton d'accès en mémoire, renouvellement automatique sur 401, demande du code de confirmation quand le serveur l'exige.
2. `src/context/AuthContext.tsx` + `components/auth/*` : connexion, changement de mot de passe imposé, déconnexion.
3. `src/context/AppContext.tsx` : chaque liste est chargée par `GET` ; chaque action est un appel `POST / PUT / PATCH / DELETE` **asynchrone** suivi du rechargement des listes concernées et du journal.
4. Les droits affichés (menus, boutons) viennent de la session renvoyée par le serveur (`permissions`, `modules`) ; le serveur reste seul juge à chaque appel.
