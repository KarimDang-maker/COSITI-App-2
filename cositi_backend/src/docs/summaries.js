/** Libellés Swagger : tag par segment d'URL et résumé par opération ("METHOD /api/chemin/{param}"). */
export const TAGS = {
  auth: '1. Authentification',
  roles: '2. Rôles & droits',
  utilisateurs: '3. Utilisateurs',
  parametres: '4. Paramètres',
  adherents: '5. Adhérents',
  gestionnaires: '6. Gestionnaires de portefeuille',
  cotisations: '7. Cotisations',
  dossiers: '8. Dossiers CNPS',
  alertes: '9. Alertes',
  depenses: '10. Finances — Dépenses',
  versements: '11. Finances — Versements bancaires',
  'frais-mobile-money': '12. Finances — Frais Mobile Money',
  banques: '13. Finances — Banques partenaires',
  finances: '13b. Finances — Synthèse & contrôle',
  excel: '24. Échange de données Excel',
  employes: '14. Paie — Salariés',
  paie: '15. Paie — Bulletins',
  partenaires: '16. Direction — Partenaires',
  'rendez-vous': '17. Direction — Rendez-vous',
  'notes-direction': '18. Direction — Notes',
  'rapports-reunions': '19. PV de réunion',
  'rapports-agents': '20. Rapports des agents',
  journal: "21. Journal d'audit",
  dashboard: '22. Tableau de bord & rapports',
  rapports: '22. Tableau de bord & rapports',
  systeme: '23. Système',
};

const S = {};
const add = (key, summary, extra = {}) => {
  S[key] = { summary, ...extra };
};

/** CRUD standard : liste, détail, création, modification, suppression */
function crud(base, plural, singular, { code = false } = {}) {
  add(`GET ${base}`, `Lister les ${plural}`, { description: 'Pagination `page` / `pageSize`, recherche `q`, filtres et période `du` / `au` selon la ressource.' });
  add(`GET ${base}/{id}`, `Détail d'${singular}`);
  add(`POST ${base}`, `Créer ${singular}`);
  add(`PUT ${base}/{id}`, `Modifier ${singular}`, { description: 'Mise à jour partielle : seuls les champs envoyés sont modifiés.' });
  add(`DELETE ${base}/{id}`, `Supprimer ${singular}`, code ? { note: '' } : {});
}

// --- Authentification
add('POST /api/auth/login', 'Se connecter', {
  description: 'Retourne `accessToken` (JWT, 15 min), `refreshToken` (7 jours, à usage unique), le profil, les droits et les modules autorisés. Après 5 échecs consécutifs le compte est verrouillé 15 minutes.',
  example: { email: 'dg@cositi-ci.org', password: 'Cositi@2026!' },
});
add('POST /api/auth/refresh', 'Renouveler la session', { description: 'Échange un refresh token contre un nouveau couple de jetons (rotation). Rejouer un ancien refresh token révoque toute la session.' });
add('POST /api/auth/logout', 'Se déconnecter', { description: 'Révoque la session (famille de refresh tokens).' });
add('GET /api/auth/me', 'Profil, droits et modules de l’utilisateur connecté');
add('POST /api/auth/change-password', 'Changer son mot de passe', { description: 'Ferme les autres sessions et renvoie une nouvelle session. Obligatoire quand `mustChangePassword` est vrai.' });
add('POST /api/auth/verify-code', 'Vérifier le code de confirmation', { description: 'Ne modifie rien : sert à valider le code avant une action sensible.', example: { pinCode: '0000' } });

// --- Rôles
add('GET /api/roles', 'Fiches de tous les rôles', { description: 'Description, droits, restrictions et matrice module × action de chacun des 9 profils.' });
add('GET /api/roles/me', 'Modules et actions de l’utilisateur connecté', { description: 'Sert à construire le menu et les boutons du front.' });
add('GET /api/roles/{role}', 'Fiche d’un rôle');

