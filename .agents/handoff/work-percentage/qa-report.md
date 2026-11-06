# QA indépendante — work-percentage
VERDICT: FAIL
- Branche `feature/work-percentage`, HEAD `9face03`; arbre propre à l’entrée ; aucun fichier applicatif modifié.
- Harness réutilisé : `.agents/state/verify-result.json`, PASS strict/full, HEAD identique, uncommittedFiles=0.
- Étapes : typecheck, lint, unit, build, e2e PASS ; suite complète 23 E2E PASS (`logs/e2e.log:32`).
- AC-01 PASS : `tests/leaveDays.test.mjs:74-83` valide défaut/bornes/décimales ; `e2e/work-percentage.spec.ts:4-54` vérifie erreur française, refus d’écrasement, nouveaux plans et indépendance annuelle ; résultats PASS dans logs unit/e2e.
- AC-02 PASS : `tests/leaveDays.test.mjs:85-102` vérifie 3×80%=2,4, budget 31,4, solde 26,4, reports, droits inchangés et régression 100% ; E2E lignes 20-23 confirme les totaux affichés ; résultats PASS.
- AC-03 PASS : `tests/storage.test.mjs:190-238` vérifie ancien format, droits/entrées préservés, stockage et mappings cloud insert/update/pull ; E2E lignes 30-31 et 49-53 vérifie rechargement ; résultats PASS.
- Migration : SQL réellement exécuté dans PGlite isolé avec schéma auth simulé (`tests/prismaMigrations.test.mjs:31-47`, PASS), défaut 100, bornes et centièmes conservés. Ce n’est ni une exécution Supabase distante ni un déploiement Prisma sur serveur ; aucune migration distante appliquée par cette QA.
- AC-04 NOT_VERIFIED : E2E 1440/375 PASS, assertions libellé accessible, texte original/proratisé, samedi/dimanche/coïncidence et absence de débordement ; captures builder `screens/1440.png`, `screens/375.png` disponibles.
- Blocage : inspection interactive indépendante impossible : premier appel navigateur intégré `tabs.open(http://localhost:4173)` retourne `[browser.disconnected]` (aucun navigateur desktop connecté).
- Console/réseau et rendu interactif via navigateur intégré non vérifiés ; aucune affirmation d’absence d’erreurs rouges. Aucun navigateur personnel ni repli non autorisé utilisé.
- Reprise : connecter cette session dans l’application desktop, puis inspecter les parcours, erreurs/rechargement et rendu desktop/mobile ; aucun bug applicatif établi à ce stade.
- Preview démarrée puis arrêtée via `stop-preview.sh` (confirmation « Preview arrêtée. »).
