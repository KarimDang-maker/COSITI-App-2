/* ------------------------------------------------------------
 * TABLE MYSQL : employes_et_paie
 * Export COSITI - Généré le 19/10/2026
 * Encodage : UTF-8 (utf8mb4)
 * ------------------------------------------------------------
 */
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

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
SET FOREIGN_KEY_CHECKS = 1;
