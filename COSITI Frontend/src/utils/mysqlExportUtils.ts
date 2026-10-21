import { logEvent } from '../api/client';
import JSZip from 'jszip';
import {
  Adherent,
  Cotisation,
  DepenseCourante,
  VersementBancaire,
  FraisMobileMoney,
  DossierAllocations,
  ParametresApp,
  Utilisateur,
  GestionnairePortefeuille,
  JournalOperation,
  Employe,
  BulletinPaie,
} from '../types';

export interface MySQLAppData {
  adherents: Adherent[];
  cotisations: Cotisation[];
  depenses: DepenseCourante[];
  versements: VersementBancaire[];
  fraisMobileMoney: FraisMobileMoney[];
  dossiers: DossierAllocations[];
  parametres: ParametresApp;
  utilisateurs: Utilisateur[];
  gestionnaires: GestionnairePortefeuille[];
  journal?: JournalOperation[];
  banques?: string[];
  employes?: Employe[];
  bulletinsPaie?: BulletinPaie[];
}

export interface SQLTableFile {
  filename: string;
  tableName: string;
  label: string;
  description: string;
  content: string;
  count: number;
}

/**
 * Échappe proprement une valeur pour un script SQL MySQL
 */
export function escapeMySQL(val: unknown): string {
  if (val === null || val === undefined) {
    return 'NULL';
  }
  if (typeof val === 'number') {
    if (isNaN(val)) return 'NULL';
    return String(val);
  }
  if (typeof val === 'boolean') {
    return val ? '1' : '0';
  }
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val);
    return `'${jsonStr.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case '\0':
          return '\\0';
        case '\x08':
          return '\\b';
        case '\x09':
          return '\\t';
        case '\x1a':
          return '\\z';
        case '\n':
          return '\\n';
        case '\r':
          return '\\r';
        case '"':
        case "'":
        case '\\':
        case '%':
          return '\\' + char;
        default:
          return char;
      }
    })}'`;
  }

  const str = String(val);
  // Remplacement sécurisé des caractères spéciaux MySQL
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\0/g, '\\0');

  return `'${escaped}'`;
}

/**
 * 1. Table Paramètres
 */
export function generateParametresSQL(p: ParametresApp): string {
  const tableDef = `
-- ------------------------------------------------------------
-- Structure de la table \`parametres\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`parametres\`;
CREATE TABLE \`parametres\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`nom_organisation\` VARCHAR(255) NOT NULL,
  \`sigle\` VARCHAR(50) NOT NULL,
  \`slogan\` VARCHAR(255) DEFAULT NULL,
  \`adresse\` VARCHAR(255) DEFAULT NULL,
  \`telephone\` VARCHAR(50) DEFAULT NULL,
  \`email\` VARCHAR(100) DEFAULT NULL,
  \`seuil_immatriculation\` DECIMAL(15,2) NOT NULL DEFAULT 15000.00,
  \`montants_cotisation_defauts\` VARCHAR(100) DEFAULT '[700, 1000]',
  \`jours_verification_cycle\` VARCHAR(100) DEFAULT '[15, 30]',
  \`seuil_jours_retard_alerte\` INT NOT NULL DEFAULT 10,
  \`code_confirmation_securite\` VARCHAR(50) NOT NULL DEFAULT '0000',
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuration générale de la coopérative';

-- ------------------------------------------------------------
-- Données de la table \`parametres\`
-- ------------------------------------------------------------
INSERT INTO \`parametres\` (
  \`id\`, \`nom_organisation\`, \`sigle\`, \`slogan\`, \`adresse\`, \`telephone\`, \`email\`,
  \`seuil_immatriculation\`, \`montants_cotisation_defauts\`, \`jours_verification_cycle\`,
  \`seuil_jours_retard_alerte\`, \`code_confirmation_securite\`
) VALUES (
  1,
  ${escapeMySQL(p.nomOrganisation)},
  ${escapeMySQL(p.sigle)},
  ${escapeMySQL(p.slogan)},
  ${escapeMySQL(p.adresse)},
  ${escapeMySQL(p.telephone)},
  ${escapeMySQL(p.email)},
  ${Number(p.seuilImmatriculation) || 15000},
  ${escapeMySQL(JSON.stringify(p.montantsCotisationDefauts || [700, 1000]))},
  ${escapeMySQL(JSON.stringify(p.joursVerification || [15, 30]))},
  ${Number(p.seuilJoursRetardAlerte) || 10},
  ${escapeMySQL(p.codeConfirmationSecurite || '0000')}
);
`;
  return tableDef.trim();
}

/**
 * 2. Table Gestionnaires de Portefeuille
 */
export function generateGestionnairesSQL(gestionnaires: GestionnairePortefeuille[]): string {
  let sql = `
-- ------------------------------------------------------------
-- Structure de la table \`gestionnaires_portefeuille\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`gestionnaires_portefeuille\`;
CREATE TABLE \`gestionnaires_portefeuille\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`code\` VARCHAR(50) NOT NULL UNIQUE,
  \`nom\` VARCHAR(100) NOT NULL,
  \`prenom\` VARCHAR(100) NOT NULL,
  \`telephone\` VARCHAR(50) NOT NULL,
  \`email\` VARCHAR(150) DEFAULT NULL,
  \`zone_secteur\` VARCHAR(150) NOT NULL,
  \`statut\` ENUM('Actif', 'Inactif') NOT NULL DEFAULT 'Actif',
  \`objectifs_recouvrement_mensuel\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`notes\` TEXT DEFAULT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_gp_statut\` (\`statut\`),
  INDEX \`idx_gp_zone\` (\`zone_secteur\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Gestionnaires de portefeuille et zones de recouvrement';
`;

  if (gestionnaires.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Données de la table \`gestionnaires_portefeuille\` (${gestionnaires.length} enregistrements)\n-- ------------------------------------------------------------\n`;
    sql += `INSERT INTO \`gestionnaires_portefeuille\` (\n  \`id\`, \`code\`, \`nom\`, \`prenom\`, \`telephone\`, \`email\`, \`zone_secteur\`, \`statut\`, \`objectifs_recouvrement_mensuel\`, \`notes\`, \`created_at\`, \`updated_at\`\n) VALUES\n`;
    const rows = gestionnaires.map((g) => {
      return `  (${escapeMySQL(g.id)}, ${escapeMySQL(g.code)}, ${escapeMySQL(g.nom)}, ${escapeMySQL(g.prenom)}, ${escapeMySQL(g.telephone)}, ${escapeMySQL(g.email)}, ${escapeMySQL(g.zoneSecteur)}, ${escapeMySQL(g.statut)}, ${Number(g.objectifsRecouvrementMensuel) || 0}, ${escapeMySQL(g.notes)}, ${escapeMySQL(g.createdAt || new Date().toISOString())}, ${escapeMySQL(g.updatedAt || new Date().toISOString())})`;
    });
    sql += rows.join(',\n') + ';\n';
  }

  return sql.trim();
}

