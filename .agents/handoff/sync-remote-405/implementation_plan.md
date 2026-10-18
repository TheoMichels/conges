# Plan d'implémentation — fix/sync-remote-405

- **Observé** : À chaque modification sur l'app déployée, un bandeau d'erreur affiche "Échec de synchronisation distante (405): " avec un bouton "Réessayer". Cliquer sur réessayer fait disparaître l'erreur mais les données ne sont pas sauvegardées dans Supabase.
- **Attendu** : En mode cloud (`storageMode === "supabase"`), les modifications (créations, mises à jour, suppressions de plans et d'entrées) doivent être synchronisées via `syncService` vers Supabase (`holy.year_plans` et `holy.leave_entries`), sans aucune tentative d'appel HTTP vers l'ancien endpoint `/api/conges`. En mode local, persistance pure AsyncStorage sans réseau.
- **Cause racine** : `yearPlanRepository.ts` utilisait encore `getApiUrl()` / `fetch('/api/conges', { method: 'POST' })` qui était l'ancienne API Upstash décommissionnée au Lot 6 (`d6af5fb`). Sur Vercel, la réécriture SPA vers `/index.html` renvoie 405 Method Not Allowed sur un POST statique. Au clic sur "Réessayer", `list()` faisait un GET qui basculait silencieusement sur le cache local suite à une erreur JSON, masquant l'erreur sans synchroniser.
- **AC-01** : En mode cloud (`!isLocalMode`), `yearPlanRepository.saveAll()` synchronise via `syncService.pushToCloud()` vers Supabase et ne fait plus aucun appel vers `/api/conges` (`getApiUrl()` supprimé).
- **AC-02** : `syncService.pushToCloud()` et `upsertCloudPlan()` répercutent fidèlement les suppressions de plans et d'entrées de congés dans Supabase (nettoyage des entrées orphelines et suppression des plans absents).
- **AC-03** : Non-régression mode local (`isLocalMode === true`) : persistance AsyncStorage pure avec 0 appel réseau.
- **Fichiers autorisés** :
  - `src/storage/yearPlanRepository.ts`
  - `src/storage/localStorage.ts` (ou équivalent pour éviter les cycles d'import)
  - `src/services/syncService.ts`
  - `tests/storage.test.mjs`
  - `.agents/project.md`
