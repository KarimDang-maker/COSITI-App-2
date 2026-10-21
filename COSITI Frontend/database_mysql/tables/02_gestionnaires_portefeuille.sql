/* ------------------------------------------------------------
 * TABLE MYSQL : gestionnaires_portefeuille
 * Export COSITI - Généré le 19/10/2026
 * Encodage : UTF-8 (utf8mb4)
 * ------------------------------------------------------------
 */
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Structure de la table `gestionnaires_portefeuille`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `gestionnaires_portefeuille`;
CREATE TABLE `gestionnaires_portefeuille` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `telephone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `zone_secteur` VARCHAR(150) NOT NULL,
  `statut` ENUM('Actif', 'Inactif') NOT NULL DEFAULT 'Actif',
  `objectifs_recouvrement_mensuel` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_gp_statut` (`statut`),
  INDEX `idx_gp_zone` (`zone_secteur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Gestionnaires de portefeuille et zones de recouvrement';

-- ------------------------------------------------------------
-- Données de la table `gestionnaires_portefeuille` (3 enregistrements)
-- ------------------------------------------------------------
INSERT INTO `gestionnaires_portefeuille` (
  `id`, `code`, `nom`, `prenom`, `telephone`, `email`, `zone_secteur`, `statut`, `objectifs_recouvrement_mensuel`, `notes`, `created_at`, `updated_at`
) VALUES
  ('gp-001', 'GP-001', 'MBIDA', 'François', '+237 671 23 45 67', 'f.mbida@cositi-cameroun.cm', 'Yaoundé — Marché Mokolo & Centre Commercial', 'Actif', 600000, 'En charge du portefeuille des commerçants et transporteurs urbains de Yaoundé', '2026-01-05T08:00:00.000Z', '2026-01-05T08:00:00.000Z'),
  ('gp-002', 'GP-002', 'KAMGA', 'Madeleine', '+237 699 45 67 89', 'm.kamga@cositi-cameroun.cm', 'Douala — Marché Sandaga & Port Fluvial', 'Actif', 750000, 'Suivi du portefeuille des artisans couturiers, coiffeurs et revendeuses', '2026-01-05T08:30:00.000Z', '2026-01-05T08:30:00.000Z'),
  ('gp-003', 'GP-003', 'NGUEMA', 'Patrick', '+237 677 11 22 33', 'p.nguema@cositi-cameroun.cm', 'Bafoussam — Secteur Artisanal & Maraîchers', 'Actif', 500000, 'Portefeuille des producteurs périurbains et artisans du bois', '2026-01-06T09:00:00.000Z', '2026-01-06T09:00:00.000Z');
SET FOREIGN_KEY_CHECKS = 1;
