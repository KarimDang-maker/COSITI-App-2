-- =============================================================================
-- COSITI — schéma MySQL de l'application (MySQL 8 / MariaDB 10.5+)
-- Reprend EXACTEMENT les tables et colonnes du dump `database_mysql/` et les complète :
--   * identifiants de connexion (hachés) dans `utilisateurs`
--   * colonnes manquantes pour que le backend gère 100 % des fonctionnalités du front
--   * tables absentes du dump : partenaires, rendez_vous, notes_direction,
--     rapports_reunions, rapports_agents, refresh_tokens
-- Le script est idempotent (CREATE TABLE IF NOT EXISTS) : il peut être rejoué sans risque.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `parametres` (
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
  `code_confirmation_securite` VARCHAR(50) NOT NULL DEFAULT '',          -- le dump y met "0000" en clair : vidé après hachage
  `code_confirmation_hash` VARCHAR(100) DEFAULT NULL,                    -- hash bcrypt du code de confirmation
  `dernier_numero_matricule` INT NOT NULL DEFAULT 0,                     -- séquence COSITI-xxxx
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuration générale de la coopérative';

CREATE TABLE IF NOT EXISTS `gestionnaires_portefeuille` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `telephone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `zone_secteur` VARCHAR(150) NOT NULL,
  `statut` ENUM('Actif', 'Inactif', 'En congé') NOT NULL DEFAULT 'Actif',
  `objectifs_recouvrement_mensuel` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gp_code` (`code`),
  KEY `idx_gp_statut` (`statut`),
  KEY `idx_gp_zone` (`zone_secteur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Gestionnaires de portefeuille et zones de recouvrement';

CREATE TABLE IF NOT EXISTS `utilisateurs` (
  `id` VARCHAR(64) NOT NULL,
  `nom` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `role` VARCHAR(100) NOT NULL,
  `type_acces` VARCHAR(150) NOT NULL,
  `titre_complet` VARCHAR(200) DEFAULT NULL,
  `poste` VARCHAR(150) DEFAULT NULL,
  `description_acces` TEXT DEFAULT NULL,
  `telephone` VARCHAR(50) DEFAULT NULL,
  `actif` TINYINT(1) NOT NULL DEFAULT 1,
  `code_pin` VARCHAR(20) DEFAULT NULL,                                   -- hérité du dump (jamais utilisé : voir pin_hash)
  `code_acces` VARCHAR(50) DEFAULT NULL,                                 -- hérité du dump (jamais utilisé : voir pin_hash)
  `dernier_acces` VARCHAR(100) DEFAULT NULL,                             -- texte libre dans le dump ("En ligne maintenant"), horodatage ISO ensuite
  -- ---- Informations de connexion (ajoutées) ----
  `password_hash` VARCHAR(100) DEFAULT NULL,                             -- bcrypt du mot de passe
  `pin_hash` VARCHAR(100) DEFAULT NULL,                                  -- obsolète : plus de code PIN de compte (toujours NULL)
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `failed_attempts` INT NOT NULL DEFAULT 0,
  `locked_until` DATETIME(3) DEFAULT NULL,
  `token_version` INT NOT NULL DEFAULT 0,                                -- incrémenté pour révoquer les jetons d'accès
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_email` (`email`),
  KEY `idx_user_role` (`role`),
  KEY `idx_user_actif` (`actif`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Comptes utilisateurs, rôles et identifiants de connexion';

CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `family` VARCHAR(64) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `revoked_at` DATETIME(3) DEFAULT NULL,
  `replaced_by` VARCHAR(64) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `ip` VARCHAR(64) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rt_hash` (`token_hash`),
  KEY `idx_rt_user` (`user_id`),
  KEY `idx_rt_family` (`family`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sessions (refresh tokens hachés, rotation)';

CREATE TABLE IF NOT EXISTS `adherents` (
  `id` VARCHAR(64) NOT NULL,
  `matricule` VARCHAR(50) NOT NULL,
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
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_adh_matricule` (`matricule`),
  KEY `idx_adh_statut` (`statut`),
  KEY `idx_adh_statut_cnps` (`statut_immatriculation`),
  KEY `idx_adh_gestionnaire` (`gestionnaire_id`),
  KEY `idx_adh_cnps` (`numero_cnps`),
  KEY `idx_adh_cni` (`cni`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Répertoire officiel des adhérents de la coopérative';

CREATE TABLE IF NOT EXISTS `cotisations` (
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
  `date_regularisation` DATETIME(3) DEFAULT NULL,
  `date_paiement_effective` DATE DEFAULT NULL,
  `periode_concernee` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_cotis_adherent` (`adherent_id`),
  KEY `idx_cotis_matricule` (`matricule`),
  KEY `idx_cotis_date` (`date_paiement`),
  KEY `idx_cotis_mois_annee` (`mois`, `annee`),
  KEY `idx_cotis_mode` (`mode_paiement`),
  KEY `idx_cotis_reference` (`reference`),
  UNIQUE KEY `uq_cotis_reference` (`reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Journal des encaissements et cotisations des adhérents';

CREATE TABLE IF NOT EXISTS `depenses_courantes` (
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
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_dep_date` (`date_depense`),
  KEY `idx_dep_categorie` (`categorie`),
  KEY `idx_dep_origine` (`origine_fonds`),
  KEY `idx_dep_piece` (`numero_piece`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Journal des décaissements et charges d exploitation / apport PCA';

CREATE TABLE IF NOT EXISTS `versements_bancaires` (
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
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_vrs_date` (`date_versement`),
  KEY `idx_vrs_banque` (`banque`),
  KEY `idx_vrs_bordereau` (`numero_bordereau`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bordereaux de versement des fonds sur les comptes bancaires';

CREATE TABLE IF NOT EXISTS `frais_mobile_money` (
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
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_fmm_date` (`date_frais`),
  KEY `idx_fmm_op` (`operateur`),
  KEY `idx_fmm_ref` (`reference_transaction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Commissions et frais prélevés par les opérateurs de paiement mobile';

CREATE TABLE IF NOT EXISTS `dossiers_allocations` (
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
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_dos_adherent` (`adherent_id`),
  KEY `idx_dos_matricule` (`matricule`),
  KEY `idx_dos_statut` (`statut`),
  KEY `idx_dos_cnps` (`numero_cnps`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Suivi des dossiers de prestations familiales et sécurité sociale CNPS';

CREATE TABLE IF NOT EXISTS `banques_partenaires` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom_banque` VARCHAR(150) NOT NULL,
  `actif` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_banque_nom` (`nom_banque`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Liste des institutions bancaires partenaires';

CREATE TABLE IF NOT EXISTS `employes` (
  `id` VARCHAR(64) NOT NULL,
  `matricule` VARCHAR(50) NOT NULL,
  `nom` VARCHAR(100) NOT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `poste` VARCHAR(150) NOT NULL,
  `departement` VARCHAR(150) DEFAULT NULL,
  `salaire_base` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `actif` TINYINT(1) NOT NULL DEFAULT 1,
  -- ---- colonnes ajoutées (absentes du dump, requises par la fiche salarié et la paie) ----
  `sexe` ENUM('M', 'F') NOT NULL DEFAULT 'M',
  `type_contrat` VARCHAR(50) NOT NULL DEFAULT 'CDI',
  `date_embauche` DATE DEFAULT NULL,
  `numero_cnps` VARCHAR(50) DEFAULT NULL,
  `numero_cmu` VARCHAR(50) DEFAULT NULL,
  `sursalaire` DECIMAL(15,2) DEFAULT NULL,
  `indemnite_transport` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `indemnite_logement` DECIMAL(15,2) DEFAULT NULL,
  `primes_fixes` DECIMAL(15,2) DEFAULT NULL,
  `nombre_parts_fiscales` DECIMAL(4,1) NOT NULL DEFAULT 1.0,
  `mode_paiement` VARCHAR(50) NOT NULL DEFAULT 'Virement bancaire',
  `banque_nom` VARCHAR(150) DEFAULT NULL,
  `numero_compte_bancaire` VARCHAR(100) DEFAULT NULL,
  `telephone` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emp_matricule` (`matricule`),
  KEY `idx_emp_actif` (`actif`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Personnel permanent et contractuels';

CREATE TABLE IF NOT EXISTS `bulletins_paie` (
  `id` VARCHAR(64) NOT NULL,
  `bulletin_numero` VARCHAR(100) NOT NULL,
  `employe_id` VARCHAR(64) NOT NULL,
  `mois` VARCHAR(30) NOT NULL,
  `periode_libelle` VARCHAR(50) DEFAULT NULL,
  `salaire_base` DECIMAL(15,2) NOT NULL,
  `total_gains_bruts` DECIMAL(15,2) NOT NULL,
  `net_a_payer` DECIMAL(15,2) NOT NULL,
  `statut` VARCHAR(50) NOT NULL DEFAULT 'Brouillon',
  -- ---- colonnes ajoutées ----
  `employe_matricule` VARCHAR(50) DEFAULT NULL,
  `employe_nom_complet` VARCHAR(200) DEFAULT NULL,
  `type_beneficiaire` VARCHAR(30) NOT NULL DEFAULT 'EMPLOYE',
  `date_edition` DATE DEFAULT NULL,
  `date_paiement` DATE DEFAULT NULL,
  `valide_par` VARCHAR(150) DEFAULT NULL,
  `date_validation` DATE DEFAULT NULL,
  `depense_associee_id` VARCHAR(64) DEFAULT NULL,
  `details_json` JSON DEFAULT NULL,                                       -- détail complet du calcul (gains, retenues, charges patronales...)
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_bp_emp` (`employe_id`),
  KEY `idx_bp_periode` (`mois`),
  KEY `idx_bp_statut` (`statut`),
  KEY `idx_bp_depense` (`depense_associee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bulletins de salaire édités par le DAF';

CREATE TABLE IF NOT EXISTS `journal_operations` (
  `id` VARCHAR(64) NOT NULL,
  `date_heure` DATETIME(3) NOT NULL,
  `utilisateur` VARCHAR(150) NOT NULL,
  `role` VARCHAR(100) NOT NULL,
  `type_operation` VARCHAR(100) NOT NULL,
  `entite` VARCHAR(150) NOT NULL,
  `matricule` VARCHAR(50) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  -- ---- colonnes ajoutées ----
  `utilisateur_id` VARCHAR(64) DEFAULT NULL,
  `adherent_nom` VARCHAR(200) DEFAULT NULL,
  `agent_enregistreur` VARCHAR(200) DEFAULT NULL,
  `action` VARCHAR(50) DEFAULT NULL,
  `code_securite_valide` TINYINT(1) DEFAULT NULL,
  `anciennes_informations` TEXT DEFAULT NULL,
  `nouvelles_informations` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_jour_date` (`date_heure`),
  KEY `idx_jour_user` (`utilisateur`),
  KEY `idx_jour_op` (`type_operation`),
  KEY `idx_jour_mat` (`matricule`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Piste d audit et traçabilité des opérations sensibles';

-- ---------------------------------------------------------------------------
-- Tables absentes du dump (modules Direction, PV de réunion, rapports agents)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `partenaires` (
  `id` VARCHAR(64) NOT NULL,
  `nom_organisation` VARCHAR(200) NOT NULL,
  `sigle` VARCHAR(50) DEFAULT NULL,
  `secteur` VARCHAR(100) NOT NULL,
  `personne_contact` VARCHAR(150) NOT NULL,
  `titre_contact` VARCHAR(150) NOT NULL,
  `telephone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `adresse` VARCHAR(300) DEFAULT NULL,
  `statut` VARCHAR(60) NOT NULL,
  `priorite` VARCHAR(40) NOT NULL,
  `potentiel_synergie` TEXT NOT NULL,
  `date_premier_contact` DATE DEFAULT NULL,
  `enregistre_par` VARCHAR(150) NOT NULL,
  `notes_historique` TEXT DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_part_statut` (`statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Partenaires institutionnels (Direction)';

CREATE TABLE IF NOT EXISTS `rendez_vous` (
  `id` VARCHAR(64) NOT NULL,
  `titre` VARCHAR(250) NOT NULL,
  `partenaire_id` VARCHAR(64) DEFAULT NULL,
  `nom_interlocuteur_ou_partenaire` VARCHAR(200) NOT NULL,
  `date_rdv` DATE NOT NULL,
  `heure` VARCHAR(5) NOT NULL,
  `duree_estimee` VARCHAR(50) DEFAULT NULL,
  `modalite` VARCHAR(50) NOT NULL,
  `lieu_precision` VARCHAR(300) DEFAULT NULL,
  `participants_direction` VARCHAR(300) NOT NULL,
  `responsable_principal` VARCHAR(10) NOT NULL,
  `statut` VARCHAR(20) NOT NULL,
  `ordre_du_jour` TEXT NOT NULL,
  `compte_rendu` MEDIUMTEXT DEFAULT NULL,
  `engagements_et_actions` TEXT DEFAULT NULL,
  `date_rappel` DATE DEFAULT NULL,
  `enregistre_par` VARCHAR(150) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_rdv_date` (`date_rdv`),
  KEY `idx_rdv_statut` (`statut`),
  KEY `idx_rdv_partenaire` (`partenaire_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agenda de la Direction (DG / DGA)';

CREATE TABLE IF NOT EXISTS `notes_direction` (
  `id` VARCHAR(64) NOT NULL,
  `titre` VARCHAR(250) NOT NULL,
  `date_note` DATE NOT NULL,
  `categorie` VARCHAR(80) NOT NULL,
  `partenaire_lie` VARCHAR(200) DEFAULT NULL,
  `rendez_vous_lie` VARCHAR(64) DEFAULT NULL,
  `contenu` MEDIUMTEXT NOT NULL,
  `points_cles` JSON DEFAULT NULL,
  `prochaine_echeance` DATE DEFAULT NULL,
  `niveau_confidentialite` VARCHAR(60) NOT NULL,
  `auteur` VARCHAR(150) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_note_date` (`date_note`),
  KEY `idx_note_cat` (`categorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Notes spécifiques de la Direction';

CREATE TABLE IF NOT EXISTS `rapports_reunions` (
  `id` VARCHAR(64) NOT NULL,
  `titre` VARCHAR(250) NOT NULL,
  `type_reunion` VARCHAR(80) NOT NULL,
  `date_reunion` DATE NOT NULL,
  `heure_debut` VARCHAR(5) NOT NULL,
  `heure_fin` VARCHAR(5) DEFAULT NULL,
  `lieu` VARCHAR(250) NOT NULL,
  `president_seance` VARCHAR(150) NOT NULL,
  `secretaire_seance` VARCHAR(150) NOT NULL,
  `participants_presents` TEXT NOT NULL,
  `participants_absents` TEXT DEFAULT NULL,
  `ordre_du_jour` TEXT NOT NULL,
  `synthese_discussions` MEDIUMTEXT NOT NULL,
  `decisions` JSON DEFAULT NULL,
  `prochaine_reunion_date` DATE DEFAULT NULL,
  `statut` VARCHAR(30) NOT NULL DEFAULT 'Brouillon',
  `redige_par` VARCHAR(150) NOT NULL,
  `pieces_jointes_ou_notes` TEXT DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_reu_date` (`date_reunion`),
  KEY `idx_reu_statut` (`statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Procès-verbaux et rapports de réunion';

CREATE TABLE IF NOT EXISTS `rapports_agents` (
  `id` VARCHAR(64) NOT NULL,
  `date_rapport` DATE NOT NULL,
  `gestionnaire_id` VARCHAR(64) DEFAULT NULL,
  `agent_nom` VARCHAR(150) NOT NULL,
  `agent_telephone` VARCHAR(50) DEFAULT NULL,
  `zone_secteur` VARCHAR(150) NOT NULL,
  `type_mission` VARCHAR(150) NOT NULL,
  `adherents_visites` INT NOT NULL DEFAULT 0,
  `adherents_cotisants` INT NOT NULL DEFAULT 0,
  `nouvelles_adhesions` INT NOT NULL DEFAULT 0,
  `montant_especes_remis` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `montant_mobile_money_declare` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `montant_total_collecte` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `conformite_caisse` VARCHAR(100) NOT NULL,
  `ecart_montant` DECIMAL(15,2) DEFAULT NULL,
  `justification_ecart` TEXT DEFAULT NULL,
  `difficultes_rencontrees` TEXT DEFAULT NULL,
  `actions_demain` TEXT DEFAULT NULL,
  `observations` TEXT DEFAULT NULL,
  `commentaires_caissiere` TEXT DEFAULT NULL,
  `saisi_par` VARCHAR(150) NOT NULL,
  `date_heure_saisie` DATETIME(3) DEFAULT NULL,
  `statut_validation` VARCHAR(40) NOT NULL DEFAULT 'Enregistré par Caissière',
  `visa_daf` VARCHAR(200) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_ra_date` (`date_rapport`),
  KEY `idx_ra_gest` (`gestionnaire_id`),
  KEY `idx_ra_statut` (`statut_validation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Rapports journaliers des agents de terrain (saisie caissière)';