// --- Utilisateurs
add('GET /api/utilisateurs', 'Lister les utilisateurs', { description: 'Liste complète pour les profils d’audit (Super Administrateur, DG, DGA, DAF, PCA, Conseil de Surveillance, Administrateur) ; liste minimale (id, nom, rôle, poste) pour les autres.' });
add('POST /api/utilisateurs', 'Créer un compte (Super Administrateur)', { description: 'Tous les rôles de la plateforme sont disponibles. Mot de passe obligatoire (8+ caractères, majuscule, minuscule, chiffre). Chaque acteur se connecte uniquement avec ses propres identifiants.', example: { nom: 'MBALLA Jeanne', email: 'j.mballa@cositi-ci.org', role: "Caissière & Agent d'enregistrement", poste: 'Caissière', password: 'Caisse@2026!', mustChangePassword: true } });
add('GET /api/utilisateurs/{id}', 'Profil d’un acteur', { description: 'Profil, droits et modules. Profils d’audit, ou soi-même.' });
add('PUT /api/utilisateurs/{id}', 'Modifier un compte', { description: 'Super Administrateur : tout compte (rôle, poste, statut, e-mail). Les autres acteurs : uniquement leur propre nom et téléphone. Un changement de rôle, de statut ou d’e-mail ferme les sessions du compte.' });
add('PUT /api/utilisateurs/{id}/identifiants', 'Modifier les informations de connexion d’un acteur', { description: 'Réservé au Super Administrateur : e-mail de connexion, mot de passe, obligation de changement, déverrouillage. Ferme les sessions du compte et est journalisé.', example: { password: 'Nouveau@Pass2026', mustChangePassword: true, deverrouiller: true } });
add('GET /api/utilisateurs/{id}/activite', 'Actions menées par un acteur', { description: 'Historique paginé (filtres `du`, `au`, `typeOperation`) et statistiques (`meta.statistiques`). Profils d’audit, ou soi-même.' });
add('GET /api/utilisateurs/{id}/rapport-audit', 'Rapport d’audit d’un acteur', { description: 'Données du rapport imprimable (profil, droits, statistiques, 500 dernières actions de la période). La génération est journalisée.' });
add('DELETE /api/utilisateurs/{id}', 'Supprimer un compte', { description: 'Impossible pour son propre compte ou pour le dernier gestionnaire de comptes actif.' });
add('PUT /api/utilisateurs/bulk', 'Paramétrage groupé des comptes', { description: 'Met à jour ou crée plusieurs comptes (postes, rôles, accès). Ne supprime jamais.' });
add('POST /api/utilisateurs/{id}/reset-password', 'Réinitialiser le mot de passe d’un compte', { description: 'Super Administrateur uniquement. Lève le verrouillage et ferme les sessions du compte.' });

// --- Paramètres
add('GET /api/parametres', 'Lire les paramètres généraux', { description: 'Le code de confirmation n’est jamais renvoyé (stocké haché).' });
add('PUT /api/parametres', 'Modifier les paramètres généraux', { description: 'Changer le code de confirmation exige l’ancien (`ancienCodeConfirmation`).' });

// --- Adhérents
add('GET /api/adherents', 'Lister les adhérents', { description: 'Filtres : `q`, `statut`, `statutImmatriculation`, `statutCotisation` (calculé), `gestionnaireId`, `sansGestionnaire`. `stats=true` ajoute les statistiques de cotisation.' });
add('POST /api/adherents', 'Enregistrer un adhérent', { description: 'Le matricule `COSITI-xxxx` est généré par le serveur. Doublons de CNI / n° CNPS refusés.', example: { nom: 'Dupont', prenom: 'Jean', telephone: '+237 600 00 00 01', profession: 'Tailleur', cni: 'CNI-0001' } });
add('GET /api/adherents/{id}', 'Fiche complète d’un adhérent', { description: 'Accepte l’id ou le matricule. Inclut statistiques, cotisations et dossiers.' });
add('PUT /api/adherents/{id}', 'Modifier un adhérent', { description: 'Le matricule ne change jamais.' });
add('DELETE /api/adherents/{id}', 'Supprimer un adhérent', { description: 'Refusé (409) si l’adhérent a des cotisations : passer son statut à « Radié ».' });
add('GET /api/adherents/{id}/stats', 'Statistiques de cotisation d’un adhérent', { description: 'Total cumulé, retard, seuil d’immatriculation, jours cotisés…' });
add('PATCH /api/adherents/{id}/statut', 'Changer le statut d’un adhérent', { example: { statut: 'Suspendu', motif: 'Impayés' } });
add('POST /api/adherents/{id}/immatriculer', 'Valider l’immatriculation CNPS', { description: 'Crée automatiquement le dossier CNPS si absent.', example: { numeroCnps: 'CNPS-2026-12345', dateImmatriculation: '2026-03-12' } });
add('POST /api/adherents/{id}/sans-enfant', 'Déclarer un travailleur sans enfant', { description: 'Lève l’alerte « dossier d’allocations » et met le dossier à « Sans enfant (Non éligible allocations) ».' });
add('PUT /api/adherents/{id}/portefeuille', 'Affecter / désaffecter un portefeuille', { example: { gestionnaireId: 'gp-001' } });
add('PUT /api/adherents/{id}/salaire-cotisable', 'Ajuster l’assiette cotisable CNPS', { description: 'Recalcule les bulletins non validés de l’adhérent.' });

