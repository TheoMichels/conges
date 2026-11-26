# Build Report — admin-year-management
- Statut : READY_FOR_QA ; cycle 2 ; branche feature/admin-year-management.
- Périmètre : AnnualEntitlements, repository et types RPC, migration SQL, tests annuels ; aucun changement distant.
- Données : fonction SQL `holy.admin_year_catalog` ajoutée ; migration `20261129000000_admin_year_catalog` à appliquer au go ; schéma Prisma inchangé.
- UI : menu des années actives, création à droite, reprise des brouillons ; chargement squelette, état vide et erreur avec réessai ; champs inline et actions identifiées par testID, retours et contrôles tactiles.
- Les champs sont disposés en colonnes souples et passent à la ligne sur mobile ; les éditions non enregistrées des autres lignes restent présentes lors d'un enregistrement.

| AC | Code | Vérification |
|---|---|---|
| 01 | AnnualEntitlements, admin_year_catalog | E2E année vide/menu actif ; SQL isolé catalogue actif/brouillon et refus non-admin |
| 02 | AnnualEntitlements | E2E année invalide/doublon, création, reprise du brouillon après reload et activation |
| 03 | AnnualEntitlements, annualEntitlementRepository | E2E validation, saisie inline, sauvegarde, activation, fériés et reload ; SQL isolé |
| 04 | CompanyScreen inchangé | E2E annual-entitlements mobile/calcul/confidentialité ; company-accounts recherche et activation |

- Tests préparatoires : typecheck PASS ; lint PASS ; unit PASS (81) ; Playwright PASS (annual-entitlements 1, company-accounts 7).
- Harness final sur commit : à consulter dans `.agents/state/verify-result.json`.
- Tests SQL : PGlite isolé, migrations et autorisations ; E2E : Supabase simulé, pas de base réelle.
- Correction revue : réponse tardive ignorée après changement d’année ; test rouge avant correction, vert après.
- QA : sélection de deux années, réponse invalide/réessai et report modifié persisté couverts en E2E.
- Décisions modifiant les AC : aucune. Pas de commande sur base distante.
