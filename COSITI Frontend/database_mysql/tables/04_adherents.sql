/* ------------------------------------------------------------
 * TABLE MYSQL : adherents
 * Export COSITI - Généré le 19/10/2026
 * Encodage : UTF-8 (utf8mb4)
 * ------------------------------------------------------------
 */
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Structure de la table `adherents`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `adherents`;
CREATE TABLE `adherents` (
  `id` VARCHAR(64) NOT NULL,
  `matricule` VARCHAR(50) NOT NULL UNIQUE,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `sexe` ENUM('M', 'F') NOT NULL DEFAULT 'M',
  `date_naissance` DATE DEFAULT NULL,
  `lieu_naissance` VARCHAR(150) DEFAULT NULL,
  `cni` VARCHAR(100) DEFAULT NULL,
  `telephone` VARCHAR(50) NOT NULL,
  `adresse` TEXT DEFAULT NULL,
  `profession` VARCHAR(150) NOT NULL,
  `date_adhesion` DATE NOT NULL,
  `statut` VARCHAR(50) NOT NULL DEFAULT 'Actif',
  `statut_immatriculation` VARCHAR(50) NOT NULL DEFAULT 'Non immatriculé',
  `date_immatriculation` DATE DEFAULT NULL,
  `numero_cnps` VARCHAR(50) DEFAULT NULL,
  `observations` TEXT DEFAULT NULL,
  `tarif_journalier` DECIMAL(10,2) NOT NULL DEFAULT 700.00,
  `gestionnaire_id` VARCHAR(64) DEFAULT NULL,
  `gestionnaire_nom` VARCHAR(150) DEFAULT NULL,
  `nombre_enfants` INT UNSIGNED NOT NULL DEFAULT 0,
  `sans_enfant` TINYINT(1) NOT NULL DEFAULT 0,
  `salaire_cotisable_cnps` DECIMAL(15,2) NOT NULL DEFAULT 60000.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_adh_matricule` (`matricule`),
  INDEX `idx_adh_statut` (`statut`),
  INDEX `idx_adh_statut_cnps` (`statut_immatriculation`),
  INDEX `idx_adh_gestionnaire` (`gestionnaire_id`),
  INDEX `idx_adh_cnps` (`numero_cnps`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Répertoire officiel des adhérents de la coopérative';

-- ------------------------------------------------------------
-- Données de la table `adherents` (7 enregistrements)
-- ------------------------------------------------------------
INSERT INTO `adherents` (
  `id`, `matricule`, `nom`, `prenom`, `sexe`, `date_naissance`, `lieu_naissance`, `cni`,
  `telephone`, `adresse`, `profession`, `date_adhesion`, `statut`, `statut_immatriculation`,
  `date_immatriculation`, `numero_cnps`, `observations`, `tarif_journalier`, `gestionnaire_id`,
  `gestionnaire_nom`, `nombre_enfants`, `sans_enfant`, `salaire_cotisable_cnps`, `created_at`, `updated_at`
) VALUES
  ('adh-1', 'COSITI-0001', 'TRAORÉ', 'Moussa', 'M', '1984-06-12', 'Bouaké', 'CI0029384721', '+225 07 11 22 33 44', 'Abobo BC, Marché Anador', 'Menuisier ébéniste', '2026-01-10', 'Actif', 'Éligible (seuil atteint)', NULL, NULL, 'Atelier de menuiserie artisanale. A atteint le seuil requis de 15 000 FCFA. À immatriculer CNPS.', 700, 'gp-001', 'MBIDA François (GP-001)', 0, 0, 60000, '2026-01-10T09:00:00.000Z', '2026-03-01T10:00:00.000Z'),
  ('adh-2', 'COSITI-0002', 'KOUAMÉ', 'Ahou Félicité', 'F', '1990-03-24', 'Yamoussoukro', 'CI0038495012', '+225 05 22 33 44 55', 'Adjamé, Marché Gouro, Allée 4', 'Commerçante de vivriers en gros', '2026-01-15', 'Actif', 'Immatriculé', '2026-02-18', 'CNPS-2026-98432', 'Très assidue dans ses versements. Doit compléter son dossier d\'allocations familiales (certificats de scolarité de 3 enfants).', 1000, 'gp-001', 'MBIDA François (GP-001)', 0, 0, 60000, '2026-01-15T11:20:00.000Z', '2026-02-18T14:30:00.000Z'),
  ('adh-3', 'COSITI-0003', 'DIALLO', 'Oumar', 'M', '1987-11-05', 'Man', 'CI0018293740', '+225 01 33 44 55 66', 'Yopougon Gesco', 'Chauffeur de taxi communal', '2026-01-20', 'Actif', 'Non immatriculé', NULL, NULL, 'Cotisations irrégulières ce mois-ci pour cause de réparation mécanique du véhicule.', 700, 'gp-002', 'KAMGA Madeleine (GP-002)', 0, 0, 60000, '2026-01-20T14:00:00.000Z', '2026-02-25T16:00:00.000Z'),
  ('adh-4', 'COSITI-0004', 'BAKAYOKO', 'Salimata', 'F', '1993-08-19', 'Korhogo', 'CI0048291039', '+225 07 44 55 66 77', 'Koumassi Remblais', 'Couturière & Styliste broderie', '2026-02-01', 'Actif', 'Éligible (seuil atteint)', NULL, NULL, 'A franchi le seuil de 15 000 FCFA lors du point de contrôle. Dossier CNPS à transmettre d\'urgence.', 1000, 'gp-002', 'KAMGA Madeleine (GP-002)', 0, 0, 60000, '2026-02-01T10:00:00.000Z', '2026-03-02T11:15:00.000Z'),
  ('adh-5', 'COSITI-0005', 'KONÉ', 'Ibrahim', 'M', '1995-12-01', 'Daloa', 'CI0059382710', '+225 05 55 66 77 88', 'Treichville Arras 3', 'Mécanicien moto', '2026-02-15', 'Actif', 'Non immatriculé', NULL, NULL, 'Nouvel adhérent motivé, cotise ponctuellement par Wave.', 700, 'gp-003', 'NGUEMA Patrick (GP-003)', 0, 0, 60000, '2026-02-15T08:30:00.000Z', '2026-03-05T09:00:00.000Z'),
  ('adh-6', 'COSITI-0006', 'YAO', 'Estelle N\'Goran', 'F', '1998-04-14', 'Dimbokro', 'CI0068472910', '+225 01 66 77 88 99', 'Cocody Angré 8ème Tranche', 'Coiffeuse esthéticienne', '2026-02-10', 'Actif', 'Non immatriculé', NULL, NULL, 'En retard critique de paiement. Relance téléphonique effectuée le 28 février.', 700, NULL, NULL, 0, 0, 60000, '2026-02-10T15:00:00.000Z', '2026-02-10T15:00:00.000Z'),
  ('adh-7', 'COSITI-0007', 'BAMBA', 'Seydou', 'M', '1980-09-30', 'Odienné', 'CI0078392014', '+225 07 77 88 99 00', 'Port-Bouët Anani', 'Maraîcher périurbain', '2026-01-05', 'Actif', 'Immatriculé', '2026-02-05', 'CNPS-2026-55102', 'Dossier d\'allocations familiales complet et déposé à l\'agence CNPS de Marcory.', 1000, NULL, NULL, 0, 0, 60000, '2026-01-05T08:00:00.000Z', '2026-03-01T16:00:00.000Z');
SET FOREIGN_KEY_CHECKS = 1;
