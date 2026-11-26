# Build Report — company-accounts
- **Statut** : READY_FOR_QA ; cycle 1 ; branche `feature/company-accounts`.
- **Données** : migration `20261126000000_company_accounts` et schéma Prisma ; aucune écriture distante.
- **Sécurité** : identité vérifiée dans `auth.users`, état actif relu en base, RPC à privilèges et RLS.
- **UI** : profil et administration avec chargement, vide, erreur et données ; tokens existants et testID.
| AC | Preuve |
|---|---|
| 01 | `tests/companyAccounts.test.mjs`, `e2e/company-accounts.spec.ts` |
| 02 | mêmes tests ; contrôle SQL direct et URL |
| 03 | mêmes tests ; RLS PostgreSQL isolé et actions UI |
| 04 | mêmes tests ; RPC profil et liste admin |
- Tests ciblés : PostgreSQL isolé PASS ; Playwright 3 parcours PASS. Harness complet : typecheck, lint, unit, build, e2e PASS ; voir `verify-result.json`.
- La spécification utilisateur `docs/COMPANY_LEAVE_SPEC.md` est conservée sans modification et versionnée.
- Revue sécurité et QA indépendantes requises.
