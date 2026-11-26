# QA F01 — Comptes Holy et administration (26d7d67)

VERDICT: FAIL

- Branche/HEAD : `feature/company-accounts` / `26d7d67` ; arbre de travail propre au HEAD (les rapports QA/review restent non suivis).
- Harness réutilisé : PASS, `scope=full`, `gitHead=26d7d67`, `uncommittedFiles=0` ; typecheck, lint, unit, build et e2e PASS.
- Tests DB isolés : `tests/companyAccounts.test.mjs` vérifie migration des données Holy, idempotence de l’inscription, exclusion des comptes sans données Holy, identité admin vérifiée, droits SQL/RLS, désactivation et réactivation.
- E2E : `e2e/company-accounts.spec.ts` couvre le parcours admin, les refus membre/visiteur, inscription/reconnexion, course de désactivation, récupération locale et quarantaine de cache cloud (`:30-141`).

| AC | Résultat | Preuve / limite |
|---|---|---|
| AC-01 | PASS | Migration PGlite reprend les membres ayant des plans Holy existants et omet les comptes sans données Holy ; répétition de `register_member` ne crée pas de doublon (`tests/companyAccounts.test.mjs:20-30,37-41`). E2E inscription/reconnexion ; harness E2E PASS (`e2e/company-accounts.spec.ts:57-90`). |
| AC-02 | PASS | Test SQL refuse les RPC admin au compte non vérifié et au membre, même après saisie de l’adresse dans le profil (`tests/companyAccounts.test.mjs:24-36`). E2E membre/visiteur refusés par URL ; le contrôle visuel des états n’a pas été fait. |
| AC-03 | PASS | Test SQL vérifie refus des lectures/écritures après désactivation, visibilité admin, réactivation et accès restauré (`tests/companyAccounts.test.mjs:42-53`). E2E couvre les boutons et le rechargement (`e2e/company-accounts.spec.ts:30-43`). |
| AC-04 | PASS (limite) | Test SQL couvre nom par défaut et accès restreint aux tables/RPC (`tests/companyAccounts.test.mjs:28-41`). `tests/storage.test.mjs:188-216` vérifie quarantaine idempotente et reprise explicite sans écrasement de données locales récentes. E2E restaure après clic volontaire, recharge, et vérifie qu’un ancien cache cloud n’est pas attribué au nouveau compte (`e2e/company-accounts.spec.ts:118-141`). Limite déclarée : sur appareil partagé, l’app ne peut pas vérifier l’identité de la personne autorisée à restaurer. |

- Quarantaine/reprise : seules données de provenance inconnue, écran avertissant qu’elles peuvent appartenir à un ancien compte connecté, bouton de consentement « Je comprends, récupérer les données » ; sans clic, elles ne sont pas réattribuées. La reprise échoue si des données locales existent déjà.
- Inspection navigateur : preview `http://localhost:4173` démarrée isolément ; nouvelle tentative `cua.createBrowserTab("iab", "http://localhost:4173", {visible:true})` échoue exactement avec `Browser is not available: iab`. `cua.getState()` précédent renvoyait `browsers: []`. Aucun Safari/Chrome piloté. Rendu 375/1440 px, console, interactions visuelles et réseau non vérifiés.
- FAIL car l’inspection navigateur intégrée obligatoire pour le type `front` n’a pas pu être produite ; les preuves automatisées ci-dessus ne remplacent pas cette vérification. Aucun défaut visuel affirmé.
- Preview isolée arrêtée après l’échec d’ouverture de l’onglet.
