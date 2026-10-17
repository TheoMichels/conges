# Holidays — fiche projet
> Faits uniquement, maintenus par l'agent (≤ 40 lignes). Les règles sont dans ~/.gemini/AGENTS.md.

## Produit
- But : planification et suivi des congés annuels (plan par année, saisies par jour ou demi-journée, solde).
- Utilisateur : moi seul · Plateformes : web PWA (Vercel), vue mobile dédiée.

## Stack
- Expo SDK 57 (RN Web 0.21, React 19.2, RN 0.86), TS, Zod · `expo-linear-gradient`, `react-native-svg`.
- Stockage : AsyncStorage localement (`@holidays_year_plans_v1`, migration transparente `conges:yearPlans`).
- Base de données : Prisma multiSchema (`holidays`, `auth`), RLS 100 %, Supabase Postgres partagé.
- Mode de stockage : `src/config/storageMode.ts` (local loopback vs supabase cloud).

## Commandes
| Action | Commande |
|---|---|
| Dev / Build / Preview | `npm run web` (8081) · `npm run build` (`dist/`) · `npm run preview` (4173) |
| QA (Harness) | `npm run typecheck` · `npm run lint` · `npm test` · `npm run test:e2e` |
| DB Deploy / Studio | `npm run db:deploy` (DIRECT_URL) · `npm run db:studio` |

## Modèle de données
| Entité | Tables Postgres (`holidays`) | Repository / Schéma |
|---|---|---|
| YearPlan | `year_plans` (FK `auth.users`, RLS 100%) | `src/types/yearPlan.ts` (Zod) / `yearPlanRepository.ts` |
| LeaveEntry | `leave_entries` (FK `year_plans`, FK `auth.users`, RLS) | `src/types/yearPlan.ts` (Zod) / `yearPlanRepository.ts` |
| UserSettings | `user_settings` (FK `auth.users`, RLS 100%) | `prisma/schema.prisma` |

## Design
- Tokens §2 `src/theme/colors.ts` · brand `#072939` · primary `#E85315` · gradient 4 teintes · radius 12-24.
- Composants types : `Header` (badge stockage local), `KpiCards`, vue responsive sans scroll à 375px.

## Déploiement & Sécurité
- Vercel (`vercel.json`) : build `npm run build`, SPA rewrites.
- Mode piloté par `app.config.js` (`extra.storageMode`) et résolu par `src/config/storageMode.ts`.
