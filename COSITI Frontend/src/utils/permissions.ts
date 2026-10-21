import { Utilisateur, RoleUtilisateur, TypeAcces } from '../types';

export interface UserPermissions {
  typeAcces: TypeAcces;
  isReadOnly: boolean;
  canConsult: boolean; // Consultation intégrale des tableaux, répertoires, états et alertes
  canRecord: boolean; // Encaisser cotisation, nouvel adhérent, ajouter pièce dossier
  canEditRecords: boolean; // Modifier adhérent / cotisation (avec code 0000)
  canDeleteRecords: boolean; // Supprimer adhérent / cotisation (avec code 0000)
  canImmatriculer: boolean; // Valider immatriculation CNPS
  canManageDossiers: boolean; // Modifier et transmettre les dossiers
  canManageParametres: boolean; // Modifier les paramètres généraux et seuils (DAF + DG)
  canConfigure: boolean; // Modification des règles métier et coordonnées (DAF + DG)
  canResetDemo: boolean; // Réinitialisation de la base de démonstration (DAF + DG)
  canUpdateSoftware: boolean; // Effectuer la mise à jour du logiciel avec code 1111 (PCA, DG, DAF)
  canViewAllPasswords: boolean; // Visualiser les mots de passe de tous les utilisateurs (DAF, PCA, DG)
  canModifyAllPasswords: boolean; // Modifier les mots de passe de tous les utilisateurs (DAF, PCA, DG)
  canManageUsers: boolean; // Gérer les comptes utilisateurs
  canExportReports: boolean; // Exporter en Excel / PDF
  canClearJournal: boolean; // Purger le journal d'audit
  canManageFinances: boolean; // Dépenses courantes, versements bancaires, frais Orange/MoMo (Espace DAF)
  canManageAgenda: boolean; // Agenda direction, partenaires potentiels, rendez-vous et notes (DG / DGA)
  canRegulariserCotisations: boolean; // Régularisation rétroactive des cotisations (DAF, DGA, DG)
  canChangeAdherentStatut: boolean; // Modification du statut des adhérents (DAF, DGA, DG)
  canManageCredentials?: boolean; // Informations de connexion des acteurs : Super Administrateur uniquement
  canAuditUsers?: boolean; // Profil + activité de tout acteur, rapport d'audit
  badgeBgColor: string;
  badgeTextColor: string;
  badgeBorderColor: string;
}

/**
 * Vérifie si un utilisateur a le droit de visualiser le mot de passe / code d'accès d'un utilisateur cible.
 * Règle stricte : Seuls le DAF, le PCA et le DG peuvent voir tous les mots de passe.
 * Les autres utilisateurs ne peuvent voir QUE leur propre mot de passe.
 */
export function canViewUserPassword(targetUser?: Utilisateur | null, viewerUser?: Utilisateur | null): boolean {
  // Les mots de passe sont hachés par le serveur : ils ne sont plus visibles par personne.
  return false;
  if (!viewerUser || !targetUser) return false;
  // Les seuls autorisés à voir tous les mots de passe : DAF, PCA, DG (et DGA)
  const privilegedRoles: RoleUtilisateur[] = ['DAF', 'PCA', 'DG', 'DGA'];
  if (privilegedRoles.includes(viewerUser.role)) {
    return true;
  }
  // Les autres ne voient QUE leur propre mot de passe
  return viewerUser.id === targetUser.id;
}

/**
 * Vérifie si un utilisateur a le droit de modifier le mot de passe d'un utilisateur cible.
 * Règle stricte : Seuls le DAF, le PCA et le DG peuvent modifier tous les mots de passe.
 * Les autres utilisateurs ne peuvent modifier QUE le leur.
 */
