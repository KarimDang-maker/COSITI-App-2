/* ------------------------------------------------------------
 * TABLE MYSQL : parametres
 * Export COSITI - Généré le 19/10/2026
 * Encodage : UTF-8 (utf8mb4)
 * ------------------------------------------------------------
 */
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Structure de la table `parametres`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `parametres`;
CREATE TABLE `parametres` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom_organisation` VARCHAR(255) NOT NULL,
  `sigle` VARCHAR(50) NOT NULL,
  `slogan` VARCHAR(255) DEFAULT NULL,
  `adresse` VARCHAR(255) DEFAULT NULL,
  `telephone` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `seuil_immatriculation` DECIMAL(15,2) NOT NULL DEFAULT 15000.00,
  `montants_cotisation_defauts` VARCHAR(100) DEFAULT '[700, 1000]',
  `jours_verification_cycle` VARCHAR(100) DEFAULT '[15, 30]',
  `seuil_jours_retard_alerte` INT NOT NULL DEFAULT 10,
  `code_confirmation_securite` VARCHAR(50) NOT NULL DEFAULT '0000',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuration générale de la coopérative';

-- ------------------------------------------------------------
-- Données de la table `parametres`
-- ------------------------------------------------------------
INSERT INTO `parametres` (
  `id`, `nom_organisation`, `sigle`, `slogan`, `adresse`, `telephone`, `email`,
  `seuil_immatriculation`, `montants_cotisation_defauts`, `jours_verification_cycle`,
  `seuil_jours_retard_alerte`, `code_confirmation_securite`
) VALUES (
  1,
  'COSITI — Coopérative du Secteur Informel et des Travailleurs Indépendants',
  'COSITI',
  'Solidarité • Prévoyance • Dignité des Travailleurs Informels',
  'Avenue des Banques, Quartier Bonanjo, B.P. 3140 Douala, Cameroun',
  '+237 233 42 15 89 / +237 677 88 99 00',
  'contact@cositi-cameroun.cm',
  15000,
  '[700,1000]',
  '[15,30]',
  10,
  '0000'
);
SET FOREIGN_KEY_CHECKS = 1;
