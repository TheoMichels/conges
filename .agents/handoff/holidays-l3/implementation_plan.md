# Plan d’implémentation — holidays-l3

## Besoin reformulé et périmètre
- Objectif : Réaliser le Lot 3 (L3) de la migration de l'application Holidays vers la stack cible (`stack-target.md`).
- Périmètre inclus :
  1. Installation de `zod` et schémas de validation runtime pour les types `YearPlan`, `LeaveEntry`, `LeaveEntryDraft`, `HalfDay`.
  2. Création de `src/config/storageMode.ts` selon le gabarit canonique §4 (décision loopback vs Vercel).
  3. Refactorisation de `src/storage/yearPlanRepository.ts` : validation Zod des lectures, nouvelle clé canonique `@holidays_year_plans_v1`, rétrocompatibilité et migration transparente depuis `conges:yearPlans` (aucune perte de données), opérations CRUD standard (`list`, `get`, `create`, `update`, `remove`, `saveAll`).
  4. Rédaction de `docs/LOCAL_STORAGE.md` (schéma, clés, isolation par origine, procédures d'inspection/nettoyage).
  5. Tests unitaires (validation Zod, résolution de mode, migration) et passage du harness `--strict`.
- Périmètre exclu :
  - Prisma multiSchema et migrations SQL (réservés à L4).
  - Auth Supabase et syncService distant (réservés à L5).
  - Bascule de production Upstash vers Supabase (réservée à L6).

## Challenge et décisions
| Fait vérifié / hypothèse / question | Recommandation et conséquence | Décision reçue / à obtenir |
|---|---|---|
| Clé de stockage historique `conges:yearPlans` présente chez les utilisateurs | Lire `@holidays_year_plans_v1` en priorité. Si absente et que `conges:yearPlans` existe, migrer vers `@holidays_year_plans_v1` sans supprimer l'ancienne clé. | Conforme §4 et règle d'or migration |
| Interface repository attendue par les hooks existants | Conserver `list()` et `saveAll()` pour compatibilité immédiate avec `useYearPlans`, tout en fournissant `get()`, `create()`, `update()`, `remove()` conformes §4. | Recommandé pour éviter toute régression UI |
| Mode de stockage en local | Mode local pur en loopback : pas d'appels réseau, données dans AsyncStorage. | Conforme §4 |

- Questions : Aucune (périmètre et directives clairs dans `stack-target.md` et `migrate-app`).
- Autorisation : Feu vert explicite utilisateur pour l'étape 3 sur la même branche de feature.

## Critères d’acceptation — source de vérité

| AC | Préconditions | Action | Résultat observable / mesure | Vérification envisagée |
|---|---|---|---|---|
| AC-01 | `zod` installé | Définition des schémas Zod dans `src/types/yearPlan.ts` | Validation typée et sécurisée des données de plan/entrées, export des types inférés | Test unitaire / typecheck |
| AC-02 | Aucun `storageMode.ts` | Création de `src/config/storageMode.ts` | `resolveStorageMode` gère loopback vs Vercel non-loopback ; exporte `storageMode` et `isLocalMode` | Test unitaire |
| AC-03 | Données dans `conges:yearPlans` ou vides | Chargement via `yearPlanRepository.list()` | Lecture sécurisée par Zod, écriture sur `@holidays_year_plans_v1`, migration automatique des données historiques `conges:yearPlans` sans perte | Tests unitaires & intégration |
| AC-04 | Aucun `docs/LOCAL_STORAGE.md` | Création de la documentation | Document complet expliquant les clés, la validation, l'origine navigateur et le reset | Relecture de fichier |
| AC-05 | Code L3 complet | Exécution du harness strict | `verify-harness.sh --strict` vert (typecheck, lint, unit, build, e2e) | Harness de vérification |

## Architecture et UI
- Données : Validation runtime Zod (`safeParse`), persistance AsyncStorage avec clé `@holidays_year_plans_v1` et fallback `conges:yearPlans`.
- Repositories : `src/storage/yearPlanRepository.ts` avec interface unifiée et Zod.
- UI : Aucune régression visuelle, `Header` affiche toujours le badge adéquat.

## Mode d’équipe et périmètres
Séquentiel : `fullstack-builder` -> `qa-inspector`

| Sous-agent | AC concernés | Mission | Fichiers autorisés | Workspace / branche |
|---|---|---|---|---|
| fullstack-builder | AC-01 à AC-05 | Implémenter Zod, storageMode, repository v1 + migration, tests et doc | `package.json`, `package-lock.json`, `src/types/yearPlan.ts`, `src/config/storageMode.ts`, `src/storage/yearPlanRepository.ts`, `docs/LOCAL_STORAGE.md`, `tests/*`, `.agents/project.md` | Courant (`refactor/holidays-l2`) |
