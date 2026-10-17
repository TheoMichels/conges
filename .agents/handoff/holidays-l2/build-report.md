# Build Report — holidays-l2

- **Statut** : READY_FOR_QA · **Cycle** : 1 · **Branche** : refactor/holidays-l2

## Fichiers créés / modifiés
| Fichier | Rôle | Périmètre |
|---|---|---|
| `src/theme/colors.ts` | Structure de tokens obligatoire §2 (gradient 4 teintes, palette glass, shadows, radius, spacing) | Oui (AC-01) |
| `src/components/Header.tsx` | En-tête glass avec logo, titre, toggle sidebar desktop, badge "Stockage local" | Oui (AC-02) |
| `src/components/KpiCards.tsx` | Cartes glass chiffres clés (solde restant, pris, droits totaux) | Oui (AC-03) |
| `App.tsx` | Intégration Header, KpiCards, 4 états d'écran (loading, error, empty, data) | Oui (AC-02, 03, 04) |
| `src/components/LeaveEntries.tsx` | Harmonisation glass, radius tokens, cibles tactiles ≥ 44px | Oui (AC-04) |
| `src/components/SummaryFields.tsx` | Surfaces glass, radius tokens, minHeight 44px | Oui (AC-04) |
| `src/components/MobileDashboard.tsx` | Surfaces glass, radius tokens, minHeight 44px | Oui (AC-04) |
| `src/components/Sidebar.tsx` | Surfaces glass, radius tokens, minHeight 44px sur actions | Oui (AC-04) |
| `src/components/NumberField.tsx`, `YearSelectorMobile.tsx` | Radius tokens et cibles tactiles ≥ 44px | Oui (AC-04) |
| `tests/tokens.test.mjs` | 7 assertions de conformité stricte des tokens §2 | Oui (AC-05) |
| `e2e/design.spec.ts` | Tests E2E desktop, toggle, responsive 375px sans scroll horizontal, cibles ≥ 44px | Oui (AC-05) |
| `.agents/project.md` | Mise à jour section Design conforme stack-target | Oui |

## Données & Base
- Changement de schéma : non (schéma de données inchangé).
- Aucune commande exécutée sur base distante : confirmé.

## Harness (`verify-result.json`)
| typecheck | lint | unit | build | e2e |
|---|---|---|---|---|
| PASS | PASS | PASS (30/30) | PASS | PASS (4/4) |

## Acceptation (AC-01 à AC-05)
- AC-01 : `src/theme/colors.ts` aligné sur §2 (gradient 4 teintes, palette complète, radius, spacing, shadows, alias rétrocompatibles).
- AC-02 : `Header.tsx` implémenté avec `testID="app-header"`, titre "Mes congés", toggle desktop et badge "Stockage local" (`testID="local-badge"`).
- AC-03 : `KpiCards.tsx` (`testID="kpi-cards"`) implémenté avec solde restant (accentué vert/rouge), congés pris et droits totaux.
- AC-04 : Surfaces glass translucides, bordures fines, radius 16–24 px, 4 états d'écran gérés, cibles ≥ 44 px, zéro débordement à 375 px.
- AC-05 : Suite unitaire (`tests/tokens.test.mjs`) et suite E2E (`e2e/design.spec.ts`) validées sans erreur console. Harness strict 100% vert.