/**
 * 3. Table Utilisateurs
 */
export function generateUtilisateursSQL(utilisateurs: Utilisateur[]): string {
  let sql = `
-- ------------------------------------------------------------
-- Structure de la table \`utilisateurs\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`utilisateurs\`;
CREATE TABLE \`utilisateurs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`nom\` VARCHAR(150) NOT NULL,
  \`email\` VARCHAR(150) NOT NULL UNIQUE,
  \`role\` VARCHAR(100) NOT NULL,
  \`type_acces\` VARCHAR(150) NOT NULL,
  \`titre_complet\` VARCHAR(200) DEFAULT NULL,
  \`poste\` VARCHAR(150) DEFAULT NULL,
  \`description_acces\` TEXT DEFAULT NULL,
  \`telephone\` VARCHAR(50) DEFAULT NULL,
  \`actif\` TINYINT(1) NOT NULL DEFAULT 1,
  \`code_pin\` VARCHAR(20) DEFAULT NULL,
  \`code_acces\` VARCHAR(50) DEFAULT NULL,
  \`dernier_acces\` DATETIME DEFAULT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_user_role\` (\`role\`),
  INDEX \`idx_user_actif\` (\`actif\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Comptes utilisateurs et rôles du système';
`;

  if (utilisateurs.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Données de la table \`utilisateurs\` (${utilisateurs.length} enregistrements)\n-- ------------------------------------------------------------\n`;
    sql += `INSERT INTO \`utilisateurs\` (\n  \`id\`, \`nom\`, \`email\`, \`role\`, \`type_acces\`, \`titre_complet\`, \`poste\`, \`description_acces\`, \`telephone\`, \`actif\`, \`code_pin\`, \`code_acces\`, \`dernier_acces\`\n) VALUES\n`;
    const rows = utilisateurs.map((u) => {
      return `  (${escapeMySQL(u.id)}, ${escapeMySQL(u.nom)}, ${escapeMySQL(u.email)}, ${escapeMySQL(u.role)}, ${escapeMySQL(u.typeAcces)}, ${escapeMySQL(u.titreComplet)}, ${escapeMySQL(u.poste)}, ${escapeMySQL(u.descriptionAcces)}, ${escapeMySQL(u.telephone)}, ${u.actif ? 1 : 0}, ${escapeMySQL(u.codePin)}, ${escapeMySQL(null)}, ${escapeMySQL(u.dernierAcces)})`;
    });
    sql += rows.join(',\n') + ';\n';
  }

  return sql.trim();
}

/**
 * 4. Table Adhérents
 */
export function generateAdherentsSQL(adherents: Adherent[]): string {
  let sql = `
-- ------------------------------------------------------------
-- Structure de la table \`adherents\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`adherents\`;
CREATE TABLE \`adherents\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`matricule\` VARCHAR(50) NOT NULL UNIQUE,
  \`nom\` VARCHAR(100) NOT NULL,
  \`prenom\` VARCHAR(100) NOT NULL,
  \`sexe\` ENUM('M', 'F') NOT NULL DEFAULT 'M',
  \`date_naissance\` DATE DEFAULT NULL,
  \`lieu_naissance\` VARCHAR(150) DEFAULT NULL,
  \`cni\` VARCHAR(100) DEFAULT NULL,
  \`telephone\` VARCHAR(50) NOT NULL,
  \`adresse\` TEXT DEFAULT NULL,
  \`profession\` VARCHAR(150) NOT NULL,
  \`date_adhesion\` DATE NOT NULL,
  \`statut\` VARCHAR(50) NOT NULL DEFAULT 'Actif',
  \`statut_immatriculation\` VARCHAR(50) NOT NULL DEFAULT 'Non immatriculé',
  \`date_immatriculation\` DATE DEFAULT NULL,
  \`numero_cnps\` VARCHAR(50) DEFAULT NULL,
  \`observations\` TEXT DEFAULT NULL,
  \`tarif_journalier\` DECIMAL(10,2) NOT NULL DEFAULT 700.00,
  \`gestionnaire_id\` VARCHAR(64) DEFAULT NULL,
  \`gestionnaire_nom\` VARCHAR(150) DEFAULT NULL,
  \`nombre_enfants\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`sans_enfant\` TINYINT(1) NOT NULL DEFAULT 0,
  \`salaire_cotisable_cnps\` DECIMAL(15,2) NOT NULL DEFAULT 60000.00,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_adh_matricule\` (\`matricule\`),
  INDEX \`idx_adh_statut\` (\`statut\`),
  INDEX \`idx_adh_statut_cnps\` (\`statut_immatriculation\`),
  INDEX \`idx_adh_gestionnaire\` (\`gestionnaire_id\`),
  INDEX \`idx_adh_cnps\` (\`numero_cnps\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Répertoire officiel des adhérents de la coopérative';
`;

  if (adherents.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Données de la table \`adherents\` (${adherents.length} enregistrements)\n-- ------------------------------------------------------------\n`;
    sql += `INSERT INTO \`adherents\` (\n  \`id\`, \`matricule\`, \`nom\`, \`prenom\`, \`sexe\`, \`date_naissance\`, \`lieu_naissance\`, \`cni\`,\n  \`telephone\`, \`adresse\`, \`profession\`, \`date_adhesion\`, \`statut\`, \`statut_immatriculation\`,\n  \`date_immatriculation\`, \`numero_cnps\`, \`observations\`, \`tarif_journalier\`, \`gestionnaire_id\`,\n  \`gestionnaire_nom\`, \`nombre_enfants\`, \`sans_enfant\`, \`salaire_cotisable_cnps\`, \`created_at\`, \`updated_at\`\n) VALUES\n`;
    const rows = adherents.map((a) => {
      return `  (${escapeMySQL(a.id)}, ${escapeMySQL(a.matricule)}, ${escapeMySQL(a.nom)}, ${escapeMySQL(a.prenom)}, ${escapeMySQL(a.sexe)}, ${escapeMySQL(a.dateNaissance)}, ${escapeMySQL(a.lieuNaissance)}, ${escapeMySQL(a.cni)}, ${escapeMySQL(a.telephone)}, ${escapeMySQL(a.adresse)}, ${escapeMySQL(a.profession)}, ${escapeMySQL(a.dateAdhesion)}, ${escapeMySQL(a.statut)}, ${escapeMySQL(a.statutImmatriculation)}, ${escapeMySQL(a.dateImmatriculation)}, ${escapeMySQL(a.numeroCnps)}, ${escapeMySQL(a.observations)}, ${Number(a.tarifJournalier) || 700}, ${escapeMySQL(a.gestionnaireId)}, ${escapeMySQL(a.gestionnaireNom)}, ${Number(a.nombreEnfants) || 0}, ${a.sansEnfant ? 1 : 0}, ${Number(a.salaireCotisableCnps) || 60000}, ${escapeMySQL(a.createdAt || new Date().toISOString())}, ${escapeMySQL(a.updatedAt || new Date().toISOString())})`;
    });
    sql += rows.join(',\n') + ';\n';
  }

  return sql.trim();
}

