import { ROLES, getUserPermissions } from './permissions.js';

/**
 * Description des profils (reprend ROLES_CONFIG de src/utils/permissions.ts, complétée pour les 9 rôles).
 */
export const ROLES_DESCRIPTION = {
  'Super Administrateur': {
    titreOfficiel: 'Super Administrateur de la plateforme',
    description: "Administration des comptes et des accès : crée les comptes de tous les rôles, gère seul les informations de connexion des acteurs et audite leurs actions. Accès complet à tous les modules.",
    droitsCles: [
      'Création de comptes pour chacun des rôles de la plateforme (y compris un autre Super Administrateur)',
      "SEUL habilité à modifier les informations de connexion d'un acteur : e-mail, mot de passe, code PIN, déverrouillage",
      'Activation / désactivation / suppression de comptes, changement de rôle',
      "Consultation de l'activité de chaque acteur et impression de son rapport d'audit",
      'Accès complet à tous les modules métier',
    ],
    restrictions: ['Ne peut ni se supprimer ni se désactiver ; au moins un Super Administrateur actif doit subsister', 'Toutes ses actions sont journalisées'],
  },
  PCA: {
    titreOfficiel: "Président du Conseil d'Administration",
    description: "Supervision stratégique, consultation des états, audit des actions des acteurs, habilité à la mise à jour du logiciel.",
    droitsCles: [
      'Consultation intégrale du tableau de bord, des répertoires, des alertes et du journal d\'audit',
      'Téléchargement des rapports et exports',
      "Audit : profil, actions et rapport d'audit de chaque acteur",
      'Mise à jour logicielle avec le code de maintenance',
    ],
    restrictions: ["Aucun droit d'enregistrement ni de modification", 'Pas d\'accès aux modules Finances, Paie et Agenda Direction', 'Aucune modification des paramètres'],
  },
  DG: {
    titreOfficiel: 'Directeur Général',
    description: "Administration générale, gouvernance exécutive, validation des immatriculations CNPS, audit des acteurs.",
    droitsCles: [
      'Administration et supervision de toute la plateforme',
      "Agenda de direction, partenaires, rendez-vous et notes (y compris les notes « Confidentiel Direction »)",
      "Audit : profil, actions et rapport d'audit de chaque acteur (les comptes sont gérés par le Super Administrateur)",
      "Purge du journal d'audit, régularisation des cotisations, modification du statut des adhérents",
      'Validation finale des rapports d\'agents, modification des PV signés',
    ],
    restrictions: ['Traçabilité obligatoire de toute action administrative dans le journal'],
  },
  DGA: {
    titreOfficiel: 'Directrice Générale Adjointe',
    description: "Mêmes prérogatives que le DG : coordination opérationnelle, administration et consultation globale.",
    droitsCles: ['Mêmes droits que le DG'],
    restrictions: ['Traçabilité obligatoire de toute action administrative dans le journal'],
  },
  'Conseil de Surveillance': {
    titreOfficiel: 'Conseil de Surveillance & Contrôle de Gestion',
    description: "Organe de contrôle : consultation étendue pour audit, conformité et inspection des opérations.",
    droitsCles: ['Inspection de tous les encaissements', "Consultation du journal d'audit complet et de l'activité de chaque acteur (rapport d'audit)", 'Contrôle des immatriculations et des dossiers', 'Export des états de synthèse'],
    restrictions: ['Aucune saisie ni modification', 'Pas d\'accès aux modules Finances, Paie et Agenda Direction', 'Ne peut pas réinitialiser les mots de passe'],
  },
  DAF: {
    titreOfficiel: 'Directeur Administratif et Financier',
    description: "Pilotage financier, paramètres généraux, encaissements directs, paie, mise à jour du logiciel.",
    droitsCles: [
      'Dépenses, versements bancaires, frais Mobile Money, banques partenaires',
      'Paie du personnel et déclarations CNPS des adhérents',
      "Paramètres généraux et audit de l'activité des acteurs",
      'Régularisation des cotisations, statut des adhérents, visa des rapports d\'agents',
      'Enregistrement direct des cotisations et adhésions',
    ],
    restrictions: ["Purge du journal d'audit réservée à la Direction Générale", 'Validation finale des rapports d\'agents réservée au DG/DGA', 'Notes « Confidentiel Direction » invisibles'],
  },
  "Caissière & Agent d'enregistrement": {
    titreOfficiel: 'Caisse centrale & Saisie des adhésions',
    description: "Saisie opérationnelle quotidienne : adhésions, encaissements, reçus, pointage des pièces de dossiers, rapports d'agents.",
    droitsCles: ['Enregistrement des nouveaux adhérents', 'Encaissement des cotisations (tous modes)', 'Modification d\'adhérents/cotisations avec code de confirmation', 'Immatriculation, dossiers CNPS, saisie des rapports d\'agents'],
    restrictions: ['Aucune suppression', 'Pas d\'accès aux Finances, Paie, Agenda, paramètres ni gestion des comptes', 'Ne peut pas régulariser ni changer le statut d\'un adhérent'],
  },
  Administrateur: {
    titreOfficiel: 'Administrateur système',
    description: "Même périmètre que la Direction Générale (accès « Administrateur et consultation »).",
    droitsCles: ['Mêmes droits que le DG'],
    restrictions: [],
  },
  "Agent d'enregistrement": {
    titreOfficiel: "Agent d'enregistrement",
    description: "Même périmètre que la caissière : saisie des adhésions et des encaissements.",
    droitsCles: ['Mêmes droits que la caissière'],
    restrictions: ['Aucune suppression', 'Pas d\'accès aux Finances, Paie, Agenda, paramètres ni gestion des comptes'],
  },
  'Agent de consultation': {
    titreOfficiel: 'Agent de consultation',
    description: "Lecture seule des répertoires, alertes et états.",
    droitsCles: ['Consultation des répertoires, alertes, états et journal'],
    restrictions: ['Aucune écriture', 'Pas d\'accès aux Finances, Paie et Agenda Direction'],
  },
};

