# Build Report — company-accounts
- **Statut** : en vérification ; cycle 1 ; branche `feature/company-accounts`.
- **Données** : migration `20261126000000_company_accounts` et schéma Prisma ; aucune écriture distante.
- **Sécurité** : identité vérifiée dans `auth.users`, état actif relu en base, RPC à privilèges et RLS.
- **UI** : profil et administration avec chargement, vide, erreur et données ; tokens existants et testID.
| AC | Preuve |
|---|---|
| 01 | `tests/companyAccounts.test.mjs`, `e2e/company-accounts.spec.ts` |
| 02 | mêmes tests ; contrôle SQL direct et URL |
| 03 | mêmes tests ; RLS PostgreSQL isolé et actions UI |
| 04 | mêmes tests ; RPC profil et liste admin |
- Tests ciblés, harness et limites : voir résultat de vérification final et message de livraison.
- Revue sécurité et QA indépendantes requises.
