# Implementation Plan — Lot 5 : Authentification Supabase, Synchronisation & E2E Cloud

## Contexte
Migration de l'application Holidays vers la stack cible (§5 de `stack-target.md` et Lot 5 de `migrate-app`).
Le lot met en place Supabase Auth, le client avec stockage hybride, `authService`, `useAuth`, `syncService`, la garde dans `App.tsx`, `AuthScreen`, `LoadingScreen`, l'adaptation du Header, la purge du cache local à la déconnexion, ainsi que le harnais de test E2E multi-build couvrant les 7 cas obligatoires de §5.
Branche de travail : `refactor/holidays-l4` (conservée selon consigne utilisateur).

## Critères d'Acceptation Observables (AC)

- **AC-01 (Dépendances & Types)** : `@supabase/supabase-js` est installé dans `package.json`. `src/types/database.ts` définit l'interface `Database` typant le schéma `holidays` (tables `year_plans`, `leave_entries`, `user_settings`) en cohérence avec `prisma/schema.prisma`.
- **AC-02 (Configuration & Client)** : `src/config/supabase.ts` expose `supabaseUrl`, `supabaseAnonKey` et `isSupabaseConfigured` sans instancier de client réseau. `src/services/supabaseClient.ts` instancie le client Supabase unique avec `hybridAuthStorage` (localStorage synchrone + miroir AsyncStorage sur Web, AsyncStorage sur mobile), ou reste `null` en mode local ou si non configuré.
- **AC-03 (Service d'authentification)** : `src/services/authService.ts` expose `signIn`, `signUp`, `signOut`, `getSession`, `getCurrentUser`, `onAuthStateChange`. Les identifiants sont validés par `credentialsSchema` (Zod). Aucune fonction ne lève d'exception non interceptée ; toutes les erreurs Supabase sont traduites en français convivial (ex. « Adresse e-mail ou mot de passe incorrect. »).
- **AC-04 (Hook useAuth)** : `src/hooks/useAuth.ts` implémente un store singleton via `useSyncExternalStore`. `isLoading` vaut `!isLocalMode` au départ et ne concerne que la résolution de la session initiale (pas les soumissions de formulaire). À la déconnexion (`signOut()` ou événement `SIGNED_OUT`), `syncService.clearLocalCache()` purge les clés `@holidays_*`.
- **AC-05 (Service de synchronisation & purge)** : `src/services/syncService.ts` gère `pullFromCloud`, `pushToCloud`, `upsertCloudPlan`, `deleteCloudPlan` et `clearLocalCache()`. `clearLocalCache()` vide toutes les clés `@holidays_*` dans AsyncStorage et localStorage tout en préservant les clés tierces.
- **AC-06 (Garde App, AuthScreen & Header)** :
  - En mode local (`isLocalMode === true`) : aucun code d'auth n'est bloquant, l'app démarre immédiatement avec le badge « Stockage local ».
  - En mode cloud sans session : `AuthScreen` s'affiche avec bascule connexion / inscription, validation client, conservation des champs en cas d'erreur.
  - En mode cloud sans clés : `AuthScreen` affiche le bandeau d'alerte « Configuration Supabase requise » et désactive la soumission.
  - En mode cloud connecté : l'application charge les données, le Header affiche l'identité (`🟢 ...`) et le bouton « Se déconnecter ».
  - Pendant le chargement initial ou le pull : `LoadingScreen` affiche un indicateur de chargement.
- **AC-07 (Playwright E2E & 7 cas obligatoires §5)** :
  - `scripts/prepare-test-builds.mjs` génère les builds `local`, `cloud` et `cloud-unconfigured` dans `.agents/state/test-builds/`.
  - `playwright.config.ts` configure les trois serveurs locaux (ports 4173, 4174, 4175).
  - `e2e/cloud-mode.spec.ts` valide les 7 cas §5 sur origine virtuelle `https://holidays.example` :
    1. Build cloud servi sur `localhost` → app directe en mode local, pas d'AuthScreen.
    2. Cloud sans session → `AuthScreen` seul, aucune donnée affichée.
    3. Validation formulaire sans appel réseau (email/mdp invalides).
    4. Mauvais mot de passe → message visible (« Adresse e-mail ou mot de passe incorrect. »), champs conservés.
    5. Connexion réussie → app affichée, identité dans le Header.
    6. Déconnexion → retour à `AuthScreen` et cache `@holidays_*` vidé.
    7. Cloud sans clés → bandeau « Configuration Supabase requise ».
- **AC-08 (Tests unitaires & non-régression)** : Tests unitaires de `clearLocalCache` et validation auth ajoutés dans `tests/auth.test.mjs`. Tous les tests existants restent verts.
- **AC-09 (Harness)** : `bash verify-harness.sh --strict` passe à 100% (typecheck, lint, unit, build, e2e).
