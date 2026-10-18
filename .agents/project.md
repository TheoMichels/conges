# Holy — fiche projet
> Faits uniquement, maintenus par l'agent (≤ 40 lignes). Les règles sont dans ~/.gemini/AGENTS.md.

## Produit
- But : planification et suivi des congés annuels (plan par année, saisies par jour ou demi-journée, solde).
- Utilisateur : moi seul · Plateformes : web PWA (Vercel), vue mobile dédiée.

## Stack
- Expo SDK 57 (RN Web 0.21, React 19.2, RN 0.86), TS strict, Zod · `@supabase/supabase-js`.
- Stockage : AsyncStorage / localStorage hybride (`@holy_year_plans_v1` avec migration auto depuis `@holidays_year_plans_v1`).
- Base de données : Prisma multiSchema (`holy`, `auth`), RLS 100 %, Supabase Postgres partagé.
- Auth & Sync : `src/services/authService.ts`, `useAuth`, `src/services/syncService.ts`.

## Commandes
| Action | Commande |
|---|---|
| Dev / Build / Preview | `npm run web` (8081) · `npm run build` (`dist/`) · `npm run preview` (4173) |
| QA (Harness) | `npm run typecheck` · `npm run lint` · `npm test` · `npm run test:e2e` |
| DB Deploy / Studio | `npm run db:deploy` (DIRECT_URL) · `npm run db:studio` |
| Test builds multi-mode | `node scripts/prepare-test-builds.mjs` |

## Modèle de données
| Entité | Tables Postgres (`holy`) | Repository / Schéma |
|---|---|---|
| YearPlan | `year_plans` (FK `auth.users`, RLS 100%) | `src/types/yearPlan.ts` (Zod) / `yearPlanRepository.ts` |
| LeaveEntry | `leave_entries` (FK `year_plans`, FK `auth.users`, RLS) | `src/types/yearPlan.ts` (Zod) / `yearPlanRepository.ts` |
| UserSettings | `user_settings` (FK `auth.users`, RLS 100%) | `prisma/schema.prisma` |

## Design
- Tokens §2 `src/theme/colors.ts` · brand `#072939` · primary `#E85315` · surfaces glassmorphism translucides (`glassStyle`) · radius 12-24.
- Composants types : `Header` (logo voilier détouré `home-boat-logo.png`, titre `Holy`), `AuthScreen`, `LoadingScreen`, `KpiCards`.

## Déploiement & Sécurité
- Vercel (`vercel.json`) : build `npm run build`, SPA rewrites.
- Mode piloté par `app.config.js` (`extra.storageMode`) et résolu par `src/config/storageMode.ts`.
