# Plan d'implémentation — holidays-l2

## Besoin reformulé et périmètre
- Objectif : Exécuter le Lot 2 (Design system & tokens) de la migration vers la stack cible pour l'application Holidays (ex-conges).
- Contexte : Lot 1 validé sur `refactor/holidays-l1`. Nouveau travail sur la branche `refactor/holidays-l2`.
- Périmètre inclus :
  - Mise à niveau de `src/theme/colors.ts` avec la structure exacte de clés obligatoire (§2 de `stack-target.md`) : gradient 4 teintes douces, palette complète (brand, primary, glass panels, surfaces, borders, status, shadows, radius, spacing) tout en préservant l'identité visuelle (brand `#072939`, primary orange `#E85315` / `#FBAE40`).
  - Création des composants-types :
    - `Header.tsx` : logo, titre, bouton de bascule de la barre latérale sur desktop, badge "Stockage local" (`testID="local-badge"`).
    - `KpiCards.tsx` : cartes chiffres clés glassmorphes pour l'année courante (solde disponible/restant, jours pris, total des droits).
  - Modernisation visuelle glassmorphe de l'UI : surfaces blanches translucides, bordures fines claires, rayons 16–24 px (`radius.md` / `radius.lg`), espacements aérés, typographie hiérarchisée.
  - Gestion claire des 4 états de l'écran dans `App.tsx` : chargement, erreur avec action de réessai, vide, données.
  - Responsive web : plein écran épuré sur desktop et mobile sans débordement horizontal à 375 px, cibles tactiles ≥ 44 px.
  - Tests unitaires des tokens + E2E Playwright enrichis + vérification stricte du harness.
- Périmètre exclu :
  - Pas de changement de modèle de données (Prisma) ni de schéma (prévu au Lot 4).
  - Pas d'authentification Supabase ni d'écrans auth (prévus au Lot 5).
  - Aucune modification de la logique de calcul de congés.

## Challenge et décisions
| Fait vérifié / hypothèse / question | Recommandation et conséquence | Décision reçue / à obtenir |
|---|---|---|
| Charte Holidays basée sur pétrole `#072939` et orange `#E85315` | Conserver l'identité DA tout en adoptant la structure de tokens stricte §2 (primary, glass panels `rgba(255,255,255,0.85)`, bordures douces, etc.) | Validé par stack-target.md §2 |
| Absence actuelle d'un `Header.tsx` dédié et de `KpiCards.tsx` | Créer ces composants modulaires et typés avec `testID` pour satisfaire C3 | Validé par le périmètre Lot 2 |
| Mode de stockage actuel purement local (AsyncStorage) | Afficher le badge « Stockage local » dans le `Header` comme spécifié dans §2 | Validé par stack-target.md §2 |

## Critères d'acceptation — source de vérité
| AC | Préconditions | Action | Résultat observable / mesure | Vérification envisagée |
|---|---|---|---|---|
| AC-01 | Fichier `src/theme/colors.ts` | Lecture et import des tokens | Exporte obligatoirement `gradient` (4 couleurs), `colors` (toutes clés §2 dont brand, primary, text, panel, surface, border, warning, danger, positive, backdrop), `shadows` (sm, md, lg), `radius` (sm: 12, md: 16, lg: 20, xl: 24), `spacing` (xs..xxl). | Unitaire (`tests/tokens.test.mjs`) |
| AC-02 | Application lancée | Affichage de l'en-tête principal | Le composant `Header` affiche le logo, "Mes congés", le bouton toggle sidebar sur grand écran, et le badge visible "Stockage local" (`testID="local-badge"`). | E2E Playwright (`e2e/design.spec.ts`) |
| AC-03 | Plan d'année chargé | Affichage des statistiques annuelles | `KpiCards` affiche les métriques clés (Solde restant, Pris, Droits totaux) sous forme de cartes glass avec grands chiffres et libellés clairs (`testID="kpi-cards"`). | E2E Playwright (`e2e/design.spec.ts`) |
| AC-04 | Rendu sur différents écrans (desktop 1280px et mobile 375px) | Navigation et redimensionnement | Surfaces translucides (« glass »), rayons harmonisés (16–24px), aucun débordement horizontal à 375px, cibles tactiles ≥ 44px. | E2E Playwright (`e2e/design.spec.ts`) |
| AC-05 | Suite complète de validation | Exécution de `verify-harness.sh --strict` | Typecheck, lint, tests unitaires, build dist/ et tests E2E Playwright passent tous avec code 0. Aucune régression sur les fonctionnalités existantes. | Harness strict |

## Mode d'équipe et périmètres
Séquentiel — Lot 2 de migration.

| Sous-agent | AC concernés | Mission | Fichiers autorisés | Workspace / branche |
|---|---|---|---|---|
| fullstack-builder | AC-01 à AC-05 | Implémenter les tokens §2, Header, KpiCards, surfaces glass, tests unitaire et E2E | `src/theme/*`, `src/components/*`, `App.tsx`, `tests/*`, `e2e/*`, `.agents/project.md` | `refactor/holidays-l2` |
