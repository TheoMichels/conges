# Rapport de build — fix/sync-remote-405

- **Cause racine** : `yearPlanRepository.ts` appelait encore l'ancien endpoint `/api/conges` via `fetch(getApiUrl())`, décommissionné au Lot 6. La réécriture SPA de Vercel renvoyait une erreur HTTP 405 Method Not Allowed sur ce POST statique.
- **Fichiers modifiés** :
  - `src/storage/localStorage.ts` : extraction stockage local et migrations sans cycle d'import.
  - `src/storage/yearPlanRepository.ts` : suppression getApiUrl(), délégation saveAll/list à syncService.
  - `src/services/syncService.ts` : fonctions autonomes (userId optionnel), suppression entrées orphelines et plans supprimés.
  - `tests/storage.test.mjs` : suite non-régression AC-01, AC-02, AC-03.
  - `.agents/project.md` : mise à jour de la stack stockage.
- **AC → Tests** :
  - AC-01 : saveAll délègue à syncService.pushToCloud, getApiUrl supprimé, 0 appel /api/conges.
  - AC-02 : pushToCloud et upsertCloudPlan suppriment entrées orphelines et plans supprimés.
  - AC-03 : saveAll en mode local (isLocalMode === true) persiste dans AsyncStorage sans réseau.
- **Validation** :
  - Tests unitaires : `npm test` → 66/66 PASS (58 avant / 66 après, +8 tests non-régression).
  - Harness strict : `verify-harness.sh --strict` → Code 0 (typecheck, lint, unit, build, e2e verts).
