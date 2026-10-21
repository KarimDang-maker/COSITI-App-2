/* ------------------------------------------------------------
 * TABLE MYSQL : utilisateurs
 * Export COSITI - Généré le 19/10/2026
 * Encodage : UTF-8 (utf8mb4)
 * ------------------------------------------------------------
 */
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Structure de la table `utilisateurs`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `utilisateurs`;
CREATE TABLE `utilisateurs` (
  `id` VARCHAR(64) NOT NULL,
  `nom` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `role` VARCHAR(100) NOT NULL,
  `type_acces` VARCHAR(150) NOT NULL,
  `titre_complet` VARCHAR(200) DEFAULT NULL,
  `poste` VARCHAR(150) DEFAULT NULL,
  `description_acces` TEXT DEFAULT NULL,
  `telephone` VARCHAR(50) DEFAULT NULL,
  `actif` TINYINT(1) NOT NULL DEFAULT 1,
  `code_pin` VARCHAR(20) DEFAULT NULL,
  `code_acces` VARCHAR(50) DEFAULT NULL,
  `dernier_acces` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_role` (`role`),
  INDEX `idx_user_actif` (`actif`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Comptes utilisateurs et rôles du système';

-- ------------------------------------------------------------
-- Données de la table `utilisateurs` (6 enregistrements)
-- ------------------------------------------------------------
INSERT INTO `utilisateurs` (
  `id`, `nom`, `email`, `role`, `type_acces`, `titre_complet`, `poste`, `description_acces`, `telephone`, `actif`, `code_pin`, `code_acces`, `dernier_acces`
) VALUES
  ('u-dg', 'KONÉ Lassina', 'dg@cositi-ci.org', 'DG', 'Administrateur et consultation', 'Directeur Général (DG)', NULL, 'Administration générale, gouvernance exécutive et supervision globale', '+225 07 08 11 22 33', 1, NULL, NULL, 'En ligne maintenant'),
  ('u-dga', 'DIABATÉ Mariam', 'dga@cositi-ci.org', 'DGA', 'Administrateur et consultation', 'Directrice Générale Adjointe (DGA)', NULL, 'Coordination opérationnelle, administration et consultation globale', '+225 07 09 22 33 44', 1, NULL, NULL, 'Aujourd\'hui à 08:45'),
  ('u-daf', 'N\'GUESSAN Koffi Bernard', 'daf@cositi-ci.org', 'DAF', 'Administrateur, enregistrement et consultation', 'Directeur Administratif et Financier (DAF)', NULL, 'Gestion financière, enregistrement des cotisations, consultation globale et administration', '+225 05 45 67 89 01', 1, NULL, NULL, 'Aujourd\'hui à 09:10'),
  ('u-caissiere', 'BAKAYOKO Awa', 'caisse@cositi-ci.org', 'Caissière & Agent d\'enregistrement', 'Enregistrement', 'Caissière Principale & Agent d\'enregistrement', NULL, 'Encaissement des cotisations journalières, impression des reçus et adhésions', '+225 01 23 45 67 89', 1, NULL, NULL, 'En ligne maintenant'),
  ('u-pca', 'KOUADIO Yao Michel', 'pca@cositi-ci.org', 'PCA', 'Consultation', 'Président du Conseil d\'Administration (PCA)', NULL, 'Supervision stratégique, contrôle des indicateurs et consultation générale', '+225 07 77 88 99 00', 1, NULL, NULL, 'Hier à 17:30'),
  ('u-cs', 'TRAORÉ Souleymane', 'surveillance@cositi-ci.org', 'Conseil de Surveillance', 'Consultation', 'Président du Conseil de Surveillance', NULL, 'Audit des comptes, contrôle de conformité et inspection des opérations', '+225 05 55 66 77 88', 1, NULL, NULL, 'Aujourd\'hui à 07:50');
SET FOREIGN_KEY_CHECKS = 1;