/**
 * 5. Table Cotisations
 */
export function generateCotisationsSQL(cotisations: Cotisation[]): string {
  let sql = `
-- ------------------------------------------------------------
-- Structure de la table \`cotisations\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`cotisations\`;
CREATE TABLE \`cotisations\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`adherent_id\` VARCHAR(64) NOT NULL,
  \`matricule\` VARCHAR(50) NOT NULL,
  \`adherent_nom_prenom\` VARCHAR(200) NOT NULL,
  \`date_paiement\` DATE NOT NULL,
  \`montant\` DECIMAL(15,2) NOT NULL,
  \`mode_paiement\` VARCHAR(50) NOT NULL,
  \`reference\` VARCHAR(100) DEFAULT NULL,
  \`mois\` VARCHAR(30) NOT NULL,
  \`annee\` INT NOT NULL,
  \`agent_enregistreur\` VARCHAR(150) NOT NULL,
  \`observations\` TEXT DEFAULT NULL,
  \`est_regularisation\` TINYINT(1) NOT NULL DEFAULT 0,
  \`type_regularisation\` VARCHAR(150) DEFAULT NULL,
  \`motif_regularisation\` TEXT DEFAULT NULL,
  \`montant_anterieur_initial\` DECIMAL(15,2) DEFAULT NULL,
  \`montant_complementaire\` DECIMAL(15,2) DEFAULT NULL,
  \`regularise_par\` VARCHAR(150) DEFAULT NULL,
  \`date_regularisation\` DATETIME DEFAULT NULL,
  \`date_paiement_effective\` DATE DEFAULT NULL,
  \`periode_concernee\` VARCHAR(50) DEFAULT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_cotis_adherent\` (\`adherent_id\`),
  INDEX \`idx_cotis_matricule\` (\`matricule\`),
  INDEX \`idx_cotis_date\` (\`date_paiement\`),
  INDEX \`idx_cotis_mois_annee\` (\`mois\`, \`annee\`),
  INDEX \`idx_cotis_mode\` (\`mode_paiement\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Journal des encaissements et cotisations des adhérents';
`;

  if (cotisations.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Données de la table \`cotisations\` (${cotisations.length} enregistrements)\n-- ------------------------------------------------------------\n`;
    sql += `INSERT INTO \`cotisations\` (\n  \`id\`, \`adherent_id\`, \`matricule\`, \`adherent_nom_prenom\`, \`date_paiement\`, \`montant\`,\n  \`mode_paiement\`, \`reference\`, \`mois\`, \`annee\`, \`agent_enregistreur\`, \`observations\`,\n  \`est_regularisation\`, \`type_regularisation\`, \`motif_regularisation\`, \`montant_anterieur_initial\`,\n  \`montant_complementaire\`, \`regularise_par\`, \`date_regularisation\`, \`date_paiement_effective\`,\n  \`periode_concernee\`, \`created_at\`\n) VALUES\n`;
    const rows = cotisations.map((c) => {
      return `  (${escapeMySQL(c.id)}, ${escapeMySQL(c.adherentId)}, ${escapeMySQL(c.matricule)}, ${escapeMySQL(c.adherentNomPrenom)}, ${escapeMySQL(c.datePaiement)}, ${Number(c.montant) || 0}, ${escapeMySQL(c.modePaiement)}, ${escapeMySQL(c.reference)}, ${escapeMySQL(c.mois)}, ${Number(c.annee) || 2026}, ${escapeMySQL(c.agentEnregistreur)}, ${escapeMySQL(c.observations)}, ${c.estRegularisation ? 1 : 0}, ${escapeMySQL(c.typeRegularisation)}, ${escapeMySQL(c.motifRegularisation)}, ${c.montantAnterieurInitial !== undefined ? Number(c.montantAnterieurInitial) : 'NULL'}, ${c.montantComplementaire !== undefined ? Number(c.montantComplementaire) : 'NULL'}, ${escapeMySQL(c.regularisePar)}, ${escapeMySQL(c.dateRegularisation)}, ${escapeMySQL(c.datePaiementEffective)}, ${escapeMySQL(c.periodeConcernee)}, ${escapeMySQL(c.createdAt || new Date().toISOString())})`;
    });
    sql += rows.join(',\n') + ';\n';
  }

  return sql.trim();
}

/**
 * 6. Table Dépenses Courantes (avec dissociation des 2 origines de provenance)
 */