export function canModifyUserPassword(targetUser?: Utilisateur | null, modifierUser?: Utilisateur | null): boolean {
  // Seul le Super Administrateur modifie les informations de connexion d'un acteur
  return !!targetUser && modifierUser?.role === 'Super Administrateur';
  if (!modifierUser || !targetUser) return false;
  const privilegedRoles: RoleUtilisateur[] = ['DAF', 'PCA', 'DG', 'DGA'];
  if (privilegedRoles.includes(modifierUser.role)) {
    return true;
  }
  return modifierUser.id === targetUser.id;
}

/**
 * Vérifie si un utilisateur est habilité à déclencher la mise à jour du logiciel (Code 1111).
 * Règle stricte : Seuls le PCA, le DG et le DAF (ainsi que la DGA) peuvent effectuer la mise à jour.
 */
export function canPerformSoftwareUpdate(user?: Utilisateur | null): boolean {
  if (!user) return false;
  const authorizedRoles: RoleUtilisateur[] = ['PCA', 'DG', 'DGA', 'DAF'];
  return authorizedRoles.includes(user.role);
}

export function getTypeAcces(user?: Utilisateur | null): TypeAcces {
  if (!user) return 'Consultation';
  if (user.role === 'Super Administrateur') return 'Super administration';
  if (user.typeAcces) {
    if (user.role === 'DAF' && user.typeAcces === 'Administrateur et enregistrement') {
      return 'Administrateur, enregistrement et consultation';
    }
    return user.typeAcces;
  }

  const role = user.role;
  if (role === 'PCA' || role === 'Conseil de Surveillance' || role === 'Agent de consultation') {
    return 'Consultation';
  }
  if (role === 'DG' || role === 'DGA' || role === 'Administrateur') {
    return 'Administrateur et consultation';
  }
  if (role === 'DAF') {
    return 'Administrateur, enregistrement et consultation';
  }
  if (role === 'Caissière & Agent d\'enregistrement' || role === "Agent d'enregistrement") {
    return 'Enregistrement';
  }
  return 'Consultation';
}

/**
 * Droits effectifs : ceux calculés par le SERVEUR pour l'utilisateur connecté (session) quand ils sont connus,
 * sinon le calcul local (affichage des badges des autres comptes). Le serveur reste seul juge à chaque appel.
 */
export function getUserPermissions(user?: Utilisateur | null): UserPermissions {
  const local = localPermissions(user);
  const server = user?.permissions as Partial<UserPermissions> | undefined;
  return server ? { ...local, ...server, badgeBgColor: local.badgeBgColor, badgeTextColor: local.badgeTextColor, badgeBorderColor: local.badgeBorderColor } : local;
}