const DIRECTEUR = (user) => ['DG', 'DGA', 'Administrateur'].includes(user.role);
const DG_DGA = (user) => ['DG', 'DGA'].includes(user.role);

/**
 * Modules de la plateforme (= entrées du menu du front) et leurs actions.
 * kind: 'lecture' | 'ecriture'. allowed(perms, user) reprend EXACTEMENT les contrôles appliqués par les routes.
 */
export const MODULES = [
  {
    id: 'dashboard', label: 'Tableau de bord',
    actions: [
      { id: 'consulter', label: 'Consulter les indicateurs', kind: 'lecture', endpoints: ['GET /api/dashboard'], allowed: () => true },
      { id: 'volet_financier', label: 'Voir le volet financier du tableau de bord', kind: 'lecture', endpoints: ['GET /api/dashboard'], allowed: (p) => p.canManageFinances },
    ],
  },
  {
    id: 'adherents', label: 'Adhérents',
    actions: [
      { id: 'consulter', label: 'Consulter le répertoire et les fiches', kind: 'lecture', endpoints: ['GET /api/adherents', 'GET /api/adherents/{id}'], allowed: () => true },
      { id: 'creer', label: 'Enregistrer un nouvel adhérent', kind: 'ecriture', endpoints: ['POST /api/adherents'], allowed: (p) => p.canRecord },
      { id: 'modifier', label: 'Modifier une fiche (code de confirmation)', kind: 'ecriture', endpoints: ['PUT /api/adherents/{id}'], allowed: (p) => p.canEditRecords },
      { id: 'supprimer', label: 'Supprimer un adhérent (code de confirmation)', kind: 'ecriture', endpoints: ['DELETE /api/adherents/{id}'], allowed: (p) => p.canDeleteRecords },
      { id: 'changer_statut', label: "Changer le statut d'un adhérent", kind: 'ecriture', endpoints: ['PATCH /api/adherents/{id}/statut'], allowed: (p) => p.canChangeAdherentStatut },
      { id: 'affecter_portefeuille', label: 'Affecter à un gestionnaire de portefeuille', kind: 'ecriture', endpoints: ['PUT /api/adherents/{id}/portefeuille'], allowed: (p) => p.canEditRecords },
      { id: 'ajuster_assiette', label: "Ajuster l'assiette cotisable CNPS", kind: 'ecriture', endpoints: ['PUT /api/adherents/{id}/salaire-cotisable'], allowed: (p) => p.canManageFinances },
    ],
  },
  {
    id: 'gestionnaires', label: 'Gestionnaires de portefeuille',
    actions: [
      { id: 'consulter', label: 'Consulter les gestionnaires', kind: 'lecture', endpoints: ['GET /api/gestionnaires'], allowed: () => true },
      { id: 'gerer', label: 'Créer / modifier / supprimer un gestionnaire', kind: 'ecriture', endpoints: ['POST /api/gestionnaires', 'PUT /api/gestionnaires/{id}', 'DELETE /api/gestionnaires/{id}'], allowed: (p) => p.canConfigure },
    ],
  },
  {
    id: 'cotisations', label: 'Cotisations',
    actions: [
      { id: 'consulter', label: 'Consulter le journal des cotisations', kind: 'lecture', endpoints: ['GET /api/cotisations'], allowed: () => true },
      { id: 'encaisser', label: 'Encaisser une cotisation', kind: 'ecriture', endpoints: ['POST /api/cotisations'], allowed: (p) => p.canRecord },
      { id: 'modifier', label: 'Modifier une cotisation (code de confirmation)', kind: 'ecriture', endpoints: ['PUT /api/cotisations/{id}'], allowed: (p) => p.canEditRecords },
      { id: 'supprimer', label: 'Supprimer une cotisation (code de confirmation)', kind: 'ecriture', endpoints: ['DELETE /api/cotisations/{id}'], allowed: (p) => p.canDeleteRecords },
      { id: 'regulariser', label: 'Régulariser rétroactivement une cotisation', kind: 'ecriture', endpoints: ['POST /api/cotisations/regulariser'], allowed: (p) => p.canRegulariserCotisations },
    ],
  },
  {
    id: 'finances', label: 'Finances & Dépenses (DAF)',
    actions: [
      { id: 'consulter', label: 'Consulter dépenses, versements, frais Mobile Money', kind: 'lecture', endpoints: ['GET /api/depenses', 'GET /api/versements', 'GET /api/frais-mobile-money', 'GET /api/finances/synthese', 'GET /api/finances/controle'], allowed: (p) => p.canManageFinances },
      { id: 'gerer', label: 'Enregistrer / modifier / supprimer (suppression avec code)', kind: 'ecriture', endpoints: ['POST /api/depenses', 'POST /api/versements', 'POST /api/frais-mobile-money'], allowed: (p) => p.canManageFinances },
      { id: 'banques', label: 'Gérer les banques partenaires', kind: 'ecriture', endpoints: ['POST /api/banques'], allowed: (p) => p.canManageFinances },
    ],
  },
  {
    id: 'paie', label: 'Gestion de la paie (DAF)',
    actions: [
      { id: 'consulter', label: 'Consulter salariés et bulletins', kind: 'lecture', endpoints: ['GET /api/employes', 'GET /api/paie/bulletins'], allowed: (p) => p.canManageFinances },
      { id: 'gerer', label: 'Gérer les salariés, générer, modifier et valider la paie', kind: 'ecriture', endpoints: ['POST /api/employes', 'POST /api/paie/generer', 'POST /api/paie/valider'], allowed: (p) => p.canManageFinances },
    ],
  },
  {
    id: 'rapports_agents', label: 'Rapports des agents (caisse)',
    actions: [
      { id: 'consulter', label: 'Consulter les rapports', kind: 'lecture', endpoints: ['GET /api/rapports-agents'], allowed: () => true },
      { id: 'saisir', label: 'Saisir / modifier un rapport', kind: 'ecriture', endpoints: ['POST /api/rapports-agents'], allowed: (p) => p.canRecord },
      { id: 'supprimer', label: 'Supprimer un rapport', kind: 'ecriture', endpoints: ['DELETE /api/rapports-agents/{id}'], allowed: (p) => p.canDeleteRecords },
      { id: 'viser_daf', label: 'Viser (contrôle DAF)', kind: 'ecriture', endpoints: ['POST /api/rapports-agents/{id}/valider-daf'], allowed: (p) => p.canManageFinances },
      { id: 'valider_direction', label: 'Validation finale Direction (DG / DGA)', kind: 'ecriture', endpoints: ['POST /api/rapports-agents/{id}/valider-direction'], allowed: (_p, u) => DG_DGA(u) },
    ],
  },
  {
    id: 'immatriculations', label: 'Immatriculations CNPS',
    actions: [
      { id: 'consulter', label: 'Consulter les adhérents éligibles', kind: 'lecture', endpoints: ['GET /api/adherents'], allowed: () => true },
      { id: 'valider', label: 'Valider une immatriculation', kind: 'ecriture', endpoints: ['POST /api/adherents/{id}/immatriculer'], allowed: (p) => p.canImmatriculer },
    ],
  },
  {
    id: 'dossiers', label: 'Dossiers CNPS',
    actions: [
      { id: 'consulter', label: 'Consulter les dossiers', kind: 'lecture', endpoints: ['GET /api/dossiers'], allowed: () => true },
      { id: 'gerer', label: 'Créer / mettre à jour un dossier, déclarer « sans enfant »', kind: 'ecriture', endpoints: ['POST /api/dossiers', 'PUT /api/dossiers/{id}', 'POST /api/adherents/{id}/sans-enfant'], allowed: (p) => p.canManageDossiers },
    ],
  },
  {
    id: 'agenda', label: 'Agenda Direction (DG / DGA / DAF)',
    actions: [
      { id: 'consulter', label: 'Consulter partenaires, rendez-vous et notes', kind: 'lecture', endpoints: ['GET /api/partenaires', 'GET /api/rendez-vous', 'GET /api/notes-direction'], allowed: (p) => p.canManageAgenda },
      { id: 'gerer', label: 'Gérer partenaires, rendez-vous et notes', kind: 'ecriture', endpoints: ['POST /api/partenaires', 'POST /api/rendez-vous', 'POST /api/notes-direction'], allowed: (p) => p.canManageAgenda },
      { id: 'notes_confidentielles', label: 'Lire / écrire les notes « Confidentiel Direction »', kind: 'ecriture', endpoints: ['GET /api/notes-direction'], allowed: (p, u) => p.canManageAgenda && DG_DGA(u) },
    ],
  },
  {
    id: 'rapports_reunions', label: 'Rapports de réunion (PV)',
    actions: [
      { id: 'consulter', label: 'Consulter les PV', kind: 'lecture', endpoints: ['GET /api/rapports-reunions'], allowed: () => true },
      { id: 'rediger', label: 'Rédiger / modifier un PV brouillon', kind: 'ecriture', endpoints: ['POST /api/rapports-reunions', 'PUT /api/rapports-reunions/{id}'], allowed: (p) => p.canConfigure },
      { id: 'corriger_signe', label: 'Corriger ou supprimer un PV signé / diffusé', kind: 'ecriture', endpoints: ['PUT /api/rapports-reunions/{id}'], allowed: (p, u) => p.canConfigure && DG_DGA(u) },
    ],
  },
  {
    id: 'alertes', label: 'Alertes & relances',
    actions: [{ id: 'consulter', label: 'Consulter les alertes', kind: 'lecture', endpoints: ['GET /api/alertes'], allowed: () => true }],
  },
  {
    id: 'etats_mensuels', label: 'États mensuels (clôture) & relevés',
    actions: [
      { id: 'consulter', label: 'Consulter états mensuels et relevés adhérents', kind: 'lecture', endpoints: ['GET /api/rapports/etats-mensuels', 'GET /api/rapports/releve/{id}'], allowed: () => true },
      { id: 'volet_financier', label: 'Voir le volet financier des états mensuels', kind: 'lecture', endpoints: ['GET /api/rapports/etats-mensuels'], allowed: (p) => p.canManageFinances },
      { id: 'exporter', label: 'Exporter (Excel / PDF / sauvegarde)', kind: 'lecture', endpoints: ['GET /api/systeme/export'], allowed: (p) => p.canExportReports && p.canManageParametres },
    ],
  },
  {
    id: 'echange_excel', label: 'Échange de données Excel',
    actions: [
      { id: 'exporter', label: "Exporter les données de son périmètre au format d'échange, ou télécharger le modèle vierge", kind: 'lecture', endpoints: ['GET /api/excel/catalogue', 'GET /api/excel/export', 'GET /api/excel/modele'], allowed: () => true },
      { id: 'importer', label: 'Importer un fichier Excel (simulation puis import réel avec code de confirmation) pour les données de son périmètre', kind: 'ecriture', endpoints: ['POST /api/excel/import'], allowed: (p) => p.canRecord || p.canManageFinances || p.canConfigure },
    ],
  },
  {
    id: 'journal', label: "Journal d'audit",
    actions: [
      { id: 'consulter', label: "Consulter la piste d'audit", kind: 'lecture', endpoints: ['GET /api/journal'], allowed: () => true },
      { id: 'purger', label: "Purger le journal (code de confirmation)", kind: 'ecriture', endpoints: ['DELETE /api/journal'], allowed: (p) => p.canClearJournal },
    ],
  },
  {
    id: 'utilisateurs', label: 'Utilisateurs & accès',
    actions: [
      { id: 'profil', label: 'Consulter son profil et son activité, modifier son nom / téléphone, changer son mot de passe', kind: 'ecriture', endpoints: ['POST /api/auth/change-password', 'PUT /api/utilisateurs/{id}', 'GET /api/utilisateurs/{id}/activite'], allowed: () => true },
      { id: 'auditer', label: "Consulter le profil et les actions de tout acteur, imprimer son rapport d'audit", kind: 'lecture', endpoints: ['GET /api/utilisateurs/{id}/activite', 'GET /api/utilisateurs/{id}/rapport-audit'], allowed: (p) => p.canAuditUsers },
      { id: 'gerer_comptes', label: 'Créer des comptes (tous rôles), modifier / désactiver / supprimer, paramétrage groupé', kind: 'ecriture', endpoints: ['POST /api/utilisateurs', 'PUT /api/utilisateurs/bulk', 'DELETE /api/utilisateurs/{id}'], allowed: (p) => p.canManageUsers },
      { id: 'identifiants', label: "Modifier les informations de connexion d'un acteur (e-mail, mot de passe, code PIN, déverrouillage)", kind: 'ecriture', endpoints: ['PUT /api/utilisateurs/{id}/identifiants', 'POST /api/utilisateurs/{id}/reset-password'], allowed: (p) => p.canManageCredentials },
    ],
  },
  {
    id: 'parametres', label: 'Paramètres généraux',
    actions: [
      { id: 'consulter', label: 'Consulter la configuration', kind: 'lecture', endpoints: ['GET /api/parametres'], allowed: () => true },
      { id: 'modifier', label: 'Modifier seuils, coordonnées et code de confirmation', kind: 'ecriture', endpoints: ['PUT /api/parametres'], allowed: (p) => p.canManageParametres },
    ],
  },
  {
    id: 'systeme', label: 'Système',
    actions: [
      { id: 'mise_a_jour', label: 'Mise à jour logicielle (efface les données d\'exploitation, code de maintenance)', kind: 'ecriture', endpoints: ['POST /api/systeme/mise-a-jour'], allowed: (p) => p.canUpdateSoftware },
      { id: 'reinitialiser', label: 'Réimporter la base initiale (database_mysql)', kind: 'ecriture', endpoints: ['POST /api/systeme/reset-demo'], allowed: (p) => p.canResetDemo },
    ],
  },
];

/** Modules et actions accessibles à un utilisateur (déduits de ses droits réels). */
export function modulesFor(user) {
  const perms = getUserPermissions(user);
  return MODULES.map((m) => {
    const actions = m.actions.map((a) => ({ id: a.id, label: a.label, kind: a.kind, autorise: !!a.allowed(perms, user), endpoints: a.endpoints }));
    const ok = actions.filter((a) => a.autorise);
    const niveau = ok.some((a) => a.kind === 'ecriture') ? 'ecriture' : ok.length ? 'lecture' : 'aucun';
    return { id: m.id, label: m.label, niveau, actions };
  });
}

/** Fiche complète d'un rôle (description, droits, modules). */
export function roleSheet(role) {
  const user = { role };
  const perms = getUserPermissions(user);
  return {
    role,
    typeAcces: perms.typeAcces,
    ...ROLES_DESCRIPTION[role],
    permissions: perms,
    modules: modulesFor(user),
  };
}

export const allRoleSheets = () => ROLES.map(roleSheet);
