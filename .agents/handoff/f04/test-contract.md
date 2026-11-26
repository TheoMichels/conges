# Contrat de tests F04
| AC | Preuve |
|---|---|
| AC-10 | `tests/leaveDays.test.mjs` valide les dates et refus mensuels ; `tests/f04Migration.test.mjs` vérifie les refus en base ; `e2e/f04-dated-leave.spec.ts` vérifie création, modification et rechargement mobile/desktop. |
| AC-11 | `tests/leaveDays.test.mjs` vérifie créneaux occupés, fractionnement, totaux et idempotence ; `tests/storage.test.mjs` vérifie persistance locale et orchestration cloud ; `tests/f04Migration.test.mjs` vérifie la transaction et les droits sur PGlite. |
| AC-12 | `tests/leaveDays.test.mjs` vérifie les volumes non plaçables ; `e2e/f04-dated-leave.spec.ts` vérifie leur correction et le décompte avant/après enregistrement. |
