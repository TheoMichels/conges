# Revue — work-percentage
DECISION: APPROVE
- Diff revu : `main...9face03aa78eb267498174a369a7362effb641ea` ; périmètre conforme.
- Aucun point bloquant identifié ; aucune modification applicative ou écriture distante effectuée.
## Contrôles
- AC-01 : validation Zod et saisie stricte, défaut 100 %, invalides non enregistrés, indépendance annuelle couverts.
- AC-02 : calcul centralisé pour fériés, budget, solde et reports ; autres droits et entrées non proratisés.
- AC-03 : mappings cloud lecture/insertion/mise à jour cohérents ; valeur absente normalisée à 100 %.
- Migration additive : défaut 100, NOT NULL, bornes SQL ; report numeric(6,2) conserve la plage précédente et les centièmes.
- Tests de conservation des droits/entrées, round-trip local/cloud et migration exécutée en PGlite présents.
- AC-04 : contrôle français accessible, tokens existants, détails week-end/coïncidence et tests 1440/375 px présents.
- Sécurité : aucun secret ajouté ; filtres utilisateur et RLS existants non altérés ; aucune nouvelle table.
- `npx tsc --noEmit` exécuté : PASS ; `git diff --check main...HEAD` : PASS.
- Harness réutilisé : `.agents/state/verify-result.json`, PASS strict/full, gitHead `9face03`, 0 fichier non commité ; HEAD et arbre propre vérifiés avant rapport.
- Étapes harness : typecheck, lint, unit, build et E2E PASS ; aucune étape sautée.
## Livraison
- Appliquer la migration avant le nouveau client lors du « go » ; aucune migration distante exécutée pendant cette revue.
- Inspection visuelle indépendante laissée au QA conformément au plan.
