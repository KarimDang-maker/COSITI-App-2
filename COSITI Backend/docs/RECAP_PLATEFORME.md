# Récapitulatif de la plateforme COSITI — ce qui fonctionne, ce qui ne fonctionne pas, ce qu'il faut améliorer

> Établi à l'issue de la vérification complète front ↔ API ↔ MySQL, du durcissement des données financières, de la mise en place de
> l'échange Excel et d'une relecture de code indépendante. Tout ce qui est annoncé « fonctionne » a été **exécuté**, pas seulement lu.

## 1. Comment cela a été vérifié

| Niveau | Outil | Résultat |
|---|---|---|
| API + MySQL | `npm test` — 126 scénarios sur des bases MySQL jetables | **126 / 126** |
| CRUD et persistance | `tests/persistance.test.js` — chaque donnée : créer → relire → modifier → **redémarrer la base** → supprimer, contrôle SQL direct à chaque étape | 19 / 19 |
| Données financières | `tests/finances.test.js` — précision au centime, totaux = SQL, paie ↔ dépense, concurrence, redémarrage | 23 / 23 |
| Modèles de lecture | `tests/rapports.test.js` — rapprochement, état mensuel, tableau de bord, paie CNPS recoupés avec SQL | 7 / 7 |
| Échange Excel | `tests/excel.test.js` — dont l'**aller-retour** export → effacement SQL → import | 18 / 18 |
| Interface réelle | `npm run test:e2e` — Chrome → front → API → MySQL : les chiffres **affichés** sont comparés à ceux du serveur ; export et import Excel faits par l'interface | **30 / 30** |
| Typage / build | `tsc --noEmit`, `vite build` | sans erreur |
| Documentation | OpenAPI (133 opérations) valide ; couverture front ↔ back : 0 manque, 0 endpoint non appelé | OK |

## 2. Ce qui fonctionne

### Intégration front ↔ back ↔ base
- **Toutes les fonctionnalités du front appellent un endpoint** et toutes les données affichées viennent de MySQL (`localStorage` supprimé).
- Les calculs métier ne sont **plus faits dans le navigateur**. Le serveur calcule et le front affiche :
  statistiques de chaque adhérent, alertes, tableau de bord, totaux / réserve CNPS / solde réel en banque / taux de couverture,
  état mensuel (totaux, modes de paiement, agents, état nominatif), suivi des versements (repères, cotisations en attente),
  récapitulatif de paie, déclarations CNPS et fiscale, paie CNPS des adhérents, tranche légale, aperçus de bulletin en direct.
- Un chiffre affiché ne peut pas être périmé : après chaque action, les listes **et** les modèles calculés sont rechargés.

### CRUD et persistance (19 familles de données vérifiées en SQL)
Gestionnaires, banques, adhérents (statut, portefeuille, assiette, immatriculation, « sans enfant »), cotisations (régularisation incluse),
dossiers CNPS, dépenses, versements, frais Mobile Money, employés, paie (génération, modification recalculée, validation, suppression),
partenaires, rendez-vous, notes de direction, PV de réunion, rapports d'agents (visas DAF puis Direction), paramètres, utilisateurs
(création, identifiants, mot de passe, suppression), journal, mise à jour logicielle et réinitialisation.
Chaque opération : écrite en base, relue après redémarrage, **tracée au journal avec son auteur**.

### Données financières (priorité critique)
- **Arithmétique exacte au centime** (centimes entiers) : 0,10 + 0,20 = 0,30. Montants refusés avant la base s'ils ont plus de 2 décimales,
  sont vides, négatifs, hors capacité, en notation `0x10` / `1e3` ou inférieurs au centime.
- **Atomicité** : une opération refusée ne laisse aucune trace partielle ; opérations et journal validés ensemble.
- **Concurrence** : 15 cotisations simultanées → 15 références uniques ; 8 adhérents simultanés → matricules sans trou ; 3 validations de paie
  simultanées → une seule dépense `PAIE-AAAA-MM`.
