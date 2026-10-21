/**
 * Droits d'accès — base : src/utils/permissions.ts du front, complétée par le rôle « Super Administrateur ».
 * Le front masque les boutons, le backend IMPOSE les règles.
 *
 * Gestion des comptes et des identifiants de connexion : réservée au SUPER ADMINISTRATEUR (déduit du rôle,
 * jamais du typeAcces, pour qu'aucune surcharge de profil ne puisse l'accorder).
 */

export const SUPER_ADMIN = 'Super Administrateur';

export const ROLES = [
  SUPER_ADMIN,
  'PCA',
  'DG',
  'DGA',
  'Conseil de Surveillance',
  'DAF',
  "Caissière & Agent d'enregistrement",
  'Administrateur',
  "Agent d'enregistrement",
  'Agent de consultation',
];

export const TYPES_ACCES = [
  'Super administration',
  'Consultation',
  'Administrateur et consultation',
  'Administrateur et enregistrement',
  'Administrateur, enregistrement et consultation',
  'Enregistrement',
];

export const DIRECTION_ROLES = ['DAF', 'DGA', 'DG', 'Administrateur'];
/** Rôles habilités à consulter le profil et l'activité de n'importe quel acteur (audit) */
export const AUDIT_ROLES = [SUPER_ADMIN, 'DG', 'DGA', 'DAF', 'PCA', 'Conseil de Surveillance', 'Administrateur'];

export const isSuperAdmin = (user) => user?.role === SUPER_ADMIN;

export function getTypeAcces(user) {
  if (!user) return 'Consultation';
  if (user.role === SUPER_ADMIN) return 'Super administration';
  if (user.typeAcces && user.typeAcces !== 'Super administration') {
    if (user.role === 'DAF' && user.typeAcces === 'Administrateur et enregistrement') {
      return 'Administrateur, enregistrement et consultation';
    }
    return user.typeAcces;
  }
  const { role } = user;
  if (role === 'PCA' || role === 'Conseil de Surveillance' || role === 'Agent de consultation') return 'Consultation';
  if (role === 'DG' || role === 'DGA' || role === 'Administrateur') return 'Administrateur et consultation';
  if (role === 'DAF') return 'Administrateur, enregistrement et consultation';
  if (role === "Caissière & Agent d'enregistrement" || role === "Agent d'enregistrement") return 'Enregistrement';
  return 'Consultation';
}

function basePermissions(typeAcces, isPca) {
  switch (typeAcces) {
    case 'Super administration':
      return {
        typeAcces, isReadOnly: false, canConsult: true, canRecord: true, canEditRecords: true,
        canDeleteRecords: true, canImmatriculer: true, canManageDossiers: true, canManageParametres: true,
        canConfigure: true, canResetDemo: true, canUpdateSoftware: true, canExportReports: true, canClearJournal: true,
        canManageFinances: true, canManageAgenda: true, canRegulariserCotisations: true, canChangeAdherentStatut: true,
      };
    case 'Administrateur et consultation': // DG, DGA, Administrateur
      return {
        typeAcces, isReadOnly: false, canConsult: true, canRecord: true, canEditRecords: true,
        canDeleteRecords: true, canImmatriculer: true, canManageDossiers: true, canManageParametres: true,
        canConfigure: true, canResetDemo: true, canUpdateSoftware: true, canExportReports: true, canClearJournal: true,
        canManageFinances: true, canManageAgenda: true, canRegulariserCotisations: true, canChangeAdherentStatut: true,
      };
    case 'Administrateur, enregistrement et consultation': // DAF
    case 'Administrateur et enregistrement':
      return {
        typeAcces, isReadOnly: false, canConsult: true, canRecord: true, canEditRecords: true,
        canDeleteRecords: true, canImmatriculer: true, canManageDossiers: true, canManageParametres: true,
        canConfigure: true, canResetDemo: true, canUpdateSoftware: true, canExportReports: true, canClearJournal: false,
        canManageFinances: true, canManageAgenda: true, canRegulariserCotisations: true, canChangeAdherentStatut: true,
      };
    case 'Enregistrement': // Caissière / agent d'enregistrement
      return {
        typeAcces, isReadOnly: false, canConsult: true, canRecord: true, canEditRecords: true,
        canDeleteRecords: false, canImmatriculer: true, canManageDossiers: true, canManageParametres: false,
        canConfigure: false, canResetDemo: false, canUpdateSoftware: false, canExportReports: true, canClearJournal: false,
        canManageFinances: false, canManageAgenda: false, canRegulariserCotisations: false, canChangeAdherentStatut: false,
      };
    case 'Consultation': // PCA, Conseil de Surveillance, Agent de consultation
    default:
      return {
        typeAcces: 'Consultation', isReadOnly: true, canConsult: true, canRecord: false, canEditRecords: false,
        canDeleteRecords: false, canImmatriculer: false, canManageDossiers: false, canManageParametres: false,
        canConfigure: false, canResetDemo: false, canUpdateSoftware: isPca, canExportReports: true, canClearJournal: false,
        canManageFinances: false, canManageAgenda: false, canRegulariserCotisations: false, canChangeAdherentStatut: false,
      };
  }
}

export function getUserPermissions(user) {
  const superAdmin = isSuperAdmin(user);
  return {
    ...basePermissions(getTypeAcces(user), user?.role === 'PCA'),
    // Comptes et identifiants de connexion : Super Administrateur uniquement
    canManageUsers: superAdmin,
    canManageCredentials: superAdmin,
    canViewAllPasswords: false, // les mots de passe sont hachés : personne ne peut les lire
    canModifyAllPasswords: superAdmin, // alias historique du front
    // Profil + historique d'activité de n'importe quel acteur, rapport d'audit
    canAuditUsers: AUDIT_ROLES.includes(user?.role),
  };
}

export const isDirection = (user) => DIRECTION_ROLES.includes(user?.role);