// --- Cotisations
add('GET /api/cotisations', 'Lister les cotisations', { description: 'Filtres : `adherentId`, `matricule`, `modePaiement`, `mois`, `annee`, `du`, `au`, `regularisation`, `q`. `meta.totalMontant` = somme des résultats filtrés.' });
add('POST /api/cotisations', 'Encaisser une cotisation', { description: 'Mois / année déduits de la date si absents ; référence générée si absente (unique). Franchir le seuil d’immatriculation passe l’adhérent à « Éligible ».', example: { adherentId: 'adh-1', datePaiement: '2026-03-10', montant: 5000, modePaiement: 'Wave', reference: 'WAVE-0001' } });
add('GET /api/cotisations/{id}', 'Détail d’une cotisation');
add('PUT /api/cotisations/{id}', 'Modifier une cotisation');
add('DELETE /api/cotisations/{id}', 'Supprimer une cotisation');
add('POST /api/cotisations/regulariser', 'Régulariser rétroactivement une cotisation', { description: 'Avec `cotisationId` : rectifie/complète une cotisation ; sans : crée un rattrapage d’arriérés.' });

// --- Dossiers & alertes
add('GET /api/dossiers', 'Lister les dossiers CNPS');
add('GET /api/dossiers/catalogue', 'Catalogue CNPS (branches, offres, pièces)');
add('GET /api/dossiers/{id}', 'Détail d’un dossier');
add('POST /api/dossiers', 'Créer un dossier CNPS', { description: 'Pièces à fournir déduites de l’offre choisie.' });
add('PUT /api/dossiers/{id}', 'Mettre à jour un dossier', { description: 'Statut, pièces reçues, dates… Chaque modification alimente l’historique (`noteAction` pour le libellé).' });
add('GET /api/alertes', 'Alertes en temps réel', { description: 'NON_A_JOUR, SEUIL_15000_ATTEINT, VERIFICATION_15_30, DOSSIER_ALLOCATIONS.' });

// --- Gestionnaires & finances
crud('/api/gestionnaires', 'gestionnaires de portefeuille', 'un gestionnaire');
crud('/api/depenses', 'dépenses courantes', 'une dépense');
add('POST /api/depenses', 'Enregistrer une dépense', { description: 'L’origine des fonds est déduite (cotisations CNPS = exploitation, sinon apport PCA).' });
crud('/api/versements', 'versements bancaires', 'un versement');
add('POST /api/versements', 'Enregistrer un versement bancaire', { description: 'Repère précédent, point d’arrêt et tranche de cotisations couverte sont calculés automatiquement.' });
add('GET /api/versements/suivi/en-attente', 'Cotisations en attente de versement', { description: 'Cotisations encaissées depuis le dernier point d’arrêt bancaire.' });
crud('/api/frais-mobile-money', 'frais Mobile Money', 'des frais Mobile Money');
add('POST /api/frais-mobile-money', 'Enregistrer des frais Mobile Money', { description: '`montantNet` est calculé par le serveur.' });
add('GET /api/banques', 'Lister les banques partenaires');
add('POST /api/banques', 'Ajouter une banque partenaire', { example: { nom: 'Afriland First Bank' } });
add('DELETE /api/banques/{nom}', 'Retirer une banque partenaire');
add('POST /api/banques/reset', 'Restaurer la liste par défaut des banques');

