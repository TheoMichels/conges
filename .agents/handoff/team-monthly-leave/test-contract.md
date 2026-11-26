# Contrat de tests
| AC | Preuve | Commande |
|---|---|---|
| 01 | Projection SQL autorisée et reprise mensuelle avec créneaux occupés | `npm test` ; `npm run test:e2e -- e2e/f06-shared-calendar.spec.ts` |
| 02 | PGlite (filtre, révocation, équipes) ; E2E dates, demi-journées, filtres, mois ; fériés dans leaveDays.test | mêmes commandes |
| 03 | E2E valeur impossible et viewport 375px ; parcours existant à 1200px | même commande E2E |
