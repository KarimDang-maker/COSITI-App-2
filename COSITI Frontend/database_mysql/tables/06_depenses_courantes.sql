/* ------------------------------------------------------------
 * TABLE MYSQL : depenses_courantes
 * Export COSITI - Généré le 19/10/2026
 * Encodage : UTF-8 (utf8mb4)
 * ------------------------------------------------------------
 */
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

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
SET FOREIGN_KEY_CHECKS = 1;