function localPermissions(user?: Utilisateur | null): UserPermissions {
  const typeAcces = getTypeAcces(user);
  const isPrivilegedRole = user ? ['DAF', 'PCA', 'DG', 'DGA'].includes(user.role) : false;
  const isDaf = user?.role === 'DAF';
  const isPca = user?.role === 'PCA';
  const isDgOrDga = user?.role === 'DG' || user?.role === 'DGA';

  const isSuperAdmin = user?.role === 'Super Administrateur';
  const audit = !!user && ['Super Administrateur', 'DG', 'DGA', 'DAF', 'PCA', 'Conseil de Surveillance', 'Administrateur'].includes(user.role);
  const comptes = { canManageUsers: isSuperAdmin, canManageCredentials: isSuperAdmin, canViewAllPasswords: false, canModifyAllPasswords: isSuperAdmin, canAuditUsers: audit };

  if (isSuperAdmin) {
    return {
      typeAcces, isReadOnly: false, canConsult: true, canRecord: true, canEditRecords: true, canDeleteRecords: true,
      canImmatriculer: true, canManageDossiers: true, canManageParametres: true, canConfigure: true, canResetDemo: true,
      canUpdateSoftware: true, canExportReports: true, canClearJournal: true, canManageFinances: true, canManageAgenda: true,
      canRegulariserCotisations: true, canChangeAdherentStatut: true, ...comptes,
      badgeBgColor: 'bg-rose-100', badgeTextColor: 'text-rose-800', badgeBorderColor: 'border-rose-200',
    };
  }

  const withComptes = (p: UserPermissions): UserPermissions => ({ ...p, ...comptes });

  switch (typeAcces) {
    case 'Administrateur et consultation': // DG et DGA
      return withComptes({
        typeAcces,
        isReadOnly: false,
        canConsult: true,
        canRecord: true,
        canEditRecords: true,
        canDeleteRecords: true,
        canImmatriculer: true,
        canManageDossiers: true,
        canManageParametres: true, // DG gère les paramètres
        canConfigure: true,
        canResetDemo: true,
        canUpdateSoftware: true, // DG peut faire la mise à jour
        canViewAllPasswords: true, // DG voit tous les MDP
        canModifyAllPasswords: true, // DG modifie tous les MDP
        canManageUsers: true,
        canExportReports: true,
        canClearJournal: true,
        canManageFinances: true,
        canManageAgenda: true,
        canRegulariserCotisations: true, // DGA et DG habilités à régulariser les cotisations antérieures
        canChangeAdherentStatut: true, // DGA et DG habilités à modifier le statut des adhérents
        badgeBgColor: 'bg-purple-100',
        badgeTextColor: 'text-purple-800',
        badgeBorderColor: 'border-purple-200',
      });

    case 'Administrateur, enregistrement et consultation': // DAF
    case 'Administrateur et enregistrement': // Rétrocompatibilité DAF
      return withComptes({
        typeAcces,
        isReadOnly: false,
        canConsult: true,
        canRecord: true,
        canEditRecords: true,
        canDeleteRecords: true,
        canImmatriculer: true,
        canManageDossiers: true,
        canManageParametres: true, // Les paramètres généraux sont au ressort du DAF
        canConfigure: true, // Le DAF peut modifier les paramètres
        canResetDemo: true, // Le jeu de démonstration concerne aussi le DAF
        canUpdateSoftware: true, // Le DAF peut faire la mise à jour du logiciel
        canViewAllPasswords: true, // Le DAF visualise les mots de passe
        canModifyAllPasswords: true, // Le DAF modifie les mots de passe
        canManageUsers: true,
        canExportReports: true,
        canClearJournal: false,
        canManageFinances: true,
        canManageAgenda: true,
        canRegulariserCotisations: true, // Le DAF est expressément habilité à régulariser les cotisations antérieures
        canChangeAdherentStatut: true, // Le DAF est habilité à modifier le statut des adhérents
        badgeBgColor: 'bg-indigo-100',
        badgeTextColor: 'text-indigo-800',
        badgeBorderColor: 'border-indigo-200',
      });

    case 'Enregistrement': // Caissière et agent d'enregistrement
      return withComptes({
        typeAcces,
        isReadOnly: false,
        canConsult: true,
        canRecord: true,
        canEditRecords: true,
        canDeleteRecords: false, // Bloqué pour caissière
        canImmatriculer: true,
        canManageDossiers: true,
        canManageParametres: false, // Bloqué pour caissière
        canConfigure: false,
        canResetDemo: false,
        canUpdateSoftware: false,
        canViewAllPasswords: false, // Caissière ne voit QUE son mot de passe
        canModifyAllPasswords: false,
        canManageUsers: false,
        canExportReports: true,
        canClearJournal: false,
        canManageFinances: false,
        canManageAgenda: false,
        canRegulariserCotisations: false, // Bloqué : réservé au DAF et à la DGA
        canChangeAdherentStatut: false, // Bloqué : réservé à la direction
        badgeBgColor: 'bg-emerald-100',
        badgeTextColor: 'text-emerald-800',
        badgeBorderColor: 'border-emerald-200',
      });

    case 'Consultation': // PCA, Conseil de Surveillance
    default:
      return withComptes({
        typeAcces: 'Consultation',
        isReadOnly: true,
        canConsult: true,
        canRecord: false,
        canEditRecords: false,
        canDeleteRecords: false,
        canImmatriculer: false,
        canManageDossiers: false,
        canManageParametres: false,
        canConfigure: false,
        canResetDemo: false,
        canUpdateSoftware: isPca, // Le PCA peut faire la mise à jour du logiciel
        canViewAllPasswords: isPca, // Le PCA visualise tous les mots de passe
        canModifyAllPasswords: isPca, // Le PCA modifie les mots de passe
        canManageUsers: false,
        canExportReports: true,
        canClearJournal: false,
        canManageFinances: false,
        canManageAgenda: false,
        canRegulariserCotisations: false,
        canChangeAdherentStatut: false,
        badgeBgColor: 'bg-amber-100',
        badgeTextColor: 'text-amber-800',
        badgeBorderColor: 'border-amber-200',
      });
  }
}

