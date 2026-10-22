# Contrat de tests — holy-light-glass
| AC | Niveau / preuve | Exécution |
|---|---|---|
| AC-01 | E2E light-glass, captures 1440 et inspection manuelle maquette | Playwright + QA |
| AC-02 | 4 combinaisons 375/1440 × light/dark ; color-scheme et couleur KPI | e2e/light-glass.spec.ts |
| AC-03 | Dates demi-journée, mois, modification, suppression, reload ; suites logique/stockage existantes | npm test + E2E |
| AC-04 | 375/1440, formulaire sans overflow, bouton mode ≥44 ; test design existant | E2E |
| AC-05 | Auth/configuration/erreur suites existantes ; skeleton loading inspection | cloud-mode.spec.ts + QA |
- Garde erreurs console/page dans le test clair/sombre, isolation par contexte Playwright.
- Pas de changement métier ; preuves existantes conservées.
- Première tentative rouge empêchée par sandbox EPERM écoute serveur ; pas présentée comme rouge fonctionnel.
- Limite préexistante : export/renommage/suppression années disponibles seulement desktop, conservée selon décision orchestrateur.
