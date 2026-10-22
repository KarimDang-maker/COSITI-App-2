# Rôles et fonctionnalités de la plateforme COSITI

> Document généré par `npm run docs:roles` à partir de la matrice appliquée par le serveur (`src/utils/roles.js`). Les tests automatiques vérifient, pour **chacun des 9 rôles** et chaque action, que le serveur refuse (`403`) ou autorise exactement ce que dit ce tableau. Même chose en direct : `GET /api/roles`, `GET /api/roles/me`, et `modules` dans la réponse de `/api/auth/login`.

## 1. Principe : des périmètres distincts, des accès partagés

| Famille | Rôles | Périmètre |
|---|---|---|
| **Administration des accès** | Super Administrateur | Crée les comptes de tous les rôles ; **seul** à modifier les informations de connexion (e-mail, mot de passe, code PIN, déverrouillage) ; audite tous les acteurs ; accès complet aux modules |
| **Direction générale** | DG, DGA, Administrateur | Tous les modules métier. Seuls DG et DGA : notes confidentielles, validation finale des rapports d'agents, correction des PV signés. Purge du journal : DG, DGA, Administrateur. Audit des acteurs |
| **Direction financière** | DAF | Tous les modules métier sauf purge du journal, validation finale Direction et notes confidentielles. Audit des acteurs |
| **Saisie / caisse** | Caissière & Agent d'enregistrement, Agent d'enregistrement | Adhérents, cotisations, immatriculation, dossiers, rapports d'agents ; ni suppression, ni finances, ni administration ; leur propre activité seulement |
| **Supervision (lecture)** | PCA, Conseil de Surveillance, Agent de consultation | Consultation. PCA et Conseil de Surveillance : audit de tous les acteurs ; le PCA peut aussi lancer la mise à jour logicielle |

**Accès partagés** : tous les rôles consultent adhérents, cotisations, dossiers, alertes, journal, PV, rapports d'agents, gestionnaires et tableau de bord. Les modules **Finances**, **Paie** et **Agenda Direction** sont réservés à la direction (Super Administrateur, DG, DGA, Administrateur, DAF). Le volet financier du tableau de bord et des états mensuels suit la même règle. **Comptes et informations de connexion : Super Administrateur uniquement.** Chaque action de chaque acteur est journalisée ; son profil montre l'historique complet et permet d'imprimer son rapport d'audit.

## 2. Matrice complète (action × rôle)

