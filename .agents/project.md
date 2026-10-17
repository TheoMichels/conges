# Holidays — fiche projet
> Faits uniquement, maintenus par l'agent (≤ 40 lignes). Les règles sont dans ~/.gemini/AGENTS.md.

## Produit
- But : planification et suivi des congés annuels (plan par année, saisies par jour ou demi-journée, solde).
- Utilisateur : moi seul · Plateformes : web PWA (Vercel), vue mobile dédiée.

## Stack
- Expo SDK 57 (RN Web 0.21, React 19.2, RN 0.86), TS · `expo-linear-gradient`, `react-native-svg`.
- Stockage : AsyncStorage localement ; synchro hybride / migration Supabase en cours.
- Schéma : types TS dans `src/types/yearPlan.ts`.

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
| Entité | Type | Repository |
|---|---|---|
| YearPlan (+ LeaveEntry, HalfDay) | `src/types/yearPlan.ts` | `src/storage/yearPlanRepository.ts` |

## Design
- Tokens `src/theme/colors.ts` · fond `#FFFFFF` `#F5F8FA` `#EDF2F5` · brand `#072939` · accent `#E85315` / `#FBAE40`.
- Style desktop / mobile responsive.

## Zones sensibles et déploiement
- Vercel (`vercel.json`) : build `npm run build`, SPA rewrites.
- Mode de stockage piloté par `app.config.js` (`extra.storageMode`).
