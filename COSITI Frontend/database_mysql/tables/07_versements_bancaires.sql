/* ------------------------------------------------------------
 * TABLE MYSQL : versements_bancaires
 * Export COSITI - Généré le 19/10/2026
 * Encodage : UTF-8 (utf8mb4)
 * ------------------------------------------------------------
 */
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Structure de la table `versements_bancaires`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `versements_bancaires`;
CREATE TABLE `versements_bancaires` (
  `id` VARCHAR(64) NOT NULL,
  `date_versement` DATE NOT NULL,
  `banque` VARCHAR(150) NOT NULL,
  `numero_compte` VARCHAR(100) DEFAULT NULL,
  `numero_bordereau` VARCHAR(100) NOT NULL,
  `montant` DECIMAL(15,2) NOT NULL,
  `source_fonds` VARCHAR(150) NOT NULL,
  `deposant` VARCHAR(150) NOT NULL,
  `enregistre_par` VARCHAR(150) NOT NULL,
  `statut` VARCHAR(50) NOT NULL DEFAULT 'Validé',
  `observations` TEXT DEFAULT NULL,
  `arret_precedent_date` DATE DEFAULT NULL,
  `arret_precedent_nom` VARCHAR(150) DEFAULT NULL,
  `arret_precedent_matricule` VARCHAR(50) DEFAULT NULL,
  `arret_precedent_montant` DECIMAL(15,2) DEFAULT NULL,
  `arret_precedent_bordereau` VARCHAR(100) DEFAULT NULL,
  `arret_precedent_cotisation_id` VARCHAR(64) DEFAULT NULL,
  `arret_cotisation_date` DATE DEFAULT NULL,
  `arret_cotisation_nom` VARCHAR(150) DEFAULT NULL,
  `arret_cotisation_matricule` VARCHAR(50) DEFAULT NULL,
  `arret_cotisation_montant` DECIMAL(15,2) DEFAULT NULL,
  `arret_cotisation_id` VARCHAR(64) DEFAULT NULL,
  `arret_cotisation_ref` VARCHAR(100) DEFAULT NULL,
  `nb_cotisations_incluses` INT UNSIGNED NOT NULL DEFAULT 0,
  `cumul_cotisations_incluses` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_vrs_date` (`date_versement`),
  INDEX `idx_vrs_banque` (`banque`),
  INDEX `idx_vrs_bordereau` (`numero_bordereau`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bordereaux de versement des fonds sur les comptes bancaires';

-- ------------------------------------------------------------
-- Données de la table `versements_bancaires` (3 enregistrements)
-- ------------------------------------------------------------
INSERT INTO `versements_bancaires` (
  `id`, `date_versement`, `banque`, `numero_compte`, `numero_bordereau`, `montant`,
  `source_fonds`, `deposant`, `enregistre_par`, `statut`, `observations`,
  `arret_precedent_date`, `arret_precedent_nom`, `arret_precedent_matricule`, `arret_precedent_montant`, `arret_precedent_bordereau`, `arret_precedent_cotisation_id`,
  `arret_cotisation_date`, `arret_cotisation_nom`, `arret_cotisation_matricule`, `arret_cotisation_montant`, `arret_cotisation_id`, `arret_cotisation_ref`,
  `nb_cotisations_incluses`, `cumul_cotisations_incluses`, `created_at`
) VALUES
  ('vrs-1', '2026-01-31', 'Ecobank Côte d\'Ivoire', 'CI059 01001 12145678901 44', 'ECO-BORD-2026-014', 150000, 'Recettes Cotisations Adhérents', 'OUATTARA Salif (DAF)', 'OUATTARA Salif (DAF)', 'Validé', 'Dépôt des espèces collectées au cours du mois de janvier 2026.', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-30', 'TRAORÉ Moussa', 'COSITI-0001', 4900, 'cot-102', 'WAVE-TX-9921', 15, 150000, '2026-01-31T15:30:00.000Z'),
  ('vrs-2', '2026-02-28', 'Bank of Africa (BOA CI)', 'CI034 01002 00192837465 18', 'BOA-VERSEMENT-2026-089', 125000, 'Recettes Cotisations Adhérents', 'OUATTARA Salif (DAF)', 'OUATTARA Salif (DAF)', 'Validé', 'Remise d\'espèces à l\'agence BOA Plateau Dokui.', '2026-01-30', 'TRAORÉ Moussa', 'COSITI-0001', 4900, 'ECO-BORD-2026-014', 'cot-102', '2026-02-28', 'TRAORÉ Moussa', 'COSITI-0001', 1400, 'cot-104', 'REC-009-FEB', 18, 125000, '2026-02-28T14:45:00.000Z'),
  ('vrs-3', '2026-03-05', 'Ecobank Côte d\'Ivoire', 'CI059 01001 12145678901 44', 'ECO-BORD-2026-038', 85000, 'Retraits Mobile Money', 'OUATTARA Salif (DAF)', 'OUATTARA Salif (DAF)', 'Validé', 'Virement vers le compte bancaire principal après décharge des comptes mobiles.', '2026-02-28', 'TRAORÉ Moussa', 'COSITI-0001', 1400, 'BOA-VERSEMENT-2026-089', 'cot-104', '2026-03-04', 'KOUAMÉ Ahou Félicité', 'COSITI-0002', 10000, 'cot-203', 'REC-018-MAR', 9, 85000, '2026-03-05T12:00:00.000Z');
SET FOREIGN_KEY_CHECKS = 1;