| Module | Action | Super Administrateur | PCA | DG | DGA | Conseil Surv. | DAF | Caissière | Administrateur | Agent enreg. | Agent consult. |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Tableau de bord** | Consulter les indicateurs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Voir le volet financier du tableau de bord | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
| **Adhérents** | Consulter le répertoire et les fiches | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Enregistrer un nouvel adhérent ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — |
|  | Modifier une fiche (code de confirmation) ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — |
|  | Supprimer un adhérent (code de confirmation) ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
|  | Changer le statut d'un adhérent ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
|  | Affecter à un gestionnaire de portefeuille ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — |
|  | Ajuster l'assiette cotisable CNPS ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
| **Gestionnaires de portefeuille** | Consulter les gestionnaires | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Créer / modifier / supprimer un gestionnaire ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
| **Cotisations** | Consulter le journal des cotisations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Encaisser une cotisation ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — |
|  | Modifier une cotisation (code de confirmation) ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — |
|  | Supprimer une cotisation (code de confirmation) ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
|  | Régulariser rétroactivement une cotisation ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
| **Finances & Dépenses (DAF)** | Consulter dépenses, versements, frais Mobile Money | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
|  | Enregistrer / modifier / supprimer (suppression avec code) ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
|  | Gérer les banques partenaires ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
| **Gestion de la paie (DAF)** | Consulter salariés et bulletins | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
|  | Gérer les salariés, générer, modifier et valider la paie ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
| **Rapports des agents (caisse)** | Consulter les rapports | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Saisir / modifier un rapport ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — |
|  | Supprimer un rapport ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
|  | Viser (contrôle DAF) ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
|  | Validation finale Direction (DG / DGA) ✏️ | — | — | ✅ | ✅ | — | — | — | — | — | — |
| **Immatriculations CNPS** | Consulter les adhérents éligibles | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Valider une immatriculation ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — |
| **Dossiers CNPS** | Consulter les dossiers | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Créer / mettre à jour un dossier, déclarer « sans enfant » ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — |
| **Agenda Direction (DG / DGA / DAF)** | Consulter partenaires, rendez-vous et notes | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
|  | Gérer partenaires, rendez-vous et notes ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
|  | Lire / écrire les notes « Confidentiel Direction » ✏️ | — | — | ✅ | ✅ | — | — | — | — | — | — |
| **Rapports de réunion (PV)** | Consulter les PV | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Rédiger / modifier un PV brouillon ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
|  | Corriger ou supprimer un PV signé / diffusé ✏️ | — | — | ✅ | ✅ | — | — | — | — | — | — |
| **Alertes & relances** | Consulter les alertes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **États mensuels (clôture) & relevés** | Consulter états mensuels et relevés adhérents | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Voir le volet financier des états mensuels | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
|  | Exporter (Excel / PDF / sauvegarde) | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
| **Échange de données Excel** | Exporter les données de son périmètre au format d'échange, ou télécharger le modèle vierge | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Importer un fichier Excel (simulation puis import réel avec code de confirmation) pour les données de son périmètre ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — |
| **Journal d'audit** | Consulter la piste d'audit | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Purger le journal (code de confirmation) ✏️ | ✅ | — | ✅ | ✅ | — | — | — | ✅ | — | — |
| **Utilisateurs & accès** | Consulter son profil et son activité, modifier son nom / téléphone, changer son mot de passe ✏️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Consulter le profil et les actions de tout acteur, imprimer son rapport d'audit | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — |
|  | Créer des comptes (tous rôles), modifier / désactiver / supprimer, paramétrage groupé ✏️ | ✅ | — | — | — | — | — | — | — | — | — |
|  | Modifier les informations de connexion d'un acteur (e-mail, mot de passe, code PIN, déverrouillage) ✏️ | ✅ | — | — | — | — | — | — | — | — | — |
| **Paramètres généraux** | Consulter la configuration | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Modifier seuils, coordonnées et code de confirmation ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
| **Système** | Mise à jour logicielle (efface les données d'exploitation, code de maintenance) ✏️ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | — | — |
|  | Réimporter la base initiale (database_mysql) ✏️ | ✅ | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — |

✅ autorisé · — refusé · ✏️ action qui modifie des données · Les actions marquées « (code de confirmation) » exigent en plus le code `X-Confirmation-Code`.

## 3. Qui peut faire quoi, module par module

### Tableau de bord
- Consulter les indicateurs : **tous les rôles**
- Voir le volet financier du tableau de bord : Super Administrateur, DG, DGA, DAF, Administrateur

### Adhérents
- Consulter le répertoire et les fiches : **tous les rôles**
- Enregistrer un nouvel adhérent ✏️ : Super Administrateur, DG, DGA, DAF, Caissière, Administrateur, Agent enreg.
- Modifier une fiche (code de confirmation) ✏️ : Super Administrateur, DG, DGA, DAF, Caissière, Administrateur, Agent enreg.
- Supprimer un adhérent (code de confirmation) ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur
- Changer le statut d'un adhérent ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur
- Affecter à un gestionnaire de portefeuille ✏️ : Super Administrateur, DG, DGA, DAF, Caissière, Administrateur, Agent enreg.
- Ajuster l'assiette cotisable CNPS ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur

### Gestionnaires de portefeuille
- Consulter les gestionnaires : **tous les rôles**
- Créer / modifier / supprimer un gestionnaire ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur

### Cotisations
- Consulter le journal des cotisations : **tous les rôles**
- Encaisser une cotisation ✏️ : Super Administrateur, DG, DGA, DAF, Caissière, Administrateur, Agent enreg.
- Modifier une cotisation (code de confirmation) ✏️ : Super Administrateur, DG, DGA, DAF, Caissière, Administrateur, Agent enreg.
- Supprimer une cotisation (code de confirmation) ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur
- Régulariser rétroactivement une cotisation ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur

### Finances & Dépenses (DAF)
- Consulter dépenses, versements, frais Mobile Money : Super Administrateur, DG, DGA, DAF, Administrateur
- Enregistrer / modifier / supprimer (suppression avec code) ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur
- Gérer les banques partenaires ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur

### Gestion de la paie (DAF)
- Consulter salariés et bulletins : Super Administrateur, DG, DGA, DAF, Administrateur
- Gérer les salariés, générer, modifier et valider la paie ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur

### Rapports des agents (caisse)
- Consulter les rapports : **tous les rôles**
- Saisir / modifier un rapport ✏️ : Super Administrateur, DG, DGA, DAF, Caissière, Administrateur, Agent enreg.
- Supprimer un rapport ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur
- Viser (contrôle DAF) ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur
- Validation finale Direction (DG / DGA) ✏️ : DG, DGA

### Immatriculations CNPS
- Consulter les adhérents éligibles : **tous les rôles**
- Valider une immatriculation ✏️ : Super Administrateur, DG, DGA, DAF, Caissière, Administrateur, Agent enreg.

### Dossiers CNPS
- Consulter les dossiers : **tous les rôles**
- Créer / mettre à jour un dossier, déclarer « sans enfant » ✏️ : Super Administrateur, DG, DGA, DAF, Caissière, Administrateur, Agent enreg.

### Agenda Direction (DG / DGA / DAF)
- Consulter partenaires, rendez-vous et notes : Super Administrateur, DG, DGA, DAF, Administrateur
- Gérer partenaires, rendez-vous et notes ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur
- Lire / écrire les notes « Confidentiel Direction » ✏️ : DG, DGA

### Rapports de réunion (PV)
- Consulter les PV : **tous les rôles**
- Rédiger / modifier un PV brouillon ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur
- Corriger ou supprimer un PV signé / diffusé ✏️ : DG, DGA

### Alertes & relances
- Consulter les alertes : **tous les rôles**

### États mensuels (clôture) & relevés
- Consulter états mensuels et relevés adhérents : **tous les rôles**
- Voir le volet financier des états mensuels : Super Administrateur, DG, DGA, DAF, Administrateur
- Exporter (Excel / PDF / sauvegarde) : Super Administrateur, DG, DGA, DAF, Administrateur

### Échange de données Excel
- Exporter les données de son périmètre au format d'échange, ou télécharger le modèle vierge : **tous les rôles**
- Importer un fichier Excel (simulation puis import réel avec code de confirmation) pour les données de son périmètre ✏️ : Super Administrateur, DG, DGA, DAF, Caissière, Administrateur, Agent enreg.

### Journal d'audit
- Consulter la piste d'audit : **tous les rôles**
- Purger le journal (code de confirmation) ✏️ : Super Administrateur, DG, DGA, Administrateur

### Utilisateurs & accès
- Consulter son profil et son activité, modifier son nom / téléphone, changer son mot de passe ✏️ : **tous les rôles**
- Consulter le profil et les actions de tout acteur, imprimer son rapport d'audit : Super Administrateur, PCA, DG, DGA, Conseil Surv., DAF, Administrateur
- Créer des comptes (tous rôles), modifier / désactiver / supprimer, paramétrage groupé ✏️ : Super Administrateur
- Modifier les informations de connexion d'un acteur (e-mail, mot de passe, code PIN, déverrouillage) ✏️ : Super Administrateur

### Paramètres généraux
- Consulter la configuration : **tous les rôles**
- Modifier seuils, coordonnées et code de confirmation ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur

### Système
- Mise à jour logicielle (efface les données d'exploitation, code de maintenance) ✏️ : Super Administrateur, PCA, DG, DGA, DAF, Administrateur
- Réimporter la base initiale (database_mysql) ✏️ : Super Administrateur, DG, DGA, DAF, Administrateur

## 4. Fiche par rôle

### Super Administrateur
*Super Administrateur de la plateforme* — accès « Super administration »

Administration des comptes et des accès : crée les comptes de tous les rôles, gère seul les informations de connexion des acteurs et audite leurs actions. Accès complet à tous les modules.

**Droits clés**
- Création de comptes pour chacun des rôles de la plateforme (y compris un autre Super Administrateur)
- SEUL habilité à modifier les informations de connexion d'un acteur : e-mail, mot de passe, code PIN, déverrouillage
- Activation / désactivation / suppression de comptes, changement de rôle
- Consultation de l'activité de chaque acteur et impression de son rapport d'audit
- Accès complet à tous les modules métier

**Restrictions**
- Ne peut ni se supprimer ni se désactiver ; au moins un Super Administrateur actif doit subsister
- Toutes ses actions sont journalisées

| Module | Niveau |
|---|---|
| Tableau de bord | 👁️ lecture |
| Adhérents | ✏️ écriture |
| Gestionnaires de portefeuille | ✏️ écriture |
| Cotisations | ✏️ écriture |
| Finances & Dépenses (DAF) | ✏️ écriture |
| Gestion de la paie (DAF) | ✏️ écriture |
| Rapports des agents (caisse) | ✏️ écriture |
| Immatriculations CNPS | ✏️ écriture |
| Dossiers CNPS | ✏️ écriture |
| Agenda Direction (DG / DGA / DAF) | ✏️ écriture |
| Rapports de réunion (PV) | ✏️ écriture |
| Alertes & relances | 👁️ lecture |
| États mensuels (clôture) & relevés | 👁️ lecture |
| Échange de données Excel | ✏️ écriture |
| Journal d'audit | ✏️ écriture |
| Utilisateurs & accès | ✏️ écriture |
| Paramètres généraux | ✏️ écriture |
| Système | ✏️ écriture |

### PCA
*Président du Conseil d'Administration* — accès « Consultation »

Supervision stratégique, consultation des états, audit des actions des acteurs, habilité à la mise à jour du logiciel.

**Droits clés**
- Consultation intégrale du tableau de bord, des répertoires, des alertes et du journal d'audit
- Téléchargement des rapports et exports
- Audit : profil, actions et rapport d'audit de chaque acteur
- Mise à jour logicielle avec le code de maintenance

**Restrictions**
- Aucun droit d'enregistrement ni de modification
- Pas d'accès aux modules Finances, Paie et Agenda Direction
- Aucune modification des paramètres

| Module | Niveau |
|---|---|
| Tableau de bord | 👁️ lecture |
| Adhérents | 👁️ lecture |
| Gestionnaires de portefeuille | 👁️ lecture |
| Cotisations | 👁️ lecture |
| Finances & Dépenses (DAF) | ⛔ aucun |
| Gestion de la paie (DAF) | ⛔ aucun |
| Rapports des agents (caisse) | 👁️ lecture |
| Immatriculations CNPS | 👁️ lecture |
| Dossiers CNPS | 👁️ lecture |
| Agenda Direction (DG / DGA / DAF) | ⛔ aucun |
| Rapports de réunion (PV) | 👁️ lecture |
| Alertes & relances | 👁️ lecture |
| États mensuels (clôture) & relevés | 👁️ lecture |
| Échange de données Excel | 👁️ lecture |
| Journal d'audit | 👁️ lecture |
| Utilisateurs & accès | ✏️ écriture |
| Paramètres généraux | 👁️ lecture |
| Système | ✏️ écriture |

### DG
*Directeur Général* — accès « Administrateur et consultation »

Administration générale, gouvernance exécutive, validation des immatriculations CNPS, audit des acteurs.

**Droits clés**
- Administration et supervision de toute la plateforme
- Agenda de direction, partenaires, rendez-vous et notes (y compris les notes « Confidentiel Direction »)
- Audit : profil, actions et rapport d'audit de chaque acteur (les comptes sont gérés par le Super Administrateur)
- Purge du journal d'audit, régularisation des cotisations, modification du statut des adhérents
- Validation finale des rapports d'agents, modification des PV signés

**Restrictions**
- Traçabilité obligatoire de toute action administrative dans le journal

| Module | Niveau |
|---|---|
| Tableau de bord | 👁️ lecture |
| Adhérents | ✏️ écriture |
| Gestionnaires de portefeuille | ✏️ écriture |
| Cotisations | ✏️ écriture |
| Finances & Dépenses (DAF) | ✏️ écriture |
| Gestion de la paie (DAF) | ✏️ écriture |
| Rapports des agents (caisse) | ✏️ écriture |
| Immatriculations CNPS | ✏️ écriture |
| Dossiers CNPS | ✏️ écriture |
| Agenda Direction (DG / DGA / DAF) | ✏️ écriture |
| Rapports de réunion (PV) | ✏️ écriture |
| Alertes & relances | 👁️ lecture |
| États mensuels (clôture) & relevés | 👁️ lecture |
| Échange de données Excel | ✏️ écriture |
| Journal d'audit | ✏️ écriture |
| Utilisateurs & accès | ✏️ écriture |
| Paramètres généraux | ✏️ écriture |
| Système | ✏️ écriture |

### DGA
*Directrice Générale Adjointe* — accès « Administrateur et consultation »

Mêmes prérogatives que le DG : coordination opérationnelle, administration et consultation globale.

**Droits clés**
- Mêmes droits que le DG

**Restrictions**
- Traçabilité obligatoire de toute action administrative dans le journal

| Module | Niveau |
|---|---|
| Tableau de bord | 👁️ lecture |
| Adhérents | ✏️ écriture |
| Gestionnaires de portefeuille | ✏️ écriture |
| Cotisations | ✏️ écriture |
| Finances & Dépenses (DAF) | ✏️ écriture |
| Gestion de la paie (DAF) | ✏️ écriture |
| Rapports des agents (caisse) | ✏️ écriture |
| Immatriculations CNPS | ✏️ écriture |
| Dossiers CNPS | ✏️ écriture |
| Agenda Direction (DG / DGA / DAF) | ✏️ écriture |
| Rapports de réunion (PV) | ✏️ écriture |
| Alertes & relances | 👁️ lecture |
| États mensuels (clôture) & relevés | 👁️ lecture |
| Échange de données Excel | ✏️ écriture |
| Journal d'audit | ✏️ écriture |
| Utilisateurs & accès | ✏️ écriture |
| Paramètres généraux | ✏️ écriture |
| Système | ✏️ écriture |

### Conseil de Surveillance
*Conseil de Surveillance & Contrôle de Gestion* — accès « Consultation »

Organe de contrôle : consultation étendue pour audit, conformité et inspection des opérations.

**Droits clés**
- Inspection de tous les encaissements
- Consultation du journal d'audit complet et de l'activité de chaque acteur (rapport d'audit)
- Contrôle des immatriculations et des dossiers
- Export des états de synthèse

**Restrictions**
- Aucune saisie ni modification
- Pas d'accès aux modules Finances, Paie et Agenda Direction
- Ne peut pas réinitialiser les mots de passe

| Module | Niveau |
|---|---|
| Tableau de bord | 👁️ lecture |
| Adhérents | 👁️ lecture |
| Gestionnaires de portefeuille | 👁️ lecture |
| Cotisations | 👁️ lecture |
| Finances & Dépenses (DAF) | ⛔ aucun |
| Gestion de la paie (DAF) | ⛔ aucun |
| Rapports des agents (caisse) | 👁️ lecture |
| Immatriculations CNPS | 👁️ lecture |
| Dossiers CNPS | 👁️ lecture |
| Agenda Direction (DG / DGA / DAF) | ⛔ aucun |
| Rapports de réunion (PV) | 👁️ lecture |
| Alertes & relances | 👁️ lecture |
| États mensuels (clôture) & relevés | 👁️ lecture |
| Échange de données Excel | 👁️ lecture |
| Journal d'audit | 👁️ lecture |
| Utilisateurs & accès | ✏️ écriture |
| Paramètres généraux | 👁️ lecture |
| Système | ⛔ aucun |

### DAF
*Directeur Administratif et Financier* — accès « Administrateur, enregistrement et consultation »

Pilotage financier, paramètres généraux, encaissements directs, paie, mise à jour du logiciel.

**Droits clés**
- Dépenses, versements bancaires, frais Mobile Money, banques partenaires
- Paie du personnel et déclarations CNPS des adhérents
- Paramètres généraux et audit de l'activité des acteurs
- Régularisation des cotisations, statut des adhérents, visa des rapports d'agents
- Enregistrement direct des cotisations et adhésions

**Restrictions**
- Purge du journal d'audit réservée à la Direction Générale
- Validation finale des rapports d'agents réservée au DG/DGA
- Notes « Confidentiel Direction » invisibles

| Module | Niveau |
|---|---|
| Tableau de bord | 👁️ lecture |
| Adhérents | ✏️ écriture |
| Gestionnaires de portefeuille | ✏️ écriture |
| Cotisations | ✏️ écriture |
| Finances & Dépenses (DAF) | ✏️ écriture |
| Gestion de la paie (DAF) | ✏️ écriture |
| Rapports des agents (caisse) | ✏️ écriture |
| Immatriculations CNPS | ✏️ écriture |
| Dossiers CNPS | ✏️ écriture |
| Agenda Direction (DG / DGA / DAF) | ✏️ écriture |
| Rapports de réunion (PV) | ✏️ écriture |
| Alertes & relances | 👁️ lecture |
| États mensuels (clôture) & relevés | 👁️ lecture |
| Échange de données Excel | ✏️ écriture |
| Journal d'audit | 👁️ lecture |
| Utilisateurs & accès | ✏️ écriture |
| Paramètres généraux | ✏️ écriture |
| Système | ✏️ écriture |

### Caissière & Agent d'enregistrement
*Caisse centrale & Saisie des adhésions* — accès « Enregistrement »

Saisie opérationnelle quotidienne : adhésions, encaissements, reçus, pointage des pièces de dossiers, rapports d'agents.

**Droits clés**
- Enregistrement des nouveaux adhérents
- Encaissement des cotisations (tous modes)
- Modification d'adhérents/cotisations avec code de confirmation
- Immatriculation, dossiers CNPS, saisie des rapports d'agents

**Restrictions**
- Aucune suppression
- Pas d'accès aux Finances, Paie, Agenda, paramètres ni gestion des comptes
- Ne peut pas régulariser ni changer le statut d'un adhérent

| Module | Niveau |
|---|---|
| Tableau de bord | 👁️ lecture |
| Adhérents | ✏️ écriture |
| Gestionnaires de portefeuille | 👁️ lecture |
| Cotisations | ✏️ écriture |
| Finances & Dépenses (DAF) | ⛔ aucun |
| Gestion de la paie (DAF) | ⛔ aucun |
| Rapports des agents (caisse) | ✏️ écriture |
| Immatriculations CNPS | ✏️ écriture |
| Dossiers CNPS | ✏️ écriture |
| Agenda Direction (DG / DGA / DAF) | ⛔ aucun |
| Rapports de réunion (PV) | 👁️ lecture |
| Alertes & relances | 👁️ lecture |
| États mensuels (clôture) & relevés | 👁️ lecture |
| Échange de données Excel | ✏️ écriture |
| Journal d'audit | 👁️ lecture |
| Utilisateurs & accès | ✏️ écriture |
| Paramètres généraux | 👁️ lecture |
| Système | ⛔ aucun |

### Administrateur
*Administrateur système* — accès « Administrateur et consultation »

Même périmètre que la Direction Générale (accès « Administrateur et consultation »).

**Droits clés**
- Mêmes droits que le DG

| Module | Niveau |
|---|---|
| Tableau de bord | 👁️ lecture |
| Adhérents | ✏️ écriture |
| Gestionnaires de portefeuille | ✏️ écriture |
| Cotisations | ✏️ écriture |
| Finances & Dépenses (DAF) | ✏️ écriture |
| Gestion de la paie (DAF) | ✏️ écriture |
| Rapports des agents (caisse) | ✏️ écriture |
| Immatriculations CNPS | ✏️ écriture |
| Dossiers CNPS | ✏️ écriture |
| Agenda Direction (DG / DGA / DAF) | ✏️ écriture |
| Rapports de réunion (PV) | ✏️ écriture |
| Alertes & relances | 👁️ lecture |
| États mensuels (clôture) & relevés | 👁️ lecture |
| Échange de données Excel | ✏️ écriture |
| Journal d'audit | ✏️ écriture |
| Utilisateurs & accès | ✏️ écriture |
| Paramètres généraux | ✏️ écriture |
| Système | ✏️ écriture |

### Agent d'enregistrement
*Agent d'enregistrement* — accès « Enregistrement »

Même périmètre que la caissière : saisie des adhésions et des encaissements.

**Droits clés**
- Mêmes droits que la caissière

**Restrictions**
- Aucune suppression
- Pas d'accès aux Finances, Paie, Agenda, paramètres ni gestion des comptes

| Module | Niveau |
|---|---|
| Tableau de bord | 👁️ lecture |
| Adhérents | ✏️ écriture |
| Gestionnaires de portefeuille | 👁️ lecture |
| Cotisations | ✏️ écriture |
| Finances & Dépenses (DAF) | ⛔ aucun |
| Gestion de la paie (DAF) | ⛔ aucun |
| Rapports des agents (caisse) | ✏️ écriture |
| Immatriculations CNPS | ✏️ écriture |
| Dossiers CNPS | ✏️ écriture |
| Agenda Direction (DG / DGA / DAF) | ⛔ aucun |
| Rapports de réunion (PV) | 👁️ lecture |
| Alertes & relances | 👁️ lecture |
| États mensuels (clôture) & relevés | 👁️ lecture |
| Échange de données Excel | ✏️ écriture |
| Journal d'audit | 👁️ lecture |
| Utilisateurs & accès | ✏️ écriture |
| Paramètres généraux | 👁️ lecture |
| Système | ⛔ aucun |

### Agent de consultation
*Agent de consultation* — accès « Consultation »

Lecture seule des répertoires, alertes et états.

**Droits clés**
- Consultation des répertoires, alertes, états et journal

**Restrictions**
- Aucune écriture
- Pas d'accès aux Finances, Paie et Agenda Direction

| Module | Niveau |
|---|---|
| Tableau de bord | 👁️ lecture |
| Adhérents | 👁️ lecture |
| Gestionnaires de portefeuille | 👁️ lecture |
| Cotisations | 👁️ lecture |
| Finances & Dépenses (DAF) | ⛔ aucun |
| Gestion de la paie (DAF) | ⛔ aucun |
| Rapports des agents (caisse) | 👁️ lecture |
| Immatriculations CNPS | 👁️ lecture |
| Dossiers CNPS | 👁️ lecture |
| Agenda Direction (DG / DGA / DAF) | ⛔ aucun |
| Rapports de réunion (PV) | 👁️ lecture |
| Alertes & relances | 👁️ lecture |
| États mensuels (clôture) & relevés | 👁️ lecture |
| Échange de données Excel | 👁️ lecture |
| Journal d'audit | 👁️ lecture |
| Utilisateurs & accès | ✏️ écriture |
| Paramètres généraux | 👁️ lecture |
| Système | ⛔ aucun |

## 5. Autres règles qui dépendent de la donnée (pas seulement du rôle)

- **Notes de direction « Confidentiel Direction »** : invisibles (et 404) pour tout autre que DG et DGA, y compris le DAF.
- **PV de réunion** « Validé & Signé » / « Diffusé » : seuls DG et DGA peuvent les corriger ou les supprimer ; les autres peuvent seulement les passer à « Diffusé ».
- **Rapports d'agents** : statut forcé à « Enregistré par Caissière » à la saisie ; « Vérifié DAF » via le visa du DAF ; « Validé Direction » via DG/DGA après le visa. Un rapport visé n'est plus modifiable par la caissière.
- **Comptes utilisateurs** : un utilisateur sans droit de gestion ne peut modifier que son nom et son téléphone (pas d'auto-promotion) ; impossible de supprimer/désactiver son propre compte ou le dernier gestionnaire de comptes actif.
- **Bulletins de paie validés** : verrouillés pour tous (repasser en brouillon pour modifier).
- **Adhérent ayant des cotisations** : non supprimable (statut « Radié » à la place).
- **Surcharge par compte** : un compte peut recevoir un `typeAcces` différent du défaut de son rôle ; les droits suivent alors ce `typeAcces` (`GET /api/auth/me` donne les droits effectifs de la personne connectée).
