# GUIDE D'IMPORTATION DE LA BASE DE DONNÉES MYSQL - COSITI

Ce dossier contient l'exportation complète des données de la coopérative **COSITI** prête à être importée dans n'importe quel serveur **MySQL 5.7+**, **MySQL 8.0+** ou **MariaDB 10.3+**.

---

## 1. Structure des Fichiers

* `cositi_database_mysql_dump.sql` : **Dump SQL unique et consolidé**. Contient l'ensemble des 12 tables et toutes les données avec clés primaires, index et contraintes.
* `tables/` : Répertoire contenant chaque table dans un fichier SQL séparé :
  - `01_parametres.sql` : Configuration, coordonnées, seuil 15 000 FCFA.
  - `02_gestionnaires_portefeuille.sql` : Gestionnaires de secteur.
  - `03_utilisateurs.sql` : Utilisateurs et droits d'accès.
  - `04_adherents.sql` : Fiches adhérents, numéros CNPS, tarifs.
  - `05_cotisations.sql` : Journal des cotisations perçues.
  - `06_depenses_courantes.sql` : Décaissements (Exploitation CNPS / Apport PCA).
  - `07_versements_bancaires.sql` : Remises bancaires et points d'arrêt.
  - `08_frais_mobile_money.sql` : Frais opérateurs Orange, Wave, MTN, Moov.
  - `09_dossiers_allocations.sql` : Prestations familiales et dossiers CNPS.
  - `10_banques_partenaires.sql` : Banques partenaires.
  - `11_employes_et_paie.sql` : Employés et paie du personnel.
  - `12_journal_operations.sql` : Piste d'audit et historique des opérations.

---

## 2. Méthode 1 : Import via phpMyAdmin (Recommandé pour cPanel, Laragon, XAMPP, Wamp)

1. Connectez-vous à votre interface **phpMyAdmin**.
2. Créez une nouvelle base de données nommée `cositi_ci` (Interclassement : `utf8mb4_unicode_ci`).
3. Cliquez sur la base `cositi_ci` dans le volet de gauche.
4. Cliquez sur l'onglet **Importer** en haut.
5. Cliquez sur **Parcourir** et sélectionnez le fichier `cositi_database_mysql_dump.sql`.
6. Laissez le jeu de caractères sur **utf-8** et cliquez sur **Exécuter** en bas de page.
7. Un message vert confirme : *"L'importation a réussi, X requêtes exécutées."*

---

## 3. Méthode 2 : Ligne de commande MySQL (CLI)

Ouvrez un terminal ou invite de commande :

```bash
# 1. Se connecter à MySQL et créer la base de données
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS cositi_ci CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Importer le dump consolidé
mysql -u root -p cositi_ci < cositi_database_mysql_dump.sql
```

---

## 4. Méthode 3 : Import table par table

Pour importer uniquement une table spécifique (ex. les adhérents ou les cotisations) :

```bash
mysql -u root -p cositi_ci < tables/04_adherents.sql
mysql -u root -p cositi_ci < tables/05_cotisations.sql
```

---

## 5. Exemple de Connexion PHP / Node.js

### Exemple PHP (PDO)
```php
<?php
$host = 'localhost';
$db   = 'cositi_ci';
$user = 'votre_utilisateur';
$pass = 'votre_mot_de_passe';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
```

### Exemple Node.js (mysql2)
```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'votre_utilisateur',
  password: 'votre_mot_de_passe',
  database: 'cositi_ci',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
});
```

---
*Document édité automatiquement par le système COSITI - Tous droits réservés.*
