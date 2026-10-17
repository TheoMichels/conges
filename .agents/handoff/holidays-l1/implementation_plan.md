# Plan d’implémentation — holidays-l1 (Socle applicatif & Harness de test)

## Besoin reformulé et périmètre
- Objectif : Mettre en place le socle canonique de la stack cible pour l'application Holidays (ex-Congés) : `app.config.js`, scripts npm obligatoires, lint ESLint 9, suite de tests unitaires pour les calculs de congés, Playwright E2E smoke test sur port 4173, configuration du harnais strict `verify-harness.sh`.
- Renommage : `package.json` name "holidays", `app.config.js` name "Holidays" et slug "holidays".
- Exclus de ce lot : modifications de l'UI (Lot 2), refactorisation des repositories / Zod (Lot 3), Prisma (Lot 4), Auth (Lot 5), migration Upstash vers Supabase (Lot 6).

## Challenge et décisions
| Fait vérifié / hypothèse / question | Recommandation et conséquence | Décision reçue / à obtenir |
|---|---|---|
| Renommage slug et package | Slug canonique `holidays` partout, package name `holidays` | Validé par l'utilisateur |
| Nom d'affichage UI | Titre de l'application "Holidays" | Validé par l'utilisateur |
| Port QA | Port 4173 imposé par stack-target.md | Conforme |
| Prisma absent au Lot 1 | `postinstall` et `db:deploy` stubs sécurisés sans bloquer npm install | Standard |

## Critères d’acceptation — source de vérité
| AC | Préconditions | Action | Résultat observable / mesure | Vérification envisagée |
|---|---|---|---|---|
| AC-01 | `app.json` présent | Remplacer par `app.config.js` avec `name: "Holidays"`, `slug: "holidays"` et `extra.storageMode` | `app.config.js` évalue `storageMode` selon `VERCEL === "1"` | Inspection fichier |
| AC-02 | `vercel.json` | Mettre à jour avec gabarit canonique (`buildCommand`, `outputDirectory: "dist"`, rewrites SPA) | `dist` et rewrites configurés | Inspection fichier |
| AC-03 | `package.json` | Renommer en `holidays`, ajouter scripts canoniques (`web`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:e2e`, etc.) et dépendances dev (`serve`, `@playwright/test`, `eslint`, `eslint-config-expo`) | `npm run ...` disponibles | Commande npm |
| AC-04 | TS & Lint | Configurer `eslint.config.js` compatible Expo SDK 57 | `npm run typecheck` et `npm run lint` passent sans erreur | `npm run typecheck && npm run lint` |
| AC-05 | Tests unitaires | Créer `tests/leaveDays.test.mjs` testant les calculs métier de congés (`calculatePlanTaken`, `calculatePlanRemaining`, décompte demi-journées, fériés luxembourgeois) | `npm test` exécute la suite avec 100% de succès | `npm test` |
| AC-06 | Playwright E2E | Configurer `playwright.config.ts` (webServer port 4173) et `e2e/smoke.spec.ts` | `npm run test:e2e` valide le chargement de l'app sur le port 4173 | `npm run test:e2e` |
| AC-07 | Harness strict | Configurer `.agents/harness.config` | `bash /Users/theomichels/.gemini/config/skills/autonomous-qa/scripts/verify-harness.sh --strict` renvoie PASS sur toutes les étapes | Harness strict |
| AC-08 | Fiche projet | Mettre à jour `.agents/project.md` (≤ 40 lignes) avec le nouveau nom et commandes réelles | Fiche à jour et concise | Inspection |

## Architecture et UI
- Dépendances dev à installer : `npm install -D serve @playwright/test eslint eslint-config-expo`
- Scripts stubs pour scripts obligatoires de la stack avant Prisma :
  - `"postinstall": "echo 'Prisma client postinstall stub (Lot 4)'"`
  - `"db:deploy": "echo 'DB deploy stub (Lot 4)'"`
  - `"db:studio": "echo 'DB studio stub (Lot 4)'"`

## Mode d’équipe et périmètres
Séquentiel — Fullstack builder puis QA inspector indépendant.

| Sous-agent | AC concernés | Mission | Fichiers autorisés | Workspace / branche |
|---|---|---|---|---|
| `fullstack-builder` | AC-01 à AC-08 | Mettre en place le socle canonique, scripts, eslint, tests unitaires, playwright, harness, project.md | `package.json`, `package-lock.json`, `app.config.js`, `app.json`, `vercel.json`, `eslint.config.js`, `playwright.config.ts`, `.agents/harness.config`, `tests/*`, `e2e/*`, `.agents/project.md`, `scripts/deploy-db.mjs`, `.env.example`, `.gitignore` | `refactor/holidays-l1` |
| `qa-inspector` | AC-01 à AC-08 | Vérification indépendante avec preuves et verdict | Aucun fichier applicatif | `refactor/holidays-l1` |
