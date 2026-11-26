# Build Report — f03
- **Statut** : READY_FOR_QA ; cycle 2 ; branche `feature/f03-annual-entitlements`.
- **Périmètre** : migration Prisma, synchronisation, composants et tests F03 ; fiche projet mise à jour.
- **Données** : migration `20261128000000_annual_entitlements` ; aucune écriture sur base distante.
- **UI** : administration par année et membre, brouillon/activation, valeurs manuelles ou auto ; état vide connecté, chargement, erreur/réessai et résultats ; `testID` sur actions et champs. Mode local conservé.
- **Contrat** : `test-contract.md` ; E2E mobile sur comptes simulés, PGlite isolé sans mock SQL.

| AC | Code | Vérification |
|---|---|---|
| AC-06 | migration, `useYearPlans`, `App`, administration | PGlite année héritée explicitement active/RLS ; Playwright vide, brouillon, activation, rechargement. |
| AC-07 | fonctions de calcul SQL et droits ; `AnnualEntitlements` | PGlite 29,5/27,5/29,5 et dates ; Playwright saisie et affichage des totaux admin/membre. |
| AC-08 | migration, `syncService`, repository, hook | PGlite report fixe ; test intercalant deux ajouts et une saisie inconnue ; Playwright retarde une saisie pendant une correction admin et recharge. |
| AC-09 | politiques RLS, fonctions admin | PGlite appels directs et confidentialité ; Playwright accès membre et agrégat sans libellé. |

- Correction revue : écritures ciblées par saisie et file locale ordonnée ; aucun effacement par instantané.
- Rouge initial : test PGlite échouait car migration absente ; vert après implémentation.
- Prévalidation : 80 unitaires, typecheck, lint, build et suite E2E complète verts ; relance finale sur commit requise.
- Les serveurs et comptes E2E sont simulés ; PGlite vérifie la migration et les rôles en base isolée, pas une instance Supabase distante.
- À appliquer au « go » : migration Prisma ; aucune variable d’environnement ajoutée.
