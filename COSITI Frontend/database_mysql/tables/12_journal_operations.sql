/* ------------------------------------------------------------
 * TABLE MYSQL : journal_operations
 * Export COSITI - Généré le 19/10/2026
 * Encodage : UTF-8 (utf8mb4)
 * ------------------------------------------------------------
 */
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

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
SET FOREIGN_KEY_CHECKS = 1;
