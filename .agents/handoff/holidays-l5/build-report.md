# Build Report — Lot 5 : Authentification Supabase, Synchronisation & E2E Cloud

## 1. Synthèse des critères d'acceptation (AC)
- **AC-01** : `@supabase/supabase-js` (^2.118.0) installé. `src/types/database.ts` type le schéma `holidays` (`year_plans`, `leave_entries`, `user_settings`) avec `Relationships` et typage strict.
- **AC-02** : `src/config/supabase.ts` expose `supabaseUrl`, `supabaseAnonKey`, `isSupabaseConfigured` sans client réseau. `src/services/supabaseClient.ts` fournit un client singleton avec `hybridAuthStorage` ou `null`.
- **AC-03** : `src/services/authService.ts` implémente `signIn`, `signUp`, `signOut`, `getSession`, `getCurrentUser`, `onAuthStateChange`. Validation Zod (`credentialsSchema`) et messages d'erreurs en français.
- **AC-04** : `src/hooks/useAuth.ts` implémente un store singleton `useSyncExternalStore`. `isLoading` est borné à la session initiale. Purge du cache sur déconnexion.
- **AC-05** : `src/services/syncService.ts` implémente `pullFromCloud`, `pushToCloud`, `upsertCloudPlan`, `deleteCloudPlan`, et `clearLocalCache` (purgeant `@holidays_*` en préservant les clés tierces).
- **AC-06** : `App.tsx` intègre la garde d'accès (`LoadingScreen`, `AuthScreen`, `MainApp key={user?.id ?? "local"}`). `Header.tsx` affiche le badge local ou l'identité utilisateur `🟢 ${user.email}` avec bouton de déconnexion.
- **AC-07** : `scripts/prepare-test-builds.mjs` compile les 3 builds (`local`, `cloud`, `cloud-unconfigured`). `playwright.config.ts` configure les ports 4173, 4174, 4175. `e2e/cloud-mode.spec.ts` valide les 7 cas de §5 sur `https://holidays.example`.
- **AC-08** : `tests/auth.test.mjs` valide `credentialsSchema`, les traductions d'erreurs, `checkIsSupabaseConfigured` et `clearLocalCache`. 57 tests unitaires au vert.
- **AC-09** : `verify-harness.sh --strict` validé à 100% (typecheck, lint, unit, build, e2e).

## 2. Commandes exécutées
| Commande | Résultat |
|---|---|
| `npm run typecheck` | Code 0 (0 erreur TS) |
| `npm run lint` | Code 0 (ESLint validé sans avertissement) |
| `npm test` | Code 0 (57 tests unitaires réussis) |
| `node scripts/prepare-test-builds.mjs` | Code 0 (3 exports web générés) |
| `npm run test:e2e` | Code 0 (11 tests Playwright réussis) |
| `bash verify-harness.sh --strict` | Code 0 (Toutes les étapes PASS) |

## 3. Écarts & Notes
- Aucun écart par rapport au plan ou à stack-target §5.
- Aucune régression sur le mode local ni sur la persistance AsyncStorage.
