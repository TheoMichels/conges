# Preuve — work-percentage
Statut global : PARTIAL — implémentation terminée, inspection visuelle indépendante bloquée.
- Branche : feature/work-percentage ; code testé : 9face03 ; non poussé.
- AC inchangés : implementation_plan.md.
| AC | Preuve | QA |
|---|---|---|
| AC-01 | Validation unitaire, édition/erreurs/indépendance E2E | PASS |
| AC-02 | Calculs, coïncidences, reports unitaires + totaux E2E | PASS |
| AC-03 | Storage/sync intégration, reload E2E, SQL PGlite | PASS |
| AC-04 | Responsive E2E 375/1440 PASS ; navigateur intégré déconnecté | NOT_VERIFIED |
| Harness sur 9face03 | Statut |
|---|---|
| typecheck / lint / build | PASS |
| unitaires et intégration | PASS : 75 tests |
| E2E complets | PASS : 23 tests |
- Source : .agents/state/verify-result.json ; aucun test sauté.
- Revue sécurité/sync : APPROVE (review-report.md).
- QA indépendante : FAIL uniquement pour inspection intégrée indisponible (qa-report.md).
- Tentative : tabs.open localhost:4173 -> browser.disconnected ; aucun correctif code justifié.
- Reprise recommandée : reconnecter le navigateur intégré puis reprendre QA dans sa même session.
- Alternative : laisser la branche en attente ; ne pas assimiler les E2E à une validation visuelle indépendante.
- Au go seulement : migration 20261106000000_annual_work_percentage avant nouveau client ; aucune variable nouvelle.
- Migration testée dans PGlite isolé, pas appliquée sur Supabase distant.
- Local : npm run web (8081).
