-- =============================================================================
-- Création MANUELLE de la base et de l'utilisateur de l'application COSITI
-- (alternative à « npm run db:setup »). À exécuter avec un compte administrateur MySQL :
--     mysql -u root -p < database/00_create_database_and_user.sql
-- Puis reporter le même mot de passe dans Backend/.env (DB_USER / DB_PASSWORD / DB_NAME).
-- Au premier démarrage, l'API crée les tables (database/schema.sql) et importe database_mysql/ si la base est vide.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `cositi_ci` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ⚠️ Remplacez le mot de passe ci-dessous (et celui de .env) avant de l'exécuter.
CREATE USER IF NOT EXISTS 'cositi'@'localhost' IDENTIFIED BY 'CHANGEZ_MOI_mot_de_passe_fort';

-- Privilèges nécessaires à l'API sur sa base (données + création / évolution des tables)
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON `cositi_ci`.* TO 'cositi'@'localhost';
-- Facultatif : base jetable des tests automatiques (npm test crée/supprime `cositi_test`)
-- GRANT ALL PRIVILEGES ON `cositi_test`.* TO 'cositi'@'localhost';