- **Cohérence paie ↔ comptabilité** : la dépense de paie suit la masse salariale réelle si un bulletin est modifié puis la paie revalidée.
- **Contrôle d'intégrité** (`GET /finances/controle`, bouton dans *Finances → Synthèse*) : détecte cotisations orphelines ou en doublon, frais
  incohérents, versements, écriture de paie ≠ bulletins, bulletins dont le recalcul diffère, rapports d'agents faux. Testé en corrompant
  volontairement la base.
- Erreurs MySQL (doublon, valeur trop longue…) : statuts 4xx clairs, plus de 500.

### Échange Excel (même format dans les deux sens)
- Le serveur produit **et relit** le même classeur : une feuille par donnée, montants numériques, dates AAAA-MM-JJ, colonne « ID ».
- **Aller-retour prouvé** : export → effacement SQL de 8 tables → import → mêmes ID, montants, dates, points d'arrêt et séquence de matricules.
- Import en **deux temps** : simulation exacte (tout exécuté puis annulé), puis import réel avec code de confirmation. Tout ou rien.
- Chaque ligne passe par les mêmes validations et règles métier que la saisie (adhérent radié, doublon de référence, frais > transaction…) et
  le même journal. Jamais de suppression ; cellule vide = valeur conservée ; fichier rejoué = aucun doublon.
- Disponible dans *Paramètres*, *Finances* et les boutons d'export des listes (adhérents, cotisations, gestionnaires).

### Sécurité et accès
Connexion individuelle (aucun basculement par PIN), droits par rôle vérifiés pour 10 rôles, export et import limités aux données autorisées au
profil, mots de passe hachés, refresh tokens hachés, rate limiting, sessions révoquées à la modification des identifiants.

## 3. Défauts trouvés et corrigés pendant cette vérification

| # | Défaut | Gravité |
|---|---|---|
| 1 | **Calcul CNPS des adhérents faux à l'écran** : l'écran Paie appliquait une TDL simplifiée (500 F pour 85 000 F, le barème dit 250 F) et affichait « IRPP 0 F » en dur. Écran, exports et fiches affichaient des montants différents des bulletins enregistrés. | haute |
| 2 | **La sauvegarde Excel complète exportait des colonnes vides** (noms de champs inexistants) et ne pouvait pas être réimportée. | haute |
| 3 | **Classeur Excel piégé** (16 Ko déclarant des millions de lignes) : blocage du serveur de 16 s à plus d'une heure. Corrigé (bornes de lecture) et testé avec un vrai classeur piégé. | haute |
| 4 | **Dépense de paie jamais resynchronisée** si un bulletin changeait après validation (écart silencieux en comptabilité). | haute |
| 5 | **Validation de paie non protégée** contre un double clic : deux dépenses possibles. | haute |
| 6 | Assiette cotisable CNPS modifiable par un profil sans droit financier (PUT adhérent, import) et sans recalcul des bulletins. | haute |
| 7 | Sommes en virgule flottante partout ; montants vides / `null` / `0x10` acceptés comme 0 ; montants inférieurs au centime stockés `0,00`. | moyenne |
| 8 | Erreurs MySQL transformées en 500 ; référence de cotisation unique seulement par contrôle applicatif (maintenant un index UNIQUE). | moyenne |
| 9 | Tranche d'un versement non recalculée à la modification de sa date ; origine des fonds non recalculée à la modification d'une dépense. | moyenne |
| 10 | Signatures des états imprimés **codées en dur** avec des noms qui ne sont pas ceux des acteurs (« OUATTARA Salif » comme DAF…). Remplacées par les acteurs en poste. | moyenne |
| 11 | Tuile « dossiers à constituer » du tableau de bord comptait des travailleurs « sans enfant » que les alertes excluent : alignée sur les alertes. | basse |
| 12 | Import « ignorer les erreurs » : un verrou mortel MySQL pouvait valider des lignes hors transaction ; deux paiements identiques d'un même fichier étaient fusionnés ; date modifiée sans recalcul du mois ; « 1.500 » lu 1,5. | moyenne |

## 4. Ce qui ne fonctionne pas encore / limites connues