export function generateDepensesSQL(depenses: DepenseCourante[]): string {
  let sql = `
-- ------------------------------------------------------------
-- Structure de la table \`depenses_courantes\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`depenses_courantes\`;
CREATE TABLE \`depenses_courantes\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`date_depense\` DATE NOT NULL,
  \`categorie\` VARCHAR(150) NOT NULL,
  \`motif\` TEXT NOT NULL,
  \`montant\` DECIMAL(15,2) NOT NULL,
  \`mode_paiement\` VARCHAR(100) NOT NULL,
  \`beneficiaire\` VARCHAR(200) NOT NULL,
  \`numero_piece\` VARCHAR(100) NOT NULL,
  \`statut\` VARCHAR(50) NOT NULL DEFAULT 'Payé',
  \`enregistre_par\` VARCHAR(150) NOT NULL,
  \`observations\` TEXT DEFAULT NULL,
  \`origine_fonds\` ENUM('Exploitation (Cotisations CNPS)', 'Apport personnel du PCA') NOT NULL COMMENT 'Ventilation statutaire COSITI',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_dep_date\` (\`date_depense\`),
  INDEX \`idx_dep_categorie\` (\`categorie\`),
  INDEX \`idx_dep_origine\` (\`origine_fonds\`),
  INDEX \`idx_dep_piece\` (\`numero_piece\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Journal des décaissements et charges d exploitation / apport PCA';
`;

  if (depenses.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Données de la table \`depenses_courantes\` (${depenses.length} enregistrements)\n-- ------------------------------------------------------------\n`;
    sql += `INSERT INTO \`depenses_courantes\` (\n  \`id\`, \`date_depense\`, \`categorie\`, \`motif\`, \`montant\`, \`mode_paiement\`, \`beneficiaire\`,\n  \`numero_piece\`, \`statut\`, \`enregistre_par\`, \`observations\`, \`origine_fonds\`, \`created_at\`\n) VALUES\n`;
    const rows = depenses.map((d) => {
      const resolvedOrigine = d.origineFonds; // origine appliquée et enregistrée par le serveur
      return `  (${escapeMySQL(d.id)}, ${escapeMySQL(d.date)}, ${escapeMySQL(d.categorie)}, ${escapeMySQL(d.motif)}, ${Number(d.montant) || 0}, ${escapeMySQL(d.modePaiement)}, ${escapeMySQL(d.beneficiaire)}, ${escapeMySQL(d.numeroPiece)}, ${escapeMySQL(d.statut)}, ${escapeMySQL(d.enregistrePar)}, ${escapeMySQL(d.observations)}, ${escapeMySQL(resolvedOrigine)}, ${escapeMySQL(d.createdAt || new Date().toISOString())})`;
    });
    sql += rows.join(',\n') + ';\n';
  }

  return sql.trim();
}

/**
 * 7. Table Versements Bancaires
 */
export function generateVersementsSQL(versements: VersementBancaire[]): string {
  let sql = `
-- ------------------------------------------------------------
-- Structure de la table \`versements_bancaires\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`versements_bancaires\`;
CREATE TABLE \`versements_bancaires\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`date_versement\` DATE NOT NULL,
  \`banque\` VARCHAR(150) NOT NULL,
  \`numero_compte\` VARCHAR(100) DEFAULT NULL,
  \`numero_bordereau\` VARCHAR(100) NOT NULL,
  \`montant\` DECIMAL(15,2) NOT NULL,
  \`source_fonds\` VARCHAR(150) NOT NULL,
  \`deposant\` VARCHAR(150) NOT NULL,
  \`enregistre_par\` VARCHAR(150) NOT NULL,
  \`statut\` VARCHAR(50) NOT NULL DEFAULT 'Validé',
  \`observations\` TEXT DEFAULT NULL,
  \`arret_precedent_date\` DATE DEFAULT NULL,
  \`arret_precedent_nom\` VARCHAR(150) DEFAULT NULL,
  \`arret_precedent_matricule\` VARCHAR(50) DEFAULT NULL,
  \`arret_precedent_montant\` DECIMAL(15,2) DEFAULT NULL,
  \`arret_precedent_bordereau\` VARCHAR(100) DEFAULT NULL,
  \`arret_precedent_cotisation_id\` VARCHAR(64) DEFAULT NULL,
  \`arret_cotisation_date\` DATE DEFAULT NULL,
  \`arret_cotisation_nom\` VARCHAR(150) DEFAULT NULL,
  \`arret_cotisation_matricule\` VARCHAR(50) DEFAULT NULL,
  \`arret_cotisation_montant\` DECIMAL(15,2) DEFAULT NULL,
  \`arret_cotisation_id\` VARCHAR(64) DEFAULT NULL,
  \`arret_cotisation_ref\` VARCHAR(100) DEFAULT NULL,
  \`nb_cotisations_incluses\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`cumul_cotisations_incluses\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_vrs_date\` (\`date_versement\`),
  INDEX \`idx_vrs_banque\` (\`banque\`),
  INDEX \`idx_vrs_bordereau\` (\`numero_bordereau\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bordereaux de versement des fonds sur les comptes bancaires';
`;

  if (versements.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Données de la table \`versements_bancaires\` (${versements.length} enregistrements)\n-- ------------------------------------------------------------\n`;
    sql += `INSERT INTO \`versements_bancaires\` (\n  \`id\`, \`date_versement\`, \`banque\`, \`numero_compte\`, \`numero_bordereau\`, \`montant\`,\n  \`source_fonds\`, \`deposant\`, \`enregistre_par\`, \`statut\`, \`observations\`,\n  \`arret_precedent_date\`, \`arret_precedent_nom\`, \`arret_precedent_matricule\`, \`arret_precedent_montant\`, \`arret_precedent_bordereau\`, \`arret_precedent_cotisation_id\`,\n  \`arret_cotisation_date\`, \`arret_cotisation_nom\`, \`arret_cotisation_matricule\`, \`arret_cotisation_montant\`, \`arret_cotisation_id\`, \`arret_cotisation_ref\`,\n  \`nb_cotisations_incluses\`, \`cumul_cotisations_incluses\`, \`created_at\`\n) VALUES\n`;
    const rows = versements.map((v) => {
      return `  (${escapeMySQL(v.id)}, ${escapeMySQL(v.date)}, ${escapeMySQL(v.banque)}, ${escapeMySQL(v.numeroCompte)}, ${escapeMySQL(v.numeroBordereau)}, ${Number(v.montant) || 0}, ${escapeMySQL(v.sourceFonds)}, ${escapeMySQL(v.deposant)}, ${escapeMySQL(v.enregistrePar)}, ${escapeMySQL(v.statut)}, ${escapeMySQL(v.observations)}, ${escapeMySQL(v.arretPrecedentDate)}, ${escapeMySQL(v.arretPrecedentNom)}, ${escapeMySQL(v.arretPrecedentMatricule)}, ${v.arretPrecedentMontant !== undefined ? Number(v.arretPrecedentMontant) : 'NULL'}, ${escapeMySQL(v.arretPrecedentBordereau)}, ${escapeMySQL(v.arretPrecedentCotisationId)}, ${escapeMySQL(v.arretCotisationDate)}, ${escapeMySQL(v.arretCotisationNom)}, ${escapeMySQL(v.arretCotisationMatricule)}, ${v.arretCotisationMontant !== undefined ? Number(v.arretCotisationMontant) : 'NULL'}, ${escapeMySQL(v.arretCotisationId)}, ${escapeMySQL(v.arretCotisationRef)}, ${Number(v.nbCotisationsIncluses) || 0}, ${Number(v.cumulCotisationsIncluses) || 0}, ${escapeMySQL(v.createdAt || new Date().toISOString())})`;
    });
    sql += rows.join(',\n') + ';\n';
  }

  return sql.trim();
}