export interface RoleDescription {
  id: RoleUtilisateur;
  nomRole: string;
  typeAcces: TypeAcces;
  titreOfficiel: string;
  description: string;
  droitsCles: string[];
  restrictions: string[];
  couleurBadge: string;
}

export const ROLES_CONFIG: RoleDescription[] = [
  {
    id: 'PCA',
    nomRole: 'Le PCA',
    typeAcces: 'Consultation',
    titreOfficiel: 'Président du Conseil d\'Administration',
    description: 'Supervision stratégique de la coopérative, contrôle des grands équilibres, consultation des états financiers, habilitation à la mise à jour du logiciel et gestion des mots de passe.',
    droitsCles: [
      'Consultation intégrale du Tableau de bord et statistiques',
      'Consultation des répertoires adhérents et cotisations',
      'Accès aux alertes administratives et au journal d\'audit',
      'Téléchargement des rapports financiers et exports Excel',
      'Visualisation et modification des mots de passe utilisateurs (avec le DG et le DAF)',
      'Habilité à exécuter la mise à jour du logiciel avec le code 1111 (avec le DG et le DAF)',
    ],
    restrictions: [
      'Aucun droit d\'enregistrement ou d\'encaissement direct',
      'Aucune modification ou suppression des données de caisse',
      'Aucune modification des paramètres généraux (au ressort du DAF)',
    ],
    couleurBadge: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  {
    id: 'DG',
    nomRole: 'Le DG et la DGA',
    typeAcces: 'Administrateur et consultation',
    titreOfficiel: 'Directeur Général & Directrice Générale Adjointe',
    description: 'Administration générale, gouvernance exécutive, consultation globale, validation des immatriculations CNPS, gestion des utilisateurs et des mots de passe.',
    droitsCles: [
      'Administration et supervision globale de toute la plateforme',
      'Consultation complète de tous les modules et journaux d\'audit',
      'Gestion de l\'agenda de direction, des partenaires potentiels et rendez-vous institutionnels',
      'Enregistrement et suivi des notes spécifiques à retenir et décisions stratégiques',
      'Gestion des comptes utilisateurs et attribution des rôles',
      'Visualisation et modification de tous les mots de passe utilisateurs (avec le DAF et le PCA)',
      'Habilité à la mise à jour du logiciel avec le code 1111 (avec le PCA et le DAF)',
      'Validation et suppression avec code de sécurité 0000',
    ],
    restrictions: [
      'Traçabilité obligatoire de toute action administrative dans le journal',
    ],
    couleurBadge: 'bg-purple-100 text-purple-900 border-purple-300',
  },
  {
    id: 'Conseil de Surveillance',
    nomRole: 'Le Conseil de Surveillance',
    typeAcces: 'Consultation',
    titreOfficiel: 'Conseil de Surveillance & Contrôle de Gestion',
    description: 'Organe de contrôle légal et de vérification des opérations. Accès de consultation étendu pour audit, conformité et inspection des comptes.',
    droitsCles: [
      'Inspection et vérification de tous les encaissements journaliers',
      'Consultation du journal d\'audit complet et historique des modifications',
      'Contrôle de l\'avancement des immatriculations CNPS et dossiers',
      'Export des états de synthèse pour rapports de surveillance',
      'Consultation exclusive de son propre mot de passe (les autres sont masqués)',
    ],
    restrictions: [
      'Aucun droit de saisie ou d\'encaissement de cotisations',
      'Aucune modification des fiches membres ou versements',
      'Aucune altération des paramètres coopérative',
      'Ne peut pas visualiser les mots de passe des autres utilisateurs',
    ],
    couleurBadge: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  {
    id: 'DAF',
    nomRole: 'Le DAF',
    typeAcces: 'Administrateur, enregistrement et consultation',
    titreOfficiel: 'Directeur Administratif et Financier',
    description: 'Pilotage financier, gestion des paramètres généraux du système, consultation et analyse globale, encaissements directs, mise à jour du logiciel et gestion des mots de passe.',
    droitsCles: [
      'Gestion et modification des paramètres généraux du système (au ressort du DAF)',
      'Visualisation et modification de tous les mots de passe utilisateurs (avec le PCA et le DG)',
      'Habilité à exécuter la mise à jour du logiciel avec le code 1111 (avec le PCA et le DG)',
      'Accès et rechargement du jeu de démonstration complet',
      'Consultation intégrale de tous les états financiers, tableaux de bord et répertoires',
      'Saisie et suivi des dépenses courantes de fonctionnement et charges d\'exploitation',
      'Enregistrement des versements bancaires avec traçabilité des bordereaux',
      'Suivi et déduction des frais de retrait Orange Money et Mobile Money prélevés par les opérateurs',
      'Consultation et audit des pièces justificatives et dossiers sociaux',
      'Enregistrement direct des cotisations et adhésions',
      'Administration financière et suivi de la conformité',
      'Modification et régularisation des versements (avec code 0000)',
      'Validation des dossiers d\'immatriculation et transmission CNPS',
      'Génération et export de tous les états comptables et financiers en Excel',
    ],
    restrictions: [
      'Purge du journal d\'audit réservée à la Direction Générale',
    ],
    couleurBadge: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  },
  {
    id: 'Caissière & Agent d\'enregistrement',
    nomRole: 'La Caissière et agent d\'enregistrement',
    typeAcces: 'Enregistrement',
    titreOfficiel: 'Caisse centrale & Saisie des adhésions',
    description: 'Saisie opérationnelle quotidienne : adhésion des nouveaux membres, encaissements des cotisations journalières et délivrance des reçus officiels.',
    droitsCles: [
      'Enregistrement des nouveaux adhérents du secteur informel',
      'Encaissement des cotisations (Espèces, Wave, Orange, MTN, Moov)',
      'Impression immédiate des reçus officiels pour les membres',
      'Réception et pointage des pièces des dossiers d\'allocations',
      'Consultation des registres nécessaires à la caisse',
    ],
    restrictions: [
      'Pas d\'accès à la configuration des paramètres système',
      'Pas d\'accès à la gestion des comptes utilisateurs',
      'Suppression d\'adhérents ou versements interdite',
    ],
    couleurBadge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
];

/**
 * Vérifie si l'utilisateur est expressément habilité à régulariser les cotisations antérieures.
 * Règle métier stricte : Le DAF et la DGA (ainsi que le DG et l'Administrateur) sont habilités.
 * Les caissières et agents de consultation ne peuvent pas régulariser sans l'autorité de la direction.
 */
export function canUserRegulariser(user?: Utilisateur | null): boolean {
  if (!user) return false;
  return ['DAF', 'DGA', 'DG', 'Administrateur'].includes(user.role);
}

/**
 * Vérifie si l'utilisateur est habilité à modifier le statut d'un adhérent (Actif, En régularisation, Suspendu, etc.).
 * Règle : DAF, DGA, DG et Administrateur.
 */
export function canUserChangeStatut(user?: Utilisateur | null): boolean {
  if (!user) return false;
  return ['DAF', 'DGA', 'DG', 'Administrateur'].includes(user.role);
}

