/* ------------------------------------------------------------
 * TABLE MYSQL : dossiers_allocations
 * Export COSITI - Généré le 19/10/2026
 * Encodage : UTF-8 (utf8mb4)
 * ------------------------------------------------------------
 */
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

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
SET FOREIGN_KEY_CHECKS = 1;
