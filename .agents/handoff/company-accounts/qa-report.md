# QA — company-accounts (AC-05)
- Branche/HEAD : `feature/company-accounts` / `e8f5d48`.
- Harness réutilisé : `.agents/state/verify-result.json` PASS, `scope=full`, HEAD concordant, 0 fichier non commité ; type front couvert.
- E2E associé : `e2e/company-accounts.spec.ts`, test « administration locale : démonstration isolée hors connexion » vérifie badge démonstration, recherche Alice (Bob absent), désactivation/réactivation, retour espace personnel et aucune requête externe.
- Résultat de ce test : non relancé indépendamment ; le harness complet indique e2e PASS (rapport build : 7 tests PASS).
- Vérification navigateur : non réalisée, aucun navigateur n’est exposé dans l’inventaire Codex (`browsers=[]`).
- Aperçu : `start-preview.sh` échoue, écriture du log dans `.agents/state/logs/preview-build.log` refusée (Operation not permitted) ; aucun processus démarré, stop-preview confirme « Aucune preview active ».
- Tentative Playwright ciblée : échoue avant test ; serveur de config refuse `listen EPERM 0.0.0.0:4173`.
- AC-01 à AC-04 : hors de cette reprise ciblée ; rapport antérieur indiqué dans le build report.
- AC-05 : NOT_VERIFIED — test automatisé attesté par harness, mais inspection visuelle/navigation et taille 375/1440 non vérifiables dans l’environnement.
- Défauts constatés : aucun défaut produit démontré ; limitation d’environnement empêche la preuve indépendante requise.
VERDICT: FAIL