/**
 * 8. Table Frais Mobile Money
 */
export function generateFraisMobileMoneySQL(frais: FraisMobileMoney[]): string {
  let sql = `
-- ------------------------------------------------------------
-- Structure de la table \`frais_mobile_money\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`frais_mobile_money\`;
CREATE TABLE \`frais_mobile_money\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`date_frais\` DATE NOT NULL,
  \`operateur\` VARCHAR(50) NOT NULL,
  \`type_frais\` VARCHAR(100) NOT NULL,
  \`montant_transaction\` DECIMAL(15,2) NOT NULL,
  \`frais_preleves\` DECIMAL(15,2) NOT NULL,
  \`montant_net\` DECIMAL(15,2) NOT NULL,
  \`reference_transaction\` VARCHAR(100) NOT NULL,
  \`cotisation_id_liee\` VARCHAR(64) DEFAULT NULL,
  \`adherent_concerne\` VARCHAR(150) DEFAULT NULL,
  \`enregistre_par\` VARCHAR(150) NOT NULL,
  \`observations\` TEXT DEFAULT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_fmm_date\` (\`date_frais\`),
  INDEX \`idx_fmm_op\` (\`operateur\`),
  INDEX \`idx_fmm_ref\` (\`reference_transaction\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Commissions et frais prélevés par les opérateurs de paiement mobile';
`;

  if (frais.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Données de la table \`frais_mobile_money\` (${frais.length} enregistrements)\n-- ------------------------------------------------------------\n`;
    sql += `INSERT INTO \`frais_mobile_money\` (\n  \`id\`, \`date_frais\`, \`operateur\`, \`type_frais\`, \`montant_transaction\`, \`frais_preleves\`,\n  \`montant_net\`, \`reference_transaction\`, \`cotisation_id_liee\`, \`adherent_concerne\`,\n  \`enregistre_par\`, \`observations\`, \`created_at\`\n) VALUES\n`;
    const rows = frais.map((f) => {
      return `  (${escapeMySQL(f.id)}, ${escapeMySQL(f.date)}, ${escapeMySQL(f.operateur)}, ${escapeMySQL(f.typeFrais)}, ${Number(f.montantTransaction) || 0}, ${Number(f.fraisPreleves) || 0}, ${Number(f.montantNet) || 0}, ${escapeMySQL(f.referenceTransaction)}, ${escapeMySQL(f.cotisationIdLiee)}, ${escapeMySQL(f.adherentConcerne)}, ${escapeMySQL(f.enregistrePar)}, ${escapeMySQL(f.observations)}, ${escapeMySQL(f.createdAt || new Date().toISOString())})`;
    });
    sql += rows.join(',\n') + ';\n';
  }

  return sql.trim();
}

/**
 * 9. Table Dossiers Allocations & Prestations CNPS
 */
export function generateDossiersSQL(dossiers: DossierAllocations[]): string {
  let sql = `
-- ------------------------------------------------------------
-- Structure de la table \`dossiers_allocations\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`dossiers_allocations\`;
CREATE TABLE \`dossiers_allocations\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`adherent_id\` VARCHAR(64) NOT NULL,
  \`matricule\` VARCHAR(50) NOT NULL,
  \`adherent_nom_prenom\` VARCHAR(200) NOT NULL,
  \`numero_cnps\` VARCHAR(50) NOT NULL,
  \`branche\` VARCHAR(50) NOT NULL DEFAULT 'PRESTATIONS_FAMILIALES',
  \`sous_rubrique_offre\` VARCHAR(150) DEFAULT NULL,
  \`montant_prestation\` DECIMAL(15,2) DEFAULT NULL,
  \`date_immatriculation\` DATE DEFAULT NULL,
  \`statut\` VARCHAR(100) NOT NULL,
  \`nombre_enfants\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`sans_enfant\` TINYINT(1) NOT NULL DEFAULT 0,
  \`certificats_scolarite_fournis\` TINYINT(1) NOT NULL DEFAULT 0,
  \`date_depot\` DATE DEFAULT NULL,
  \`date_transmission\` DATE DEFAULT NULL,
  \`date_relance\` DATE DEFAULT NULL,
  \`date_decision\` DATE DEFAULT NULL,
  \`pieces_json\` JSON DEFAULT NULL,
  \`historique_json\` JSON DEFAULT NULL,
  \`observations\` TEXT DEFAULT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_dos_adherent\` (\`adherent_id\`),
  INDEX \`idx_dos_matricule\` (\`matricule\`),
  INDEX \`idx_dos_statut\` (\`statut\`),
  INDEX \`idx_dos_cnps\` (\`numero_cnps\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Suivi des dossiers de prestations familiales et sécurité sociale CNPS';
`;

  if (dossiers.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Données de la table \`dossiers_allocations\` (${dossiers.length} enregistrements)\n-- ------------------------------------------------------------\n`;
    sql += `INSERT INTO \`dossiers_allocations\` (\n  \`id\`, \`adherent_id\`, \`matricule\`, \`adherent_nom_prenom\`, \`numero_cnps\`, \`branche\`,\n  \`sous_rubrique_offre\`, \`montant_prestation\`, \`date_immatriculation\`, \`statut\`, \`nombre_enfants\`,\n  \`sans_enfant\`, \`certificats_scolarite_fournis\`, \`date_depot\`, \`date_transmission\`, \`date_relance\`,\n  \`date_decision\`, \`pieces_json\`, \`historique_json\`, \`observations\`, \`created_at\`, \`updated_at\`\n) VALUES\n`;
    const rows = dossiers.map((d) => {
      return `  (${escapeMySQL(d.id)}, ${escapeMySQL(d.adherentId)}, ${escapeMySQL(d.matricule)}, ${escapeMySQL(d.adherentNomPrenom)}, ${escapeMySQL(d.numeroCnps)}, ${escapeMySQL(d.branche || 'PRESTATIONS_FAMILIALES')}, ${escapeMySQL(d.sousRubriqueOffre)}, ${d.montantPrestation !== undefined ? Number(d.montantPrestation) : 'NULL'}, ${escapeMySQL(d.dateImmatriculation)}, ${escapeMySQL(d.statut)}, ${Number(d.nombreEnfants) || 0}, ${d.sansEnfant ? 1 : 0}, ${d.certificatsScolariteFournis ? 1 : 0}, ${escapeMySQL(d.dateDepot)}, ${escapeMySQL(d.dateTransmission)}, ${escapeMySQL(d.dateRelance)}, ${escapeMySQL(d.dateDecision)}, ${escapeMySQL(d.pieces || [])}, ${escapeMySQL(d.historique || [])}, ${escapeMySQL(d.observations)}, ${escapeMySQL(d.createdAt || new Date().toISOString())}, ${escapeMySQL(d.updatedAt || new Date().toISOString())})`;
    });
    sql += rows.join(',\n') + ';\n';
  }

  return sql.trim();
}

