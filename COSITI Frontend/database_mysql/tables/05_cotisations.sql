/* ------------------------------------------------------------
 * TABLE MYSQL : cotisations
 * Export COSITI - Généré le 19/10/2026
 * Encodage : UTF-8 (utf8mb4)
 * ------------------------------------------------------------
 */
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

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
SET FOREIGN_KEY_CHECKS = 1;