1. **Export SQL (MySQL .sql / .zip)** : le script est toujours mis en forme dans le navigateur (`mysqlExportUtils.ts`) à partir des listes chargées. Aucun calcul métier, mais ce n'est pas un export serveur.
2. **PDF (reçus, rapports) et fiches de paie** : rendu jsPDF dans le navigateur (mise en forme de données issues du serveur). Les sous-totaux de listes filtrées à l'écran sont additionnés côté navigateur, avec une somme exacte.
3. **Catalogue CNPS** (`cnpsBranches.ts`) : copie locale de présentation du catalogue serveur (`data/cnps.js`) — risque de divergence si l'un change.
4. **Excel — périmètre** : utilisateurs (volontaire : identifiants), dossiers CNPS, partenaires, rendez-vous, notes, PV, rapports d'agents et journal ne sont **pas** dans le format d'échange. Les bulletins de paie sont en export seul (calculés par le serveur).
5. **Excel — volume** : 10 000 lignes par feuille au maximum ; l'import coûte ≈ 35 ms par ligne (3 500 lignes ≈ 2 min). Un chiffre saisi *comme nombre* dans une colonne de texte (téléphone, N° de compte) perd ses zéros de tête.
6. **Une simulation d'import verrouille la ligne des paramètres** quand elle crée des adhérents : une saisie d'adhérent concurrente peut attendre (puis recevoir une erreur 503 « réessayez »).
7. **Contrôle d'intégrité** : ne détecte pas qu'une tranche de versement est périmée après modification/suppression d'une cotisation ; il ne vérifie pas non plus l'unicité des CNI et N° CNPS (contrôlée par l'application seulement).
8. **Aucune clé étrangère ni contrainte `CHECK`** en base (héritage du dump) : l'intégrité référentielle repose sur le serveur.
9. Tests du front : un seul parcours navigateur automatisé (30 contrôles) ; aucun test unitaire de composants.

## 5. Ce que nous devons améliorer (par priorité)

**À faire avant la mise en production**
1. Changer `ALLOW_DEMO_RESET=false` (l'endpoint de réinitialisation efface **toutes** les données), `MAINTENANCE_CODE`, le code de confirmation `0000`, tous les mots de passe de démonstration ; `SEED_FORCE_PASSWORD_CHANGE=true`.
2. Retirer `DB_ADMIN_PASSWORD` du `.env` une fois la base créée, donner à `DB_PASSWORD` une valeur différente de celle de root, définir des `JWT_*` aléatoires.
3. Sauvegardes MySQL planifiées (`mysqldump`) **et test de restauration**.

**Intégrité et finance**
4. Ajouter clés étrangères et contraintes `CHECK (montant > 0)` après nettoyage des données ; index UNIQUE sur CNI et N° CNPS.
5. Décider avec la direction si les dépenses « En attente » comptent dans les décaissements du rapprochement (comportement actuel, identique à l'ancien écran).
6. Compléter le contrôle d'intégrité (tranches de versement) et le planifier (rapport hebdomadaire).

**Fonctionnel**
7. Export SQL côté serveur ; export/import Excel des dossiers, rapports d'agents et PV ; import asynchrone avec barre de progression pour les gros fichiers.
8. Remplacer la copie locale du catalogue CNPS par l'appel `GET /dossiers/catalogue`.

**Qualité**
9. Étendre les tests navigateur (création par formulaire, suppression avec code, un parcours par rôle) ; ajouter l'exécution des tests à l'intégration continue.
10. Passer les agrégats (tableau de bord, synthèse) en requêtes SQL `SUM / GROUP BY` si le volume dépasse quelques dizaines de milliers de lignes (aujourd'hui calculés en mémoire, exacts mais plus coûteux).
11. Découper le bundle du front (avertissement de taille de `vite build`).

## 6. Pour rejouer la vérification

```bash
cd Backend
npm run db:setup -- --with-tests      # une fois : droits sur les bases de test
npm test                              # 126 scénarios (bases jetables)
npm start                             # API ; puis, à la racine : npm run dev
npm run test:e2e                      # parcours Chrome réel (30 contrôles, nettoie ses données de test)
npm run docs:all                      # Swagger, matrice des rôles, couverture front ↔ back
```
