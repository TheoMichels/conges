# Build Report — holidays-l1

- **Statut** : READY_FOR_QA · **Cycle** : 1 · **Branche** : refactor/holidays-l1

## Fichiers créés / modifiés
| Fichier | Rôle | Périmètre |
|---|---|---|
| `app.config.js` | Configuration dynamique Expo ("Holidays", extra.storageMode) | Oui (AC-01) |
| `app.json` | Supprimé au profit de app.config.js | Oui (AC-01) |
| `vercel.json` | Build Vercel dist + rewrites SPA | Oui (AC-02) |
| `package.json`, `package-lock.json` | Renommage "holidays", scripts canoniques, devDeps | Oui (AC-03) |
| `eslint.config.js` | Flat config ESLint 9 Expo / TS | Oui (AC-04) |
| `tests/leaveDays.test.mjs` | 23 tests unitaires calculs de congés & fériés luxembourgeois | Oui (AC-05) |
| `playwright.config.ts`, `e2e/smoke.spec.ts` | Config Playwright (port 4173) & smoke test console-guard | Oui (AC-06) |
| `.agents/harness.config` | Config harness (PREVIEW_PORT=4173) | Oui (AC-07) |
| `.agents/project.md` | Fiche projet mise à jour (35 lignes) | Oui (AC-08) |
| `scripts/deploy-db.mjs` | Stub db:deploy pour stack cible | Oui |
| `.gitignore` | Correction conservation .agents/handoff/ | Oui |
| `src/components/ProgressRing.tsx` | Fix typage TS (StyleSheet.absoluteFillObject -> absoluteFill) | Écart justifié pour typecheck |

## Données & Base
- Changement de schéma : non (types TS inchangés).
- Aucune commande exécutée sur une base distante : confirmé.

## Harness (`verify-result.json`)
| typecheck | lint | unit | build | e2e |
|---|---|---|---|---|
| PASS | PASS | PASS (23/23) | PASS | PASS (1/1) |

## Acceptation (AC-01 à AC-08)
- AC-01 : `app.config.js` avec name "Holidays", slug "holidays", extra.storageMode dynamique.
- AC-02 : `vercel.json` configuré avec build `npm run build`, `dist` et rewrites.
- AC-03 : Scripts canoniques configurés et devDeps (`serve`, `@playwright/test`, `eslint`, `eslint-config-expo`) installées.
- AC-04 : `npm run typecheck` et `npm run lint` 100% verts.
- AC-05 : `npm test` vert (23 tests unitaires couvrant `workingDaysCount`, demi-journées, soldes et fériés).
- AC-06 : `npm run test:e2e` vert sur port 4173 (Playwright headless Chromium).
- AC-07 : `.agents/harness.config` configuré avec PREVIEW_PORT=4173.
- AC-08 : `.agents/project.md` mis à jour et conforme (≤ 40 lignes).
