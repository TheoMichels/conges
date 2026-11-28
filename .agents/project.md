# Holy — fiche projet
> Faits uniquement, maintenus par l'agent (≤ 40 lignes). Les règles sont dans ~/.gemini/AGENTS.md.

## Produit
- But : planification et suivi des congés annuels (plan par année, saisies par jour ou demi-journée, solde).
- Utilisateur : moi seul · Plateformes : web PWA (Vercel), vue mobile dédiée.

## Stack
- Expo SDK 57 (RN Web 0.21, React 19.2, RN 0.86), TS strict, Zod · `@supabase/supabase-js`.
- Stockage : espace local `@holy_year_plans_v1` (migration depuis `@holidays_year_plans_v1`), cache cloud isolé `@holy_cloud_year_plans_<user-id>` ; anciennes données sans provenance en quarantaine, reprise manuelle locale.
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
- Années cloud actives ou en brouillon, droits administrés et agrégats privés via fonctions contrôlées ; calendrier partagé par projection SQL minimale ; reports et droits en centièmes.
- Fériés récupérables automatiques ou montant manuel conservé `holidayOverride` / `holiday_override`.
| LeaveEntry | `leave_entries` (FK `year_plans`, FK `auth.users`, RLS ; exceptions mensuelles historiques) | `src/types/yearPlan.ts` (Zod) / `yearPlanRepository.ts` |
| UserSettings | `user_settings` (FK `auth.users`, RLS 100%) | `prisma/schema.prisma` |
| Member | `members` (FK `auth.users`, RLS, accès par fonctions contrôlées) | `src/storage/memberRepository.ts` |
| Team | `teams`, `team_members` (RLS, fonctions admin, archives) | `src/storage/teamRepository.ts` |

## Design
- Tokens §2 `src/theme/colors.ts` · refonte v2 : fond de page perle `canvas #F8F9FB`, cartes blanches bordure `#E6E8EE` + `cardShadow`, texte `#1B2B3A`, bleu `#1F4E79` (sélection, données), orange `#EE6A24` (CTA unique, soulignement de l'onglet actif) · cartes rayon 18, contrôles 10 (`shape.control`) · `focusRing`, `tabular`, `webOnly` · clair forcé sur web.
- Primitives `src/components/ui/` : `Button` (primary/secondary/ghost/danger, md 44 / sm 36), `Icon` (SVG à trait, plus d'Unicode), `Badge` (statuts), `Segmented`, `Card`. Shell `AppShell` (App.tsx) : `Header` persistant + `TabBar` mobile · admin à onglets (`admin-tab-*`, sessionStorage) · mockup `.agents/handoff/visual-refresh-v2/`.

## Déploiement & Sécurité
- Logo officiel : voilier bleu et orange, masters 1024 px, fond blanc et coins transparents pour les favicons ; `python3 scripts/generate-logo-icons.py` (Pillow).
- Vercel (`vercel.json`) : build `npm run build`, SPA rewrites ; production `https://holy-its4u.vercel.app`.
- Mode piloté par `app.config.js` (`extra.storageMode`) et résolu par `src/config/storageMode.ts`.