// --- Paie
crud('/api/employes', 'salariés', 'un salarié');
add('GET /api/paie/bulletins', 'Lister les bulletins de paie', { description: 'Filtres : `mois` (AAAA-MM), `employeId`, `statut`, `typeBeneficiaire`, `q`.' });
add('GET /api/paie/recap', 'Récapitulatif de la masse salariale du mois');
add('GET /api/paie/bulletins/{id}', 'Détail d’un bulletin');
add('PUT /api/paie/bulletins/{id}', 'Modifier un bulletin', { description: 'Le serveur recalcule TOUS les montants à partir des éléments saisis. Un bulletin validé est verrouillé.' });
add('DELETE /api/paie/bulletins/{id}', 'Supprimer un bulletin');
add('POST /api/paie/generer', 'Générer la paie du personnel', { description: 'Bulletins en brouillon pour tous les salariés actifs ; les bulletins validés ne sont jamais écrasés.', example: { mois: '2026-04' } });
add('POST /api/paie/generer-adherents', 'Générer la paie des adhérents immatriculés CNPS', { example: { mois: '2026-04', salaireCotisableDefaut: 60000 } });
add('POST /api/paie/valider', 'Valider la paie du mois', { description: 'Idempotent : une seule écriture de dépense « PAIE-AAAA-MM » (masse salariale nette du personnel).', example: { mois: '2026-04' } });
add('POST /api/paie/apercu', 'Aperçu d’un calcul de bulletin', { description: 'Calcule sans enregistrer (formulaires).' });

// --- Direction
crud('/api/partenaires', 'partenaires', 'un partenaire');
crud('/api/rendez-vous', 'rendez-vous', 'un rendez-vous');
crud('/api/notes-direction', 'notes de direction', 'une note');
add('GET /api/notes-direction', 'Lister les notes de direction', { description: 'Les notes « Confidentiel Direction » ne sont visibles que du DG et de la DGA.' });

// --- PV & rapports agents
crud('/api/rapports-reunions', 'PV de réunion', 'un PV de réunion');
add('PUT /api/rapports-reunions/{id}', 'Modifier un PV', { description: 'Un PV « Validé & Signé » ou « Diffusé » n’est modifiable que par le DG / la DGA (les autres peuvent seulement le passer à « Diffusé »).' });
crud('/api/rapports-agents', 'rapports des agents', 'un rapport d’agent');
add('POST /api/rapports-agents', 'Saisir un rapport d’agent', { description: '`montantTotalCollecte` est recalculé ; le statut de validation est forcé à « Enregistré par Caissière ».' });
add('POST /api/rapports-agents/{id}/valider-daf', 'Viser un rapport (contrôle DAF)', { example: { visa: 'Vu et vérifié' } });
add('POST /api/rapports-agents/{id}/valider-direction', 'Validation finale Direction', { description: 'Réservé au DG et à la DGA, après le visa du DAF.' });

