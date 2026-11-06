# Build Report — work-percentage
- Statut : READY_FOR_QA · cycle 1 · branche `feature/work-percentage`.
- Périmètre respecté ; AC inchangés ; aucune écriture distante, push ou déploiement.
## Acceptation → implémentation → preuve
| AC | Code | Vérification exécutée |
|---|---|---|
| 01 | Zod/parseur strict, hook, WorkPercentageField | unit validation + E2E invalides/vides, défaut et indépendance annuelle |
| 02 | calculatePlanHolidays centralisé, budget/KPI/report | unit week-ends/coïncidences, 100%, 33,33%, reports ; E2E 3 × 80% = 2,4 |
| 03 | normalisation locale, repository, sync insert/update/pull | 2 intégrations storage/sync ; migration réellement exécutée en PGlite |
| 04 | contrôle français desktop/mobile, détails préservés | 3 E2E PASS à 1440/375px, sans débordement ; captures `screens/` |
## Fichiers / données
- App, SummaryFields/MobileDashboard + WorkPercentageField ; hook/types/utils/storage/sync ; tests/E2E ; fiche projet.
- Prisma : `20261106000000_annual_work_percentage`, défaut 100 + bornes SQL.
- Report `carried_over` élargi de numeric(5,1) à numeric(6,2) : conserve centièmes et plage existante.
- Aucune nouvelle table/policy ; migration de production NON appliquée.
## Tests / harness
- `npm test` : 75 PASS ; `npm run typecheck` et `npm run lint` : PASS.
- `prisma validate` avec URL locale fictive (sans connexion) : PASS.
- `npx playwright test e2e/work-percentage.spec.ts` : 3 PASS.
- Harness final après commit : suite COMPLÈTE (stockage transverse), preuve `.agents/state/verify-result.json`.
- Contrat détaillé : `test-contract.md` ; rouge initial sur schéma/calcul absent, puis vert.
## Choix UI / limites
- Tokens existants, champ accessible >=44px, erreur française immédiate ; seule valeur valide est enregistrée.
- Chargement skeleton / vide / erreur-réessayer hérités du conteneur ; détail sans férié explicite.
- Prorata explique nombre initial et droit ajusté ; motifs week-end/coïncidence restent accessibles.
- TestIDs : work-percentage-input/error/field, holiday-entitlement/details/details-toggle.
- Deux corrections de fixtures uniquement : 2022 possède 3 compensations (2026 en possède 4) ; rechargement sélectionne l’année courante.
- Fixture zéro-solde enrichie du nouveau défaut 100 ; assertions métier conservées.
- Inspection visuelle indépendante et revue sécurité/sync à effectuer par l’orchestrateur/QA.
- Au « go » : appliquer migration additive avant le nouveau client ; aucune nouvelle variable d’environnement.
