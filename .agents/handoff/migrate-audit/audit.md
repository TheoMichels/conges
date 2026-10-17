# Audit de migration — Holidays (ex-Congés)
Date : 2026-10-17 · Cible : stack-target.md

## Synthèse C1–C12
| # | Critère | Statut | Fait observé |
|---|---|---|---|
| C1 | Expo 57, React 19, TS strict | 🟡 ÉCART | Expo 57.0.15, React 19.2.3, RN 0.86.2, TS 6.0.3 strict OK. Scripts build/typecheck/preview absents ; app.json au lieu de app.config.js. |
| C2 | Arborescence §1 | ❌ ÉCART | api/conges.ts (Upstash) présent. Manque storageMode.ts, services/, prisma/, tests/, e2e/, docs/LOCAL_STORAGE.md. |
| C3 | Tokens & composants §2 | ❌ ÉCART | src/theme/colors.ts incomplet (manque panelSubtle, surfaceActive, variantes *Soft, échelles complètes). Header sans badge de mode. |
| C4 | Validation Zod | ❌ ÉCART | zod non installé. Lectures JSON directes sans validation runtime. |
| C5 | Prisma multiSchema | ❌ ÉCART | Aucun Prisma. Modèle défini uniquement par types TS dans src/types/yearPlan.ts. |
| C6 | RLS & Triggers §3 | ❌ ÉCART | Pas de tables relationnelles Postgres, pas de RLS ni triggers. |
| C7 | Schéma Supabase partagé | ❌ ÉCART | Projet partagé skzehjvqvdbxfehbrgzu (supabase-claret-house) actif avec veyl, todo, novabudget. Schéma holidays inexistant. |
| C8 | Auth Supabase §5 | ❌ ÉCART | Aucune auth. Pas de useAuth ni AuthScreen. Types database.ts absents. |
| C9 | Mode local §4 | 🟡 ÉCART | AsyncStorage conges:yearPlans utilisé. Résolution de mode codée en dur (hostname localhost). Clés non normalisées. |
| C10 | Scripts & Harness | ❌ ÉCART | 4 scripts Expo basiques. Pas de linter, tests unitaires ni Playwright. Pas de .agents/harness.config. |
| C11 | Vercel & Secrets | 🟡 ÉCART | Projet Vercel conges (prj_6xh2QVFktWaDFPNxyxXmh7evrUYE) relié. vercel.json incomplet (manque rewrites SPA). Variables Upstash Redis au lieu de Supabase. |
| C12 | Fiche projet | 🟡 ÉCART | .agents/project.md présent (32 lignes) mais obsolète (Upstash, commandes manquantes). |

## Découpage proposé
- L1 : Socle (app.config.js, scripts, eslint, Playwright, tests leaveDays, harness strict, project.md)
- L2 : Design tokens (colors.ts canonique, composants-types, 4 états d'écran, testIDs)
- L3 : Validation Zod, storageMode.ts, repository (@holidays_year_plans_v1 + rétrocompatibilité conges:yearPlans)
- L4 : Prisma multiSchema (schéma holidays, migration SQL RLS/triggers, test sur branche Supabase)
- L5 : Auth Supabase, types database.ts, syncService, tests E2E cloud simulé (7 cas)
- L6 : Bascule données Upstash -> Supabase, variables Vercel, suppression api/conges.ts (sur confirmation)
