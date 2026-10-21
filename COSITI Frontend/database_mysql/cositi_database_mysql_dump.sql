/* =============================================================================
 * SCRIPT OFFICIEL D'EXPORTATION BASE DE DONNÉES MYSQL
 * Organisation : COSITI — Coopérative du Secteur Informel et des Travailleurs Indépendants
 * Sigle        : COSITI
 * Date d'export: 19/10/2026 à 11:17:21
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
CREATE DATABASE IF NOT EXISTS `cositi_ci` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `cositi_ci`;

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

-- ------------------------------------------------------------
-- Structure de la table `cotisations`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `cotisations`;
CREATE TABLE `cotisations` (
  `id` VARCHAR(64) NOT NULL,
  `adherent_id` VARCHAR(64) NOT NULL,
  `matricule` VARCHAR(50) NOT NULL,
  `adherent_nom_prenom` VARCHAR(200) NOT NULL,
  `date_paiement` DATE NOT NULL,
  `montant` DECIMAL(15,2) NOT NULL,
  `mode_paiement` VARCHAR(50) NOT NULL,
  `reference` VARCHAR(100) DEFAULT NULL,
  `mois` VARCHAR(30) NOT NULL,
  `annee` INT NOT NULL,
  `agent_enregistreur` VARCHAR(150) NOT NULL,
  `observations` TEXT DEFAULT NULL,
  `est_regularisation` TINYINT(1) NOT NULL DEFAULT 0,
  `type_regularisation` VARCHAR(150) DEFAULT NULL,
  `motif_regularisation` TEXT DEFAULT NULL,
  `montant_anterieur_initial` DECIMAL(15,2) DEFAULT NULL,
  `montant_complementaire` DECIMAL(15,2) DEFAULT NULL,
  `regularise_par` VARCHAR(150) DEFAULT NULL,
  `date_regularisation` DATETIME DEFAULT NULL,
  `date_paiement_effective` DATE DEFAULT NULL,
  `periode_concernee` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cotis_adherent` (`adherent_id`),
  INDEX `idx_cotis_matricule` (`matricule`),
  INDEX `idx_cotis_date` (`date_paiement`),
  INDEX `idx_cotis_mois_annee` (`mois`, `annee`),
  INDEX `idx_cotis_mode` (`mode_paiement`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Journal des encaissements et cotisations des adhérents';

-- ------------------------------------------------------------
-- Données de la table `cotisations` (17 enregistrements)
-- ------------------------------------------------------------
INSERT INTO `cotisations` (
  `id`, `adherent_id`, `matricule`, `adherent_nom_prenom`, `date_paiement`, `montant`,
  `mode_paiement`, `reference`, `mois`, `annee`, `agent_enregistreur`, `observations`,
  `est_regularisation`, `type_regularisation`, `motif_regularisation`, `montant_anterieur_initial`,
  `montant_complementaire`, `regularise_par`, `date_regularisation`, `date_paiement_effective`,
  `periode_concernee`, `created_at`
) VALUES
  ('cot-101', 'adh-1', 'COSITI-0001', 'TRAORÉ Moussa', '2026-01-15', 4900, 'Espèces', 'REC-001-JAN', 'Janvier', 2026, 'Mamadou Diop', 'Cotisation 7 jours (7 x 700 FCFA)', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-15T10:15:00.000Z'),
  ('cot-102', 'adh-1', 'COSITI-0001', 'TRAORÉ Moussa', '2026-01-30', 4900, 'Wave', 'WAVE-TX-9921', 'Janvier', 2026, 'Mamadou Diop', 'Cotisation 7 jours fin janvier', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-30T14:22:00.000Z'),
  ('cot-103', 'adh-1', 'COSITI-0001', 'TRAORÉ Moussa', '2026-02-15', 4900, 'Orange Money', 'OM-CI-847291', 'Février', 2026, 'Mamadou Diop', 'Cotisation mi-février', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-15T11:00:00.000Z'),
  ('cot-104', 'adh-1', 'COSITI-0001', 'TRAORÉ Moussa', '2026-02-28', 1400, 'Espèces', 'REC-009-FEB', 'Février', 2026, 'Aminata Konaté', 'Paiement appoint 2 jours - Franchit le seuil de 15 000 FCFA (Total 16 100 FCFA)', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-28T16:40:00.000Z'),
  ('cot-201', 'adh-2', 'COSITI-0002', 'KOUAMÉ Ahou Félicité', '2026-01-20', 10000, 'Wave', 'WAVE-WV-38291', 'Janvier', 2026, 'BAKAYOKO Awa', 'Cotisation mensuelle forfait 10 jours', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-20T09:30:00.000Z'),
  ('cot-202', 'adh-2', 'COSITI-0002', 'KOUAMÉ Ahou Félicité', '2026-02-10', 8000, 'Wave', 'WAVE-WV-44102', 'Février', 2026, 'BAKAYOKO Awa', 'Cotisation 8 jours', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-10T11:45:00.000Z'),
  ('cot-203', 'adh-2', 'COSITI-0002', 'KOUAMÉ Ahou Félicité', '2026-03-02', 7000, 'Espèces', 'REC-012-MAR', 'Mars', 2026, 'BAKAYOKO Awa', 'Cotisation début mars', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-02T10:10:00.000Z'),
  ('cot-301', 'adh-3', 'COSITI-0003', 'DIALLO Oumar', '2026-01-25', 4900, 'MTN MoMo', 'MOMO-77291', 'Janvier', 2026, 'BAKAYOKO Awa', 'Versement 7 jours', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-25T15:20:00.000Z'),
  ('cot-302', 'adh-3', 'COSITI-0003', 'DIALLO Oumar', '2026-02-10', 3500, 'Espèces', 'REC-006-FEB', 'Février', 2026, 'BAKAYOKO Awa', 'Paiement partiel 5 jours. Aucun paiement depuis 26 jours.', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-10T14:30:00.000Z'),
  ('cot-401', 'adh-4', 'COSITI-0004', 'BAKAYOKO Salimata', '2026-02-05', 6000, 'Orange Money', 'OM-CI-773910', 'Février', 2026, 'BAKAYOKO Awa', 'Avance 6 jours', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-05T12:00:00.000Z'),
  ('cot-402', 'adh-4', 'COSITI-0004', 'BAKAYOKO Salimata', '2026-02-14', 5000, 'Wave', 'WAVE-WV-55201', 'Février', 2026, 'BAKAYOKO Awa', 'Versement mi-février', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-14T16:15:00.000Z'),
  ('cot-403', 'adh-4', 'COSITI-0004', 'BAKAYOKO Salimata', '2026-02-28', 5000, 'Espèces', 'REC-010-FEB', 'Février', 2026, 'N\'GUESSAN Koffi Bernard', 'Total atteint 16 000 FCFA, franchit le seuil de 15 000 FCFA! Enregistré par le DAF.', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-28T17:00:00.000Z'),
  ('cot-501', 'adh-5', 'COSITI-0005', 'KONÉ Ibrahim', '2026-02-20', 3500, 'Wave', 'WAVE-WV-66190', 'Février', 2026, 'BAKAYOKO Awa', 'Cotisation 5 jours', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-20T10:20:00.000Z'),
  ('cot-502', 'adh-5', 'COSITI-0005', 'KONÉ Ibrahim', '2026-03-05', 1400, 'Espèces', 'REC-015-MAR', 'Mars', 2026, 'BAKAYOKO Awa', 'Cotisation 2 jours mars', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-05T09:15:00.000Z'),
  ('cot-701', 'adh-7', 'COSITI-0007', 'BAMBA Seydou', '2026-01-10', 10000, 'Virement bancaire', 'VIR-BNI-00293', 'Janvier', 2026, 'N\'GUESSAN Koffi Bernard', 'Versement début adhésion validé par DAF', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-10T11:00:00.000Z'),
  ('cot-702', 'adh-7', 'COSITI-0007', 'BAMBA Seydou', '2026-02-02', 12000, 'Wave', 'WAVE-WV-10293', 'Février', 2026, 'BAKAYOKO Awa', 'Forfait 12 jours', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-02T14:10:00.000Z'),
  ('cot-703', 'adh-7', 'COSITI-0007', 'BAMBA Seydou', '2026-03-04', 10000, 'Wave', 'WAVE-WV-77291', 'Mars', 2026, 'N\'GUESSAN Koffi Bernard', 'Versement mars enregistré par DAF', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-04T13:30:00.000Z');

-- ------------------------------------------------------------
-- Structure de la table `depenses_courantes`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `depenses_courantes`;
CREATE TABLE `depenses_courantes` (
  `id` VARCHAR(64) NOT NULL,
  `date_depense` DATE NOT NULL,
  `categorie` VARCHAR(150) NOT NULL,
  `motif` TEXT NOT NULL,
  `montant` DECIMAL(15,2) NOT NULL,
  `mode_paiement` VARCHAR(100) NOT NULL,
  `beneficiaire` VARCHAR(200) NOT NULL,
  `numero_piece` VARCHAR(100) NOT NULL,
  `statut` VARCHAR(50) NOT NULL DEFAULT 'Payé',
  `enregistre_par` VARCHAR(150) NOT NULL,
  `observations` TEXT DEFAULT NULL,
  `origine_fonds` ENUM('Exploitation (Cotisations CNPS)', 'Apport personnel du PCA') NOT NULL COMMENT 'Ventilation statutaire COSITI',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_dep_date` (`date_depense`),
  INDEX `idx_dep_categorie` (`categorie`),
  INDEX `idx_dep_origine` (`origine_fonds`),
  INDEX `idx_dep_piece` (`numero_piece`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Journal des décaissements et charges d exploitation / apport PCA';

-- ------------------------------------------------------------
-- Données de la table `depenses_courantes` (6 enregistrements)
-- ------------------------------------------------------------
INSERT INTO `depenses_courantes` (
  `id`, `date_depense`, `categorie`, `motif`, `montant`, `mode_paiement`, `beneficiaire`,
  `numero_piece`, `statut`, `enregistre_par`, `observations`, `origine_fonds`, `created_at`
) VALUES
  ('dep-1', '2026-03-01', 'Loyer & Charges locatives', 'Règlement loyer mensuel du siège coopérative COSITI Dokui (Mars 2026)', 180000, 'Chèque', 'SCI Immeuble Dokui Plateau', 'CHQ-SGCI-882910', 'Payé', 'OUATTARA Salif (DAF)', 'Quittance de loyer reçue et archivée.', 'Apport personnel du PCA', '2026-03-01T09:30:00.000Z'),
  ('dep-2', '2026-03-02', 'Carburant & Déplacements', 'Carburant & vidange motos pour collecte de proximité auprès des commerçants', 35000, 'Espèces / Caisse', 'Station Total Dokui', 'BON-CAISSE-2026-034', 'Payé', 'OUATTARA Salif (DAF)', 'Bons de carburant contresignés par les agents de collecte.', 'Apport personnel du PCA', '2026-03-02T11:00:00.000Z'),
  ('dep-3', '2026-03-03', 'Fournitures de bureau & Imprimés', 'Rames de papier, carnets de reçus sécurisés et cartouches d\'encre imprimante', 42000, 'Wave', 'Papeterie Moderne Cocody', 'FAC-PAP-2026-118', 'Payé', 'OUATTARA Salif (DAF)', 'Facture normalisée acquittée.', 'Apport personnel du PCA', '2026-03-03T14:15:00.000Z'),
  ('dep-4', '2026-03-04', 'Communication, Internet & Téléphonie', 'Abonnement fibre optique siège et forfaits data des terminaux de collecte', 27500, 'Orange Money', 'Orange Côte d\'Ivoire', 'REC-OM-ORANGE-9941', 'Payé', 'OUATTARA Salif (DAF)', 'Facture Internet et flotte télécoms mars 2026.', 'Apport personnel du PCA', '2026-03-04T10:20:00.000Z'),
  ('dep-5', '2026-02-28', 'Primes & Salaires personnel', 'Indemnités de mission et primes de collecte des agents de terrain (Février 2026)', 75000, 'Espèces / Caisse', 'Équipe agents d\'enrôlement terrain', 'ETAT-PRIMES-02-2026', 'Payé', 'OUATTARA Salif (DAF)', 'Émargement collectif certifié par le DAF.', 'Apport personnel du PCA', '2026-02-28T16:00:00.000Z'),
  ('dep-6', '2026-03-06', 'Entretien, Réparations & Équipements', 'Réparation climatiseur salle d\'accueil des adhérents et remplacement ampoules LED', 18500, 'Espèces / Caisse', 'Artisan Frigoriste FOFANA', 'REC-DEP-2026-042', 'Payé', 'OUATTARA Salif (DAF)', 'Travaux effectués et réceptionnés avec satisfaction.', 'Apport personnel du PCA', '2026-03-06T15:00:00.000Z');

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

-- ------------------------------------------------------------
-- Structure de la table `frais_mobile_money`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `frais_mobile_money`;
CREATE TABLE `frais_mobile_money` (
  `id` VARCHAR(64) NOT NULL,
  `date_frais` DATE NOT NULL,
  `operateur` VARCHAR(50) NOT NULL,
  `type_frais` VARCHAR(100) NOT NULL,
  `montant_transaction` DECIMAL(15,2) NOT NULL,
  `frais_preleves` DECIMAL(15,2) NOT NULL,
  `montant_net` DECIMAL(15,2) NOT NULL,
  `reference_transaction` VARCHAR(100) NOT NULL,
  `cotisation_id_liee` VARCHAR(64) DEFAULT NULL,
  `adherent_concerne` VARCHAR(150) DEFAULT NULL,
  `enregistre_par` VARCHAR(150) NOT NULL,
  `observations` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_fmm_date` (`date_frais`),
  INDEX `idx_fmm_op` (`operateur`),
  INDEX `idx_fmm_ref` (`reference_transaction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Commissions et frais prélevés par les opérateurs de paiement mobile';

-- ------------------------------------------------------------
-- Données de la table `frais_mobile_money` (5 enregistrements)
-- ------------------------------------------------------------
INSERT INTO `frais_mobile_money` (
  `id`, `date_frais`, `operateur`, `type_frais`, `montant_transaction`, `frais_preleves`,
  `montant_net`, `reference_transaction`, `cotisation_id_liee`, `adherent_concerne`,
  `enregistre_par`, `observations`, `created_at`
) VALUES
  ('fmm-1', '2026-02-15', 'Orange Money', 'Commission prélevée sur encaissement', 4900, 75, 4825, 'OM-CI-847291', NULL, 'TRAORÉ Moussa (COSITI-0001)', 'OUATTARA Salif (DAF)', 'Frais de transaction prélevés automatiquement par Orange Money CI sur le paiement de cotisation.', '2026-02-15T11:05:00.000Z'),
  ('fmm-2', '2026-02-25', 'Orange Money', 'Frais de retrait marchand', 50000, 750, 49250, 'OM-RETRAIT-2026-5541', NULL, NULL, 'OUATTARA Salif (DAF)', 'Retrait d\'espèces au sous-compte marchand Orange Money pour approvisionner la caisse menue dépense.', '2026-02-25T14:30:00.000Z'),
  ('fmm-3', '2026-03-01', 'Wave', 'Commission prélevée sur encaissement', 10000, 100, 9900, 'WAVE-TX-9921', NULL, 'BAMBA Seydou (COSITI-0007)', 'OUATTARA Salif (DAF)', 'Prélèvement de 1% de frais d\'encaissement Wave Business.', '2026-03-01T10:15:00.000Z'),
  ('fmm-4', '2026-03-02', 'MTN MoMo', 'Frais de retrait marchand', 30000, 450, 29550, 'MTN-CASH-OUT-7712', NULL, NULL, 'OUATTARA Salif (DAF)', 'Frais de retrait prélevés par MTN Mobile Money lors de la conversion en espèces pour versement bancaire.', '2026-03-02T16:00:00.000Z'),
  ('fmm-5', '2026-03-04', 'Orange Money', 'Commission prélevée sur encaissement', 7000, 105, 6895, 'OM-COT-2026-0304', NULL, 'KOUAMÉ Ahou Félicité (COSITI-0002)', 'OUATTARA Salif (DAF)', 'Frais Orange Money retenus à la source sur paiement mobile cotisation.', '2026-03-04T11:40:00.000Z');

-- ------------------------------------------------------------
-- Structure de la table `dossiers_allocations`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `dossiers_allocations`;
CREATE TABLE `dossiers_allocations` (
  `id` VARCHAR(64) NOT NULL,
  `adherent_id` VARCHAR(64) NOT NULL,
  `matricule` VARCHAR(50) NOT NULL,
  `adherent_nom_prenom` VARCHAR(200) NOT NULL,
  `numero_cnps` VARCHAR(50) NOT NULL,
  `branche` VARCHAR(50) NOT NULL DEFAULT 'PRESTATIONS_FAMILIALES',
  `sous_rubrique_offre` VARCHAR(150) DEFAULT NULL,
  `montant_prestation` DECIMAL(15,2) DEFAULT NULL,
  `date_immatriculation` DATE DEFAULT NULL,
  `statut` VARCHAR(100) NOT NULL,
  `nombre_enfants` INT UNSIGNED NOT NULL DEFAULT 0,
  `sans_enfant` TINYINT(1) NOT NULL DEFAULT 0,
  `certificats_scolarite_fournis` TINYINT(1) NOT NULL DEFAULT 0,
  `date_depot` DATE DEFAULT NULL,
  `date_transmission` DATE DEFAULT NULL,
  `date_relance` DATE DEFAULT NULL,
  `date_decision` DATE DEFAULT NULL,
  `pieces_json` JSON DEFAULT NULL,
  `historique_json` JSON DEFAULT NULL,
  `observations` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_dos_adherent` (`adherent_id`),
  INDEX `idx_dos_matricule` (`matricule`),
  INDEX `idx_dos_statut` (`statut`),
  INDEX `idx_dos_cnps` (`numero_cnps`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Suivi des dossiers de prestations familiales et sécurité sociale CNPS';

-- ------------------------------------------------------------
-- Données de la table `dossiers_allocations` (2 enregistrements)
-- ------------------------------------------------------------
INSERT INTO `dossiers_allocations` (
  `id`, `adherent_id`, `matricule`, `adherent_nom_prenom`, `numero_cnps`, `branche`,
  `sous_rubrique_offre`, `montant_prestation`, `date_immatriculation`, `statut`, `nombre_enfants`,
  `sans_enfant`, `certificats_scolarite_fournis`, `date_depot`, `date_transmission`, `date_relance`,
  `date_decision`, `pieces_json`, `historique_json`, `observations`, `created_at`, `updated_at`
) VALUES
  ('dos-1', 'adh-2', 'COSITI-0002', 'KOUAMÉ Ahou Félicité', 'CNPS-2026-98432', 'PRESTATIONS_FAMILIALES', NULL, NULL, '2026-02-18', 'Dossier incomplet', 3, 0, 0, '2026-02-20', NULL, '2026-03-10', NULL, '[{\"id\":\"p1\",\"nom\":\"Extrait d\'acte de naissance de l\'adhérent\",\"obligatoire\":true,\"recu\":true,\"dateReception\":\"2026-02-20\"},{\"id\":\"p2\",\"nom\":\"Photocopie de la Carte Nationale d\'Identité (CNI)\",\"obligatoire\":true,\"recu\":true,\"dateReception\":\"2026-02-20\"},{\"id\":\"p3\",\"nom\":\"Attestation ou Certificat d\'immatriculation CNPS\",\"obligatoire\":true,\"recu\":true,\"dateReception\":\"2026-02-20\"},{\"id\":\"p4\",\"nom\":\"Certificat de mariage légal (si applicable)\",\"obligatoire\":false,\"recu\":false},{\"id\":\"p5\",\"nom\":\"Extraits d\'acte de naissance des enfants à charge (3 enfants)\",\"obligatoire\":true,\"recu\":true,\"dateReception\":\"2026-02-25\"},{\"id\":\"p6\",\"nom\":\"Certificats de scolarité des enfants (spécifique COSITI)\",\"obligatoire\":true,\"recu\":false,\"notes\":\"Manque les certificats de l\'aîné au Lycée Moderne et du benjamin\"},{\"id\":\"p7\",\"nom\":\"Certificat de vie et d\'entretien collectif des enfants\",\"obligatoire\":true,\"recu\":false},{\"id\":\"p8\",\"nom\":\"2 photos d\'identité récentes\",\"obligatoire\":true,\"recu\":true,\"dateReception\":\"2026-02-20\"}]', '[{\"date\":\"2026-02-20 14:35\",\"auteur\":\"Mamadou Diop\",\"action\":\"Ouverture du dossier suite à immatriculation CNPS.\"},{\"date\":\"2026-02-25 11:20\",\"auteur\":\"Mamadou Diop\",\"action\":\"Réception des extraits de naissance des 3 enfants.\"},{\"date\":\"2026-03-01 09:10\",\"auteur\":\"Aminata Konaté\",\"action\":\"Relance téléphonique pour certificats de scolarité manquants.\"}]', 'Mme Kouamé a été contactée par téléphone pour apporter les certificats de scolarité avant le 15 mars pour transmission à la CNPS.', '2026-02-20T14:30:00.000Z', '2026-03-01T09:10:00.000Z'),
  ('dos-2', 'adh-7', 'COSITI-0007', 'BAMBA Seydou', 'CNPS-2026-55102', 'PRESTATIONS_FAMILIALES', NULL, NULL, '2026-02-05', 'Dossier transmis', 2, 0, 1, '2026-02-08', '2026-02-22', NULL, NULL, '[{\"id\":\"p1\",\"nom\":\"Extrait d\'acte de naissance de l\'adhérent\",\"obligatoire\":true,\"recu\":true,\"dateReception\":\"2026-02-08\"},{\"id\":\"p2\",\"nom\":\"Photocopie de la Carte Nationale d\'Identité (CNI)\",\"obligatoire\":true,\"recu\":true,\"dateReception\":\"2026-02-08\"},{\"id\":\"p3\",\"nom\":\"Attestation ou Certificat d\'immatriculation CNPS\",\"obligatoire\":true,\"recu\":true,\"dateReception\":\"2026-02-08\"},{\"id\":\"p4\",\"nom\":\"Certificat de mariage légal (si applicable)\",\"obligatoire\":false,\"recu\":true,\"dateReception\":\"2026-02-12\"},{\"id\":\"p5\",\"nom\":\"Extraits d\'acte de naissance des enfants à charge (2 enfants)\",\"obligatoire\":true,\"recu\":true,\"dateReception\":\"2026-02-08\"},{\"id\":\"p6\",\"nom\":\"Certificats de scolarité des enfants (spécifique COSITI)\",\"obligatoire\":true,\"recu\":true,\"dateReception\":\"2026-02-15\"},{\"id\":\"p7\",\"nom\":\"Certificat de vie et d\'entretien collectif des enfants\",\"obligatoire\":true,\"recu\":true,\"dateReception\":\"2026-02-15\"},{\"id\":\"p8\",\"nom\":\"2 photos d\'identité récentes\",\"obligatoire\":true,\"recu\":true,\"dateReception\":\"2026-02-08\"}]', '[{\"date\":\"2026-02-08 10:00\",\"auteur\":\"Mamadou Diop\",\"action\":\"Création du dossier.\"},{\"date\":\"2026-02-15 16:30\",\"auteur\":\"Mamadou Diop\",\"action\":\"Réception des certificats de scolarité.\"},{\"date\":\"2026-02-22 11:00\",\"auteur\":\"Aminata Konaté\",\"action\":\"Transmission officielle du dossier à la CNPS.\"}]', 'Dossier complet transmis avec bordereau N° BORD-2026-042 au centre de prévoyance sociale CNPS Marcory.', '2026-02-08T10:00:00.000Z', '2026-02-22T11:00:00.000Z');

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

-- ------------------------------------------------------------
-- Structure de la table `employes`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `employes`;
CREATE TABLE `employes` (
  `id` VARCHAR(64) NOT NULL,
  `matricule` VARCHAR(50) NOT NULL UNIQUE,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `poste` VARCHAR(150) NOT NULL,
  `departement` VARCHAR(150) DEFAULT NULL,
  `salaire_base` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `actif` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Personnel permanent et contractuels';

-- ------------------------------------------------------------
-- Structure de la table `bulletins_paie`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `bulletins_paie`;
CREATE TABLE `bulletins_paie` (
  `id` VARCHAR(64) NOT NULL,
  `bulletin_numero` VARCHAR(100) NOT NULL,
  `employe_id` VARCHAR(64) NOT NULL,
  `mois` VARCHAR(30) NOT NULL,
  `periode_libelle` VARCHAR(50) DEFAULT NULL,
  `salaire_base` DECIMAL(15,2) NOT NULL,
  `total_gains_bruts` DECIMAL(15,2) NOT NULL,
  `net_a_payer` DECIMAL(15,2) NOT NULL,
  `statut` VARCHAR(50) NOT NULL DEFAULT 'Brouillon',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_bp_emp` (`employe_id`),
  INDEX `idx_bp_periode` (`mois`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bulletins de salaire édités par le DAF';

-- ------------------------------------------------------------
-- Données de la table `employes` (6 enregistrements)
-- ------------------------------------------------------------
INSERT INTO `employes` (`id`, `matricule`, `nom`, `prenom`, `poste`, `departement`, `salaire_base`, `actif`) VALUES
  ('emp-1', 'EMP-001', 'KONAN', 'Amani Paul', 'Stagiaire Archiviste & Appui Caisse', 'Caisse & Enregistrement', 45000, 1),
  ('emp-2', 'EMP-002', 'YÉO', 'Madou', 'Agent Adjoint Collecte & Recouvrement', 'Opérations & Recouvrement', 55000, 1),
  ('emp-3', 'EMP-003', 'KOUADIO', 'Brou Sylvain', 'Agent de liaison, Coursier & Logistique', 'Logistique & Services Généraux', 60000, 1),
  ('emp-4', 'EMP-004', 'BAKAYOKO', 'Awa', 'Caissière Principale & Enregistrement', 'Caisse & Enregistrement', 125000, 1),
  ('emp-5', 'EMP-005', 'MBIDA', 'François', 'Gestionnaire de Portefeuille Senior (GP-001)', 'Opérations & Recouvrement', 160000, 1),
  ('emp-6', 'EMP-006', 'N\'GUESSAN', 'Koffi Bernard', 'Directeur Administratif et Financier (DAF)', 'Finances & Comptabilité', 350000, 1);

-- ------------------------------------------------------------
-- Données de la table `bulletins_paie` (14 enregistrements)
-- ------------------------------------------------------------
INSERT INTO `bulletins_paie` (`id`, `bulletin_numero`, `employe_id`, `mois`, `periode_libelle`, `salaire_base`, `total_gains_bruts`, `net_a_payer`, `statut`) VALUES
  ('bp-2026-03-emp-1', 'BP-2026-03-EMP-001', 'emp-1', '2026-03', 'Mars 2026', 45000, 55000, 54550, 'Validé DAF'),
  ('bp-2026-03-emp-2', 'BP-2026-03-EMP-002', 'emp-2', '2026-03', 'Mars 2026', 55000, 70000, 66510, 'Validé DAF'),
  ('bp-2026-03-emp-3', 'BP-2026-03-EMP-003', 'emp-3', '2026-03', 'Mars 2026', 60000, 80000, 75790, 'Validé DAF'),
  ('bp-2026-03-emp-4', 'BP-2026-03-EMP-004', 'emp-4', '2026-03', 'Mars 2026', 125000, 185000, 166042, 'Validé DAF'),
  ('bp-2026-03-emp-5', 'BP-2026-03-EMP-005', 'emp-5', '2026-03', 'Mars 2026', 160000, 235000, 208889, 'Validé DAF'),
  ('bp-2026-03-emp-6', 'BP-2026-03-EMP-006', 'emp-6', '2026-03', 'Mars 2026', 350000, 525000, 447732, 'Validé DAF'),
  ('bp-adh-2026-03-adh-2', 'BP-ADH-2026-03-COSITI-0002', 'adh-2', '2026-03', 'Mars 2026', 60000, 60000, 56630, 'Validé DAF'),
  ('bp-adh-2026-03-adh-7', 'BP-ADH-2026-03-COSITI-0007', 'adh-7', '2026-03', 'Mars 2026', 60000, 60000, 56630, 'Validé DAF'),
  ('bp-2026-02-emp-1', 'BP-2026-02-EMP-001', 'emp-1', '2026-02', 'Février 2026', 45000, 55000, 54550, 'Validé DAF'),
  ('bp-2026-02-emp-2', 'BP-2026-02-EMP-002', 'emp-2', '2026-02', 'Février 2026', 55000, 70000, 66510, 'Validé DAF'),
  ('bp-2026-02-emp-3', 'BP-2026-02-EMP-003', 'emp-3', '2026-02', 'Février 2026', 60000, 80000, 75790, 'Validé DAF'),
  ('bp-2026-02-emp-4', 'BP-2026-02-EMP-004', 'emp-4', '2026-02', 'Février 2026', 125000, 185000, 166042, 'Validé DAF'),
  ('bp-2026-02-emp-5', 'BP-2026-02-EMP-005', 'emp-5', '2026-02', 'Février 2026', 160000, 235000, 208889, 'Validé DAF'),
  ('bp-2026-02-emp-6', 'BP-2026-02-EMP-006', 'emp-6', '2026-02', 'Février 2026', 350000, 525000, 447732, 'Validé DAF');

-- ------------------------------------------------------------
-- Structure de la table `journal_operations`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `journal_operations`;
CREATE TABLE `journal_operations` (
  `id` VARCHAR(64) NOT NULL,
  `date_heure` DATETIME NOT NULL,
  `utilisateur` VARCHAR(150) NOT NULL,
  `role` VARCHAR(100) NOT NULL,
  `type_operation` VARCHAR(100) NOT NULL,
  `entite` VARCHAR(150) NOT NULL,
  `matricule` VARCHAR(50) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_jour_date` (`date_heure`),
  INDEX `idx_jour_user` (`utilisateur`),
  INDEX `idx_jour_op` (`type_operation`),
  INDEX `idx_jour_mat` (`matricule`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Piste d audit et traçabilité des opérations sensibles';

-- ------------------------------------------------------------
-- Données de la table `journal_operations` (6 enregistrements)
-- ------------------------------------------------------------
INSERT INTO `journal_operations` (
  `id`, `date_heure`, `utilisateur`, `role`, `type_operation`, `entite`, `matricule`, `description`, `details`
) VALUES
  ('j-1', '2026-03-05T09:15:00.000Z', 'BAKAYOKO Awa', 'Caissière & Agent d\'enregistrement', 'ENREGISTREMENT_COTISATION', 'Cotisation', 'COSITI-0005', 'Enregistrement cotisation de 1 400 FCFA en espèces (Ref: REC-015-MAR)', 'Enregistrement cotisation de 1 400 FCFA en espèces (Ref: REC-015-MAR) — Enregistré par : BAKAYOKO Awa (Caissière)'),
  ('j-2', '2026-03-04T13:30:00.000Z', 'N\'GUESSAN Koffi Bernard', 'DAF', 'ENREGISTREMENT_COTISATION', 'Cotisation', 'COSITI-0007', 'Enregistrement cotisation de 10 000 FCFA par Wave (Ref: WAVE-WV-77291)', 'Enregistrement cotisation de 10 000 FCFA par Wave (Ref: WAVE-WV-77291) — Enregistré par : N\'GUESSAN Koffi Bernard (DAF)'),
  ('j-3', '2026-03-02T10:10:00.000Z', 'BAKAYOKO Awa', 'Caissière & Agent d\'enregistrement', 'ENREGISTREMENT_COTISATION', 'Cotisation', 'COSITI-0002', 'Enregistrement cotisation de 7 000 FCFA en espèces (Ref: REC-012-MAR)', 'Enregistrement cotisation de 7 000 FCFA en espèces (Ref: REC-012-MAR) — Enregistré par : BAKAYOKO Awa (Caissière)'),
  ('j-4', '2026-02-28T17:00:00.000Z', 'N\'GUESSAN Koffi Bernard', 'DAF', 'ENREGISTREMENT_COTISATION', 'Cotisation', 'COSITI-0004', 'Paiement 5 000 FCFA - Seuil de 15 000 FCFA atteint (Cumul: 16 000 FCFA)', 'Paiement 5 000 FCFA - Seuil de 15 000 FCFA atteint (Cumul: 16 000 FCFA) — Enregistré par : N\'GUESSAN Koffi Bernard (DAF)'),
  ('j-5', '2026-02-22T11:00:00.000Z', 'KONÉ Lassina', 'DG', 'MODIFICATION_DOSSIER', 'Dossier Allocations', 'COSITI-0007', 'Statut du dossier passé à « Dossier transmis » vers CNPS Marcory', 'Statut du dossier passé à « Dossier transmis » vers CNPS Marcory validé par Direction Générale'),
  ('j-6', '2026-02-18T14:30:00.000Z', 'N\'GUESSAN Koffi Bernard', 'DAF', 'IMMATRICULATION', 'Adhérent', 'COSITI-0002', 'Attribution du numéro CNPS suite au dépassement du seuil de cotisation', 'Attribution du numéro CNPS suite au dépassement du seuil de cotisation de 15 000 FCFA validée par le DAF');

-- Rétablissement des contraintes et finalisation de la transaction
COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- =============================================================================
-- FIN DU SCRIPT D'EXPORTATION MYSQL COSITI
-- =============================================================================