// --- Journal, pilotage, système
add('GET /api/journal', 'Consulter le journal d’audit', { description: 'Filtres : `typeOperation`, `utilisateur`, `matricule`, `entite`, `du`, `au`, `q`.' });
add('POST /api/journal/evenements', 'Tracer une action effectuée dans le navigateur', { description: 'Impression, export, consultation d’un document : les modifications sont déjà tracées par le serveur.', example: { typeOperation: 'IMPRESSION_RECU', description: 'Impression du reçu REC-001-JAN', matricule: 'COSITI-0001' } });
add('DELETE /api/journal', 'Purger le journal', { description: 'Paramètre `avant` (AAAA-MM-JJ) pour ne purger que l’ancien. La purge est elle-même tracée.' });
add('GET /api/excel/catalogue', 'Feuilles et colonnes du format d’échange', { description: 'Pour chaque donnée : en-têtes de colonnes, colonnes obligatoires, colonnes calculées, droits d’export et d’import du profil connecté.' });
add('GET /api/excel/modele', 'Télécharger le modèle vierge', { description: 'Classeur .xlsx avec les en-têtes exacts et une feuille d’instructions. `entites` = liste séparée par des virgules.' });
add('GET /api/excel/export', 'Exporter au format d’échange (.xlsx)', { description: 'Le fichier produit est réimportable tel quel. `entites`, `du`, `au` : sélection et période. Limité aux données autorisées au profil (les finances et la paie : direction financière). L’export est tracé au journal.' });
add('POST /api/excel/export', 'Exporter une sélection (liste filtrée de l’écran)', { example: { entites: ['cotisations'], ids: { cotisations: ['cot-123'] }, du: '2026-03-01', au: '2026-03-31' } });
add('POST /api/excel/import', 'Importer un classeur Excel', { description: 'Corps = fichier .xlsx brut (`Content-Type: application/octet-stream`). `mode=simulation` (défaut) exécute tout puis annule et renvoie le rapport ; `mode=import` écrit réellement et exige le code de confirmation (`X-Confirmation-Code`). Tout ou rien : une seule ligne refusée annule l’import, sauf `ignorerErreurs=true`. Jamais de suppression ; une cellule vide laisse la valeur existante. Chaque ligne passe par les mêmes validations, règles métier et journal que la saisie manuelle.' });
add('POST /api/paie/bulletins/{id}/apercu', 'Aperçu en direct d’un bulletin (sans enregistrer)', { description: 'Le serveur recalcule tout le bulletin (barème CNPS / CGI) avec les éléments fournis ; utilisé par l’écran de saisie.', example: { primeRendement: 50000, acomptesAvances: 10000 } });
add('GET /api/paie/tranche', 'Tranche légale d’un salaire de base', { description: 'Paramètre `salaire` (FCFA) : moins de 60 000 (exonération), 60 000 (pivot) ou plus (assujetti).' });
add('GET /api/rapports/etat-mensuel', 'État mensuel complet d’une période', { description: 'Paramètres `mois` (Mars…) et `annee`. Cotisations de la période, ventilations par mode et par agent, état nominatif des adhérents, et — pour la direction financière — dépenses, versements, solde net et rapprochement bancaire.' });
add('GET /api/rapports/rapprochement', 'Rapprochement bancaire & réserve CNPS', { description: 'Solde réel en banque = fonds versés − réserve cotisations CNPS ; flux d’encaissements et de décaissements (exploitation / apport du PCA). `periode=GLOBAL|MOIS`, `mois`, `annee`, `banque`, `base=COTISATIONS_PERCUES|SEUIL`.' });
add('GET /api/paie/adherents-cnps', 'Paie CNPS des adhérents immatriculés', { description: 'Pour chaque adhérent immatriculé : le bulletin enregistré du mois, sinon la projection calculée avec le barème CNPS / CGI ; totaux de la déclaration.' });
add('POST /api/paie/adherents/{id}/apercu', 'Simuler le bulletin CNPS d’un adhérent', { description: 'Aucune écriture : le serveur calcule le bulletin pour l’assiette cotisable fournie.', example: { mois: '2026-03', montant: 85000 } });
add('GET /api/finances/synthese', 'Synthèse financière calculée par le serveur', { description: 'Totaux exacts au centime, ventilations (mode, catégorie, origine des fonds, banque, opérateur), réserve CNPS, solde réel en banque, taux de couverture, suivi des versements. `du` / `au` ajoutent un bloc `periode` ; `detail=reserves` ajoute la réserve par adhérent.' });
add('GET /api/finances/controle', 'Contrôle d’intégrité des données financières', { description: 'Lecture seule : cotisations orphelines ou en doublon, frais incohérents, versements, écriture de paie ≠ bulletins, bulletins dont le recalcul diffère, rapports d’agents.' });
add('GET /api/dashboard', 'Indicateurs du tableau de bord', { description: 'Le volet `finances` n’est renvoyé qu’aux profils autorisés.' });
add('GET /api/rapports/etats-mensuels', 'État mensuel de clôture', { description: 'Paramètre `mois` = AAAA-MM. Le volet financier est réservé à la direction financière.' });
add('GET /api/rapports/releve/{id}', 'Relevé complet d’un adhérent', { description: 'Accepte l’id ou le matricule.' });
add('GET /api/systeme/health', 'Sonde de disponibilité');
add('GET /api/systeme/export', 'Exporter une sauvegarde JSON', { description: 'Toutes les données, sans aucun secret (mots de passe, codes, hachages).' });
add('POST /api/systeme/reset-demo', 'Réimporter la base initiale (database_mysql)', { description: 'EFFACE toutes les données actuelles et recharge le dump SQL, puis recrée les identifiants de connexion. Désactivé en production par défaut (`ALLOW_DEMO_RESET`).' });
add('POST /api/systeme/mise-a-jour', 'Mise à jour logicielle (effacement des données d’exploitation)', { description: 'Efface adhérents, cotisations, dossiers, finances, direction, journal et remet la séquence des matricules à 0. Conserve comptes, paramètres, salariés, bulletins et banques.' });

export const SUMMARIES = S;
