# Preuve finale — congés mensuels en équipe

- Branche : fix/team-monthly-leave ; revue sécurité : APPROVE ; QA indépendante : PASS.
- AC-01 PASS : répartition des congés mensuels sur les premiers créneaux ouvrés disponibles ; E2E et tests unitaires.
- AC-02 PASS : demi-journées, congés datés et filtre ; tests E2E et intégration SQL des autorisations.
- AC-03 PASS : valeurs non répartissables signalées ; E2E, inspection synthétique 375 et 1440 px sans erreur console ni débordement.
- Harness strict front : typecheck, lint, unit, build, E2E PASS ; voir .agents/state/verify-result.json.
- Limite : noms parfois sur plusieurs lignes sur mobile ; données source inchangées.
- Au go : appliquer la migration Prisma ; aucune variable ajoutée.