/**
 * 10. Table Banques Partenaires
 */
export function generateBanquesSQL(banques: string[]): string {
  let sql = `
-- ------------------------------------------------------------
-- Structure de la table \`banques_partenaires\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`banques_partenaires\`;
CREATE TABLE \`banques_partenaires\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`nom_banque\` VARCHAR(150) NOT NULL UNIQUE,
  \`actif\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Liste des institutions bancaires partenaires';
`;

  if (banques.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Données de la table \`banques_partenaires\` (${banques.length} enregistrements)\n-- ------------------------------------------------------------\n`;
    sql += `INSERT INTO \`banques_partenaires\` (\`nom_banque\`, \`actif\`) VALUES\n`;
    const rows = banques.map((b) => `  (${escapeMySQL(b)}, 1)`);
    sql += rows.join(',\n') + ';\n';
  }

  return sql.trim();
}

/**
 * 11. Table Journal des Opérations (Audit trail)
 */
export function generateJournalSQL(journal: JournalOperation[]): string {
  let sql = `
-- ------------------------------------------------------------
-- Structure de la table \`journal_operations\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`journal_operations\`;
CREATE TABLE \`journal_operations\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`date_heure\` DATETIME NOT NULL,
  \`utilisateur\` VARCHAR(150) NOT NULL,
  \`role\` VARCHAR(100) NOT NULL,
  \`type_operation\` VARCHAR(100) NOT NULL,
  \`entite\` VARCHAR(150) NOT NULL,
  \`matricule\` VARCHAR(50) DEFAULT NULL,
  \`description\` TEXT DEFAULT NULL,
  \`details\` TEXT DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_jour_date\` (\`date_heure\`),
  INDEX \`idx_jour_user\` (\`utilisateur\`),
  INDEX \`idx_jour_op\` (\`type_operation\`),
  INDEX \`idx_jour_mat\` (\`matricule\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Piste d audit et traçabilité des opérations sensibles';
`;

  if (journal && journal.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Données de la table \`journal_operations\` (${journal.length} enregistrements)\n-- ------------------------------------------------------------\n`;
    sql += `INSERT INTO \`journal_operations\` (\n  \`id\`, \`date_heure\`, \`utilisateur\`, \`role\`, \`type_operation\`, \`entite\`, \`matricule\`, \`description\`, \`details\`\n) VALUES\n`;
    const rows = journal.map((j) => {
      const d = j.dateHeure || j.date || new Date().toISOString();
      return `  (${escapeMySQL(j.id)}, ${escapeMySQL(d)}, ${escapeMySQL(j.utilisateur)}, ${escapeMySQL(j.role)}, ${escapeMySQL(j.typeOperation || 'OPERATION')}, ${escapeMySQL(j.entite)}, ${escapeMySQL(j.matricule || j.adherentMatricule)}, ${escapeMySQL(j.description)}, ${escapeMySQL(j.details)})`;
    });
    sql += rows.join(',\n') + ';\n';
  }

  return sql.trim();
}

/**
 * 12. Table Employés & Paie (Espace DAF)
 */
export function generateEmployesEtPaieSQL(employes: Employe[] = [], bulletins: BulletinPaie[] = []): string {
  let sql = `
-- ------------------------------------------------------------
-- Structure de la table \`employes\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`employes\`;
CREATE TABLE \`employes\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`matricule\` VARCHAR(50) NOT NULL UNIQUE,
  \`nom\` VARCHAR(100) NOT NULL,
  \`prenom\` VARCHAR(100) NOT NULL,
  \`poste\` VARCHAR(150) NOT NULL,
  \`departement\` VARCHAR(150) DEFAULT NULL,
  \`salaire_base\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  \`actif\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Personnel permanent et contractuels';

-- ------------------------------------------------------------
-- Structure de la table \`bulletins_paie\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`bulletins_paie\`;
CREATE TABLE \`bulletins_paie\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`bulletin_numero\` VARCHAR(100) NOT NULL,
  \`employe_id\` VARCHAR(64) NOT NULL,
  \`mois\` VARCHAR(30) NOT NULL,
  \`periode_libelle\` VARCHAR(50) DEFAULT NULL,
  \`salaire_base\` DECIMAL(15,2) NOT NULL,
  \`total_gains_bruts\` DECIMAL(15,2) NOT NULL,
  \`net_a_payer\` DECIMAL(15,2) NOT NULL,
  \`statut\` VARCHAR(50) NOT NULL DEFAULT 'Brouillon',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_bp_emp\` (\`employe_id\`),
  INDEX \`idx_bp_periode\` (\`mois\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bulletins de salaire édités par le DAF';
`;

  if (employes.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Données de la table \`employes\` (${employes.length} enregistrements)\n-- ------------------------------------------------------------\n`;
    sql += `INSERT INTO \`employes\` (\`id\`, \`matricule\`, \`nom\`, \`prenom\`, \`poste\`, \`departement\`, \`salaire_base\`, \`actif\`) VALUES\n`;
    const rows = employes.map((e) => {
      return `  (${escapeMySQL(e.id)}, ${escapeMySQL(e.matricule)}, ${escapeMySQL(e.nom)}, ${escapeMySQL(e.prenom)}, ${escapeMySQL(e.poste)}, ${escapeMySQL(e.departement)}, ${Number(e.salaireBase) || 0}, ${e.actif ? 1 : 0})`;
    });
    sql += rows.join(',\n') + ';\n';
  }

  if (bulletins.length > 0) {
    sql += `\n-- ------------------------------------------------------------\n-- Données de la table \`bulletins_paie\` (${bulletins.length} enregistrements)\n-- ------------------------------------------------------------\n`;
    sql += `INSERT INTO \`bulletins_paie\` (\`id\`, \`bulletin_numero\`, \`employe_id\`, \`mois\`, \`periode_libelle\`, \`salaire_base\`, \`total_gains_bruts\`, \`net_a_payer\`, \`statut\`) VALUES\n`;
    const rows = bulletins.map((b) => {
      return `  (${escapeMySQL(b.id)}, ${escapeMySQL(b.bulletinNumero || '')}, ${escapeMySQL(b.employeId)}, ${escapeMySQL(b.mois)}, ${escapeMySQL(b.periodeLibelle || '')}, ${Number(b.salaireBase) || 0}, ${Number(b.totalGainsBruts) || 0}, ${Number(b.netAPayer) || 0}, ${escapeMySQL(b.statut)})`;
    });
    sql += rows.join(',\n') + ';\n';
  }

  return sql.trim();
}

