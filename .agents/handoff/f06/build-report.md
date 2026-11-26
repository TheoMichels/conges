# Build Report — F06
- **Statut** : READY_FOR_QA · **Cycle** : 1 · **Branche** : feature/f06-shared-calendar
- **Périmètre** : navigation, écran, repository, types, migration, tests et fiche projet.
- **Données** : migration `20261203000000_shared_calendar` (fonctions SQL) ; aucune écriture distante.
- **UI** : navigation connectée ; sélecteurs tactiles, liste par jour ; skeleton, équipes absentes, mois vide et erreur avec réessai ; testID stables.
- **Harness** : résultat définitif dans `.agents/state/verify-result.json` après commit ; suite E2E complète car navigation modifiée.

| AC | Code | Preuve |
|---|---|---|
| AC-15 | SharedCalendar, sharedCalendarRepository | Playwright mobile/bureau, mois, année et demi-journées ; 4 scénarios PASS. |
| AC-16 | migration SQL | PGlite : équipes communes, déduplication et filtre interdit PASS ; Playwright filtre PASS. |
| AC-17 | migration SQL | PGlite : retrait, archive, comptes inactifs, accès anonyme et projection minimale PASS. |

- Tests directs : `node --test tests/sharedCalendar.test.mjs` PASS ; `npm run test:e2e -- e2e/f06-shared-calendar.spec.ts` 4 PASS ; typecheck et lint PASS.
- Base isolée PGlite : PostgreSQL embarqué, migrations exécutées réellement ; aucune base Supabase distante utilisée.
- Aucun changement des AC. Revue sécurité et QA indépendantes à effectuer.
- Au go : appliquer la migration Prisma ; aucune nouvelle variable d'environnement.
