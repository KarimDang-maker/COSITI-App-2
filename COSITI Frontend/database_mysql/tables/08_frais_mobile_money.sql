/* ------------------------------------------------------------
 * TABLE MYSQL : frais_mobile_money
 * Export COSITI - Généré le 19/10/2026
 * Encodage : UTF-8 (utf8mb4)
 * ------------------------------------------------------------
 */
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

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
SET FOREIGN_KEY_CHECKS = 1;