/**
 * Génère le script SQL complet consolidé pour MySQL
 */
export function generateFullMySQLDump(data: MySQLAppData): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR');
  const timeStr = now.toLocaleTimeString('fr-FR');

  const banquesList = data.banques && data.banques.length > 0 ? data.banques : [
    'BICICI',
    'Ecobank Côte d\'Ivoire',
    'SGCI (Société Générale)',
    'BOA CI (Bank of Africa)',
    'NSIA Banque',
    'BNI (Banque Nationale d\'Investissement)',
    'Coris Bank',
  ];

  return `/* =============================================================================
 * SCRIPT OFFICIEL D'EXPORTATION BASE DE DONNÉES MYSQL
 * Organisation : ${data.parametres.nomOrganisation || 'COSITI'}
 * Sigle        : ${data.parametres.sigle || 'COSITI'}
 * Date d'export: ${dateStr} à ${timeStr}
 * SGBD Cible   : MySQL 5.7+ / MySQL 8.0+ / MariaDB 10.3+
 * Encodage     : UTF-8 (utf8mb4) / utf8mb4_unicode_ci
 * =============================================================================
 */

-- Configuration initiale de la session d'importation
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- Création optionnelle de la base de données
CREATE DATABASE IF NOT EXISTS \`cositi_ci\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`cositi_ci\`;

${generateParametresSQL(data.parametres)}

${generateGestionnairesSQL(data.gestionnaires || [])}

${generateUtilisateursSQL(data.utilisateurs || [])}

${generateAdherentsSQL(data.adherents || [])}

${generateCotisationsSQL(data.cotisations || [])}

${generateDepensesSQL(data.depenses || [])}

${generateVersementsSQL(data.versements || [])}

${generateFraisMobileMoneySQL(data.fraisMobileMoney || [])}

${generateDossiersSQL(data.dossiers || [])}

${generateBanquesSQL(banquesList)}

${generateEmployesEtPaieSQL(data.employes || [], data.bulletinsPaie || [])}

${generateJournalSQL(data.journal || [])}

-- Rétablissement des contraintes et finalisation de la transaction
COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- =============================================================================
-- FIN DU SCRIPT D'EXPORTATION MYSQL COSITI
-- =============================================================================
`;
}

/**
 * Découpe les tables en fichiers SQL individuels
 */
export function generateAllTableSQLFiles(data: MySQLAppData): SQLTableFile[] {
  const banquesList = data.banques && data.banques.length > 0 ? data.banques : [
    'BICICI',
    'Ecobank Côte d\'Ivoire',
    'SGCI (Société Générale)',
    'BOA CI (Bank of Africa)',
    'NSIA Banque',
    'BNI (Banque Nationale d\'Investissement)',
    'Coris Bank',
  ];

  const header = (title: string) => `/* ------------------------------------------------------------
 * TABLE MYSQL : ${title}
 * Export COSITI - Généré le ${new Date().toLocaleDateString('fr-FR')}
 * Encodage : UTF-8 (utf8mb4)
 * ------------------------------------------------------------
 */
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

`;

  const footer = `\nSET FOREIGN_KEY_CHECKS = 1;\n`;

  return [
    {
      filename: '01_parametres.sql',
      tableName: 'parametres',
      label: '1. Paramètres Généraux',
      description: 'Configuration générale, coordonnées, seuils et code de sécurité',
      content: header('parametres') + generateParametresSQL(data.parametres) + footer,
      count: 1,
    },
    {
      filename: '02_gestionnaires_portefeuille.sql',
      tableName: 'gestionnaires_portefeuille',
      label: '2. Gestionnaires de Portefeuille',
      description: 'Gestionnaires de zones et suivi des portefeuilles adhérents',
      content: header('gestionnaires_portefeuille') + generateGestionnairesSQL(data.gestionnaires || []) + footer,
      count: (data.gestionnaires || []).length,
    },
    {
      filename: '03_utilisateurs.sql',
      tableName: 'utilisateurs',
      label: '3. Utilisateurs & Droits',
      description: 'Comptes utilisateurs, niveaux d\'accès et rôles de gouvernance',
      content: header('utilisateurs') + generateUtilisateursSQL(data.utilisateurs || []) + footer,
      count: (data.utilisateurs || []).length,
    },
    {
      filename: '04_adherents.sql',
      tableName: 'adherents',
      label: '4. Répertoire des Adhérents',
      description: 'Fiches adhérents, numéros CNPS, tarifs, contacts et statut immatriculation',
      content: header('adherents') + generateAdherentsSQL(data.adherents || []) + footer,
      count: (data.adherents || []).length,
    },
    {
      filename: '05_cotisations.sql',
      tableName: 'cotisations',
      label: '5. Cotisations & Encaissements',
      description: 'Journal des cotisations perçues, modes de paiement et régularisations',
      content: header('cotisations') + generateCotisationsSQL(data.cotisations || []) + footer,
      count: (data.cotisations || []).length,
    },
    {
      filename: '06_depenses_courantes.sql',
      tableName: 'depenses_courantes',
      label: '6. Dépenses & Décaissements',
      description: 'Décaissements ventilés par provenance (Exploitation CNPS / Apport PCA)',
      content: header('depenses_courantes') + generateDepensesSQL(data.depenses || []) + footer,
      count: (data.depenses || []).length,
    },
    {
      filename: '07_versements_bancaires.sql',
      tableName: 'versements_bancaires',
      label: '7. Versements Bancaires',
      description: 'Bordereaux de remise bancaire et traçabilité des points d\'arrêt',
      content: header('versements_bancaires') + generateVersementsSQL(data.versements || []) + footer,
      count: (data.versements || []).length,
    },
    {
      filename: '08_frais_mobile_money.sql',
      tableName: 'frais_mobile_money',
      label: '8. Frais Mobile Money',
      description: 'Commissions prélevées par Orange Money, Wave, MTN et Moov',
      content: header('frais_mobile_money') + generateFraisMobileMoneySQL(data.fraisMobileMoney || []) + footer,
      count: (data.fraisMobileMoney || []).length,
    },
    {
      filename: '09_dossiers_allocations.sql',
      tableName: 'dossiers_allocations',
      label: '9. Dossiers Allocations & CNPS',
      description: 'Dossiers de sécurité sociale, pièces requises et statut de traitement',
      content: header('dossiers_allocations') + generateDossiersSQL(data.dossiers || []) + footer,
      count: (data.dossiers || []).length,
    },
    {
      filename: '10_banques_partenaires.sql',
      tableName: 'banques_partenaires',
      label: '10. Banques Partenaires',
      description: 'Institutions financières partenaires agréées',
      content: header('banques_partenaires') + generateBanquesSQL(banquesList) + footer,
      count: banquesList.length,
    },
    {
      filename: '11_employes_et_paie.sql',
      tableName: 'employes_et_paie',
      label: '11. Employés & Bulletins de Paie',
      description: 'Personnel de la structure et bulletins de salaire émis par le DAF',
      content: header('employes_et_paie') + generateEmployesEtPaieSQL(data.employes || [], data.bulletinsPaie || []) + footer,
      count: (data.employes || []).length + (data.bulletinsPaie || []).length,
    },
    {
      filename: '12_journal_operations.sql',
      tableName: 'journal_operations',
      label: '12. Journal d\'Audit & Opérations',
      description: 'Historique des actions sensibles et traçabilité administrative',
      content: header('journal_operations') + generateJournalSQL(data.journal || []) + footer,
      count: (data.journal || []).length,
    },
  ];
}

