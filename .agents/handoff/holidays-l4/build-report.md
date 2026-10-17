# Build Report — holidays-l4

- **Statut** : READY_FOR_QA
- **Cycle** : 1
- **Branche / workspace** : `refactor/holidays-l4`

## Fichiers créés / modifiés
| Fichier | Rôle | Périmètre |
|---|---|---|
| `package.json`, `package-lock.json` | Dépendances (`@prisma/client`, `prisma`, `@electric-sql/pglite`, `@types/node`) et scripts | Oui |
| `prisma/schema.prisma` | Modèle multiSchema (`holidays`, `auth`) : `YearPlan`, `LeaveEntry`, `UserSettings` | Oui |
| `prisma/migrations/*` | `migration_lock.toml` et migration SQL canonique §3 (RLS 100%, 4 policies, FK cascade, triggers) | Oui |
| `scripts/deploy-db.mjs` | Runner de déploiement via `DIRECT_URL` / `POSTGRES_URL_NON_POOLING` | Oui |
| `tests/prismaMigrations.test.mjs` | Suite de tests unitaires PGlite (structure, RLS, triggers, cascades) | Oui |
| `.agents/project.md` | Fiche projet mise à jour (schéma `holidays`, commandes DB) | Oui |
| `~/.agents/rules/migration-roadmap.md` | Suivi de migration mis à jour pour Holidays (L4 validé) | Oui |

## Données & Sécurité
- Changement de schéma : oui (`prisma/schema.prisma` et `20261017000000_holidays_multischema/migration.sql`).
- Aucune commande distante exécutée : confirmé (tests in-memory PGlite).

## Harness (`verify-result.json`)
| typecheck | lint | unit | build | e2e |
|---|---|---|---|---|
| PASS | PASS | PASS | PASS | PASS |

## Acceptation et preuves
| AC | Implémentation | Contrôle / Test | Résultat |
|---|---|---|---|
| AC-01 | `prisma/schema.prisma` | `tests/prismaMigrations.test.mjs` | PASS (`multiSchema`, 3 modèles, relations) |
| AC-02 | `prisma/migrations/.../migration.sql` | `tests/prismaMigrations.test.mjs` | PASS (100% RLS, 4 policies/table, FK cascade, trigger) |
| AC-03 | `scripts/deploy-db.mjs` & `package.json` | `tests/prismaMigrations.test.mjs` | PASS (`DIRECT_URL` requis, pas de `db:push`) |
| AC-04 | `tests/prismaMigrations.test.mjs` | PGlite in-memory (48 tests unit) | PASS (isolation stricte userA/userB, cascades) |
| AC-05 | Intégralité du livrable L4 | `verify-harness.sh --strict` | PASS (code 0) |
