# Congés — fiche projet
> Faits uniquement, maintenus par l'agent (≤ 40 lignes). Les règles sont dans ~/.codex/AGENTS.md.

## Produit
- But : planification et suivi des congés annuels (plan par année, saisies par jour ou demi-journée, solde).
- Utilisateur : moi seul · Plateformes : web PWA (Vercel), vue mobile dédiée.

## Stack
- Expo SDK 57 (RN Web 0.21, React 19.2, RN 0.86), TS · `expo-linear-gradient`, `react-native-svg`.
- Offline-first : AsyncStorage localement ; synchro via l'API serverless `api/conges.ts` → Upstash Redis.
- Schéma : types TS dans `src/types/yearPlan.ts` (pas de base relationnelle).

## Commandes
| Action | Commande |
|---|---|
| Dev | `npm run web` |
| Build web | `npx expo export -p web` (sortie `dist/`, cf. `vercel.json`) |
| Typecheck / Lint / Tests / E2E | **non configurés** — à ajouter via `project-bootstrap` à la première tâche de code |
| Port de preview QA | 4173 (pas encore de `.agents/harness.config`) |

## Modèle de données
| Entité | Type | Repository |
|---|---|---|
| YearPlan (+ LeaveEntry, HalfDay morning \| afternoon) | `src/types/yearPlan.ts` | `src/storage/yearPlanRepository.ts` (données initiales : `seedPlans.ts`) |

## Design
- Tokens `src/theme/colors.ts` · surfaces blanches `#FFFFFF` `#F5F8FA` `#EDF2F5` · brand `#072939` · accent orange `#E85315` / `#FBAE40` · textes `#072939` `#50646F`.
- Même famille visuelle que Todo (brand `#072939`), accent différent.

## Zones sensibles et déploiement
- Vercel (`vercel.json`). Serveur : `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (jamais en `EXPO_PUBLIC_`). Client mobile : `EXPO_PUBLIC_API_URL` facultatif.
