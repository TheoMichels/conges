# Holidays — fiche projet
> Faits uniquement, maintenus par l'agent (≤ 40 lignes). Les règles sont dans ~/.gemini/AGENTS.md.

## Produit
- But : planification et suivi des congés annuels (plan par année, saisies par jour ou demi-journée, solde).
- Utilisateur : moi seul · Plateformes : web PWA (Vercel), vue mobile dédiée.

## Stack
- Expo SDK 57 (RN Web 0.21, React 19.2, RN 0.86), TS, Zod · `expo-linear-gradient`, `react-native-svg`.
- Stockage : AsyncStorage localement (`@holidays_year_plans_v1`, migration transparente `conges:yearPlans`).
- Mode de stockage : `src/config/storageMode.ts` (local loopback vs supabase cloud).

## Commandes
| Action | Commande |
|---|---|
| Dev | `npm run web` (port 8081) |
| Build web | `npm run build` (sortie `dist/`, cf. `vercel.json`) |
| Preview QA | `npm run preview` (port 4173, cf. `.agents/harness.config`) |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) |
| Lint | `npm run lint` (`expo lint`) |
| Test unit | `npm test` (`node --test tests/*.test.mjs`) |
| Test E2E | `npm run test:e2e` (`playwright test`) |

## Modèle de données
| Entité | Type / Schémas | Repository |
|---|---|---|
| YearPlan (+ LeaveEntry, HalfDay) | `src/types/yearPlan.ts` (Zod) | `src/storage/yearPlanRepository.ts` (CRUD, v1) |

## Design
- Tokens §2 `src/theme/colors.ts` · brand `#072939` · primary `#E85315` · gradient 4 teintes · glass panels & surfaces · radius 12-24 · shadows.
- Composants types : `Header` (badge stockage local), `KpiCards` (statistiques clés), vue responsive desktop/mobile sans scroll à 375px.

## Zones sensibles et déploiement
- Vercel (`vercel.json`) : build `npm run build`, SPA rewrites.
- Mode de stockage piloté par `app.config.js` (`extra.storageMode`) et résolu par `src/config/storageMode.ts`.
