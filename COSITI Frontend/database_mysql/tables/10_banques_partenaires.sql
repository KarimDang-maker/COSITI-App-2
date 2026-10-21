/* ------------------------------------------------------------
 * TABLE MYSQL : banques_partenaires
 * Export COSITI - Généré le 19/10/2026
 * Encodage : UTF-8 (utf8mb4)
 * ------------------------------------------------------------
 */
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Structure de la table `banques_partenaires`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `banques_partenaires`;
CREATE TABLE `banques_partenaires` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom_banque` VARCHAR(150) NOT NULL UNIQUE,
  `actif` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Liste des institutions bancaires partenaires';

-- ------------------------------------------------------------
-- Données de la table `banques_partenaires` (8 enregistrements)
-- ------------------------------------------------------------
INSERT INTO `banques_partenaires` (`nom_banque`, `actif`) VALUES
  ('BICICI', 1),
  ('Ecobank Côte d\'Ivoire', 1),
  ('SGCI (Société Générale)', 1),
  ('BOA CI (Bank of Africa)', 1),
  ('NSIA Banque', 1),
  ('BNI (Banque Nationale d\'Investissement)', 1),
  ('Coris Bank', 1),
  ('Autre institution bancaire', 1);
SET FOREIGN_KEY_CHECKS = 1;
