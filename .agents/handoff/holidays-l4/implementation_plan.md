# Plan d’implémentation — holidays-l4

## Besoin reformulé et périmètre
- Objectif : Implémenter le Lot 4 (L4) de la convergence de l'application Holidays vers la stack cible (`stack-target.md`).
- Périmètre inclus :
  1. Installation de `prisma`, `@prisma/client` et `@electric-sql/pglite` (tests in-memory PostgreSQL).
  2. Configuration de `prisma/schema.prisma` en `multiSchema` (`["holidays", "auth"]`) avec `YearPlan`, `LeaveEntry` et `UserSettings`.
  3. Rédaction de la migration SQL canonique `prisma/migrations/20261017000000_holidays_multischema/migration.sql` :
     - Schéma `holidays`, fonction `set_updated_at()`.
     - Tables `year_plans`, `leave_entries`, `user_settings`.
     - FK `auth.users(id)` ON DELETE CASCADE.
     - RLS activée sur 100 % des tables avec 4 policies (`auth.uid() = user_id`) par table.
     - Triggers `set_updated_at()` sur chaque table.
     - Permissions et grants explicites (`anon`, `authenticated`, `service_role`).
  4. Implémentation du script de déploiement canonique `scripts/deploy-db.mjs` et des scripts `package.json` (`postinstall: "prisma generate"`, `db:deploy`, `db:studio`).
  5. Écriture de la suite de tests `tests/prismaMigrations.test.mjs` exécutant la migration réelle sur PGlite et validant structure, RLS, triggers et cascades.
  6. Passage intégral du harness `--strict`.
- Périmètre exclu :
  - Auth Supabase et interface utilisateur de connexion (réservé à L5).
  - Bascule des données de production Upstash vers Supabase et modification des variables d'environnement distantes Vercel (réservé à L6, soumis à confirmation explicite).

## Challenge et décisions
| Fait vérifié / hypothèse / question | Recommandation et conséquence | Décision reçue / à obtenir |
|---|---|---|
| Modèle de données Holidays (`YearPlan`, `LeaveEntry`) | Aligner les modèles Prisma sur `src/types/yearPlan.ts` avec FK cascade entre `year_plans` et `leave_entries`. Ajouter `user_settings` pour les préférences utilisateur standard. | Conforme §3 |
| Types numériques pour les congés (demi-journées possibles) | Utiliser `Decimal @db.Decimal(5, 1)` pour `initial_leave`, `carried_over`, `csupp`, `public_holidays`, `days` afin de supporter les demi-journées sans imprécision flottante. | Conforme §3 |
| Exécution du SQL sans shadow database | Utiliser des migrations versionnées autonomes avec `migration_lock.toml` et exécuter via `scripts/deploy-db.mjs`. | Conforme §3 |
| Tests de migration reproductibles | Utiliser `@electric-sql/pglite` en devDependencies pour tester les migrations, rôles et RLS localement dans `npm test`. | Validé sur Todo et NovaBudget |

- Questions : Aucune (gabarit strictement cadré par `stack-target.md` §3).
- Autorisation : Feu vert explicite utilisateur pour l'étape 4 de la migration.

## Critères d’acceptation — source de vérité

| AC | Préconditions | Action | Résultat observable / mesure | Vérification envisagée |
|---|---|---|---|---|
| AC-01 | Prisma non configuré | Définition de `prisma/schema.prisma` | multiSchema (`holidays`, `auth`), URL pooler + direct, modèles `YearPlan`, `LeaveEntry`, `UserSettings` | `npx prisma generate` / tests unitaires |
| AC-02 | Aucun schéma SQL | Rédaction de `migration.sql` avec gabarit §3 | Schéma `holidays`, FK `auth.users`, 100% RLS (4 policies/table), triggers `updated_at`, grants | Tests SQL PGlite |
| AC-03 | `scripts/deploy-db.mjs` en stub | Implémentation de `deploy-db.mjs` | Script de déploiement utilisant `DIRECT_URL` / `POSTGRES_URL_NON_POOLING`, scripts `db:deploy` configurés | Test unitaire / script check |
| AC-04 | Aucun test de migration | Création de `tests/prismaMigrations.test.mjs` | Validation PGlite de l'exécution SQL, isolation RLS stricte multi-utilisateurs, triggers et cascade FK | `npm test` vert |
| AC-05 | Code L4 complet | Exécution du harness strict | `verify-harness.sh --strict` vert (typecheck, lint, unit, build, e2e) | Harness de vérification |

## Architecture et Données
- Schéma cible Postgres : `holidays`
- Tables : `holidays.year_plans`, `holidays.leave_entries`, `holidays.user_settings`
- Auth : FK vers `auth.users(id)`
- RLS : 100% des tables filtrées par `auth.uid() = user_id`

## Mode d’équipe et périmètres
Séquentiel : `fullstack-builder` -> `qa-inspector`

| Sous-agent | AC concernés | Mission | Fichiers autorisés | Workspace / branche |
|---|---|---|---|---|
| fullstack-builder | AC-01 à AC-05 | Implémenter Prisma multiSchema, migration SQL, runner de déploiement, tests PGlite et project.md | `package.json`, `package-lock.json`, `prisma/*`, `scripts/deploy-db.mjs`, `tests/prismaMigrations.test.mjs`, `.agents/project.md` | Courant (`refactor/holidays-l4`) |
