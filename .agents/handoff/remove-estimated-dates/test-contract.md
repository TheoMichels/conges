# Contrat de test
| AC | Preuve |
|---|---|
| AC-01 | `e2e/f04-dated-leave.spec.ts` : création, édition, absence de mention, rechargement mobile et desktop |
| AC-02 | E2E ancien champ local ; `tests/storage.test.mjs` écriture cloud ; `tests/f04Migration.test.mjs` conservation après migration PGlite |
| AC-03 | `tests/storage.test.mjs` reprise locale/cloud ; `tests/f04Migration.test.mjs` RPC et exception après migration |