/**
 * Notice d'instructions d'importation MySQL
 */
export function generateMySQLImportReadme(): string {
  return `# GUIDE D'IMPORTATION DE LA BASE DE DONNÉES MYSQL - COSITI

Ce dossier contient l'exportation complète des données de la coopérative **COSITI** prête à être importée dans n'importe quel serveur **MySQL 5.7+**, **MySQL 8.0+** ou **MariaDB 10.3+**.

---

## 1. Structure des Fichiers

* \`cositi_database_mysql_dump.sql\` : **Dump SQL unique et consolidé**. Contient l'ensemble des 12 tables et toutes les données avec clés primaires, index et contraintes.
* \`tables/\` : Répertoire contenant chaque table dans un fichier SQL séparé :
  - \`01_parametres.sql\` : Configuration, coordonnées, seuil 15 000 FCFA.
  - \`02_gestionnaires_portefeuille.sql\` : Gestionnaires de secteur.
  - \`03_utilisateurs.sql\` : Utilisateurs et droits d'accès.
  - \`04_adherents.sql\` : Fiches adhérents, numéros CNPS, tarifs.
  - \`05_cotisations.sql\` : Journal des cotisations perçues.
  - \`06_depenses_courantes.sql\` : Décaissements (Exploitation CNPS / Apport PCA).
  - \`07_versements_bancaires.sql\` : Remises bancaires et points d'arrêt.
  - \`08_frais_mobile_money.sql\` : Frais opérateurs Orange, Wave, MTN, Moov.
  - \`09_dossiers_allocations.sql\` : Prestations familiales et dossiers CNPS.
  - \`10_banques_partenaires.sql\` : Banques partenaires.
  - \`11_employes_et_paie.sql\` : Employés et paie du personnel.
  - \`12_journal_operations.sql\` : Piste d'audit et historique des opérations.

---

## 2. Méthode 1 : Import via phpMyAdmin (Recommandé pour cPanel, Laragon, XAMPP, Wamp)

1. Connectez-vous à votre interface **phpMyAdmin**.
2. Créez une nouvelle base de données nommée \`cositi_ci\` (Interclassement : \`utf8mb4_unicode_ci\`).
3. Cliquez sur la base \`cositi_ci\` dans le volet de gauche.
4. Cliquez sur l'onglet **Importer** en haut.
5. Cliquez sur **Parcourir** et sélectionnez le fichier \`cositi_database_mysql_dump.sql\`.
6. Laissez le jeu de caractères sur **utf-8** et cliquez sur **Exécuter** en bas de page.
7. Un message vert confirme : *"L'importation a réussi, X requêtes exécutées."*

---

## 3. Méthode 2 : Ligne de commande MySQL (CLI)

Ouvrez un terminal ou invite de commande :

\`\`\`bash
# 1. Se connecter à MySQL et créer la base de données
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS cositi_ci CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Importer le dump consolidé
mysql -u root -p cositi_ci < cositi_database_mysql_dump.sql
\`\`\`

---

## 4. Méthode 3 : Import table par table

Pour importer uniquement une table spécifique (ex. les adhérents ou les cotisations) :

\`\`\`bash
mysql -u root -p cositi_ci < tables/04_adherents.sql
mysql -u root -p cositi_ci < tables/05_cotisations.sql
\`\`\`

---

## 5. Exemple de Connexion PHP / Node.js

### Exemple PHP (PDO)
\`\`\`php
<?php
$host = 'localhost';
$db   = 'cositi_ci';
$user = 'votre_utilisateur';
$pass = 'votre_mot_de_passe';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
\`\`\`

### Exemple Node.js (mysql2)
\`\`\`javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'votre_utilisateur',
  password: 'votre_mot_de_passe',
  database: 'cositi_ci',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
});
\`\`\`

---
*Document édité automatiquement par le système COSITI - Tous droits réservés.*
`;
}

/**
 * Déclenche le téléchargement d'un fichier texte / SQL dans le navigateur
 */
export function downloadTextFile(filename: string, text: string, mimeType = 'application/sql;charset=utf-8;'): void {
  logEvent('EXPORT_DONNEES', 'Export fichier : ' + filename);
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Télécharge l'archive ZIP complète contenant le dump consolidé et tous les fichiers individuels
 */
export async function downloadAllTablesZip(data: MySQLAppData, zipName = 'COSITI_Export_MySQL_Complet'): Promise<boolean> {
  try {
    const zip = new JSZip();

    // 1. Dump consolidé à la racine du zip
    const fullDump = generateFullMySQLDump(data);
    zip.file('cositi_database_mysql_dump.sql', fullDump);

    // 2. Fichier README instructions
    const readme = generateMySQLImportReadme();
    zip.file('README_IMPORT_MYSQL.md', readme);

    // 3. Dossier avec chaque table séparée
    const tablesFolder = zip.folder('tables');
    const tableFiles = generateAllTableSQLFiles(data);
    tableFiles.forEach((file) => {
      if (tablesFolder) {
        tablesFolder.file(file.filename, file.content);
      }
    });

    // 4. Génération du blob ZIP et téléchargement
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const finalZipName = `${zipName}_${dateStr}.zip`;

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalZipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (err) {
    console.error('Erreur lors de la création du fichier ZIP MySQL:', err);
    return false;
  }
}
