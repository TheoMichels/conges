# Build Report — team-monthly-leave
- Statut : READY_FOR_QA · Cycle : 1 · Branche : fix/team-monthly-leave
- Données : migration locale `20261204000000_shared_calendar_monthly` ; aucune commande sur base distante.
- Projection limitée aux membres actifs des équipes autorisées ; aucun motif ni solde exposé ; reprise en mémoire sans écriture source.
- UI : grille existante, avertissement `calendar-unplaced` ; chargement, erreur avec reprise, absence d'équipe et données conservés ; tokens existants, mobile et desktop.
- AC-01 : projection SQL et répartition existante dans repository ; intégration PGlite et E2E.
- AC-02 : contrôles SQL des équipes et révocations ; E2E dates, demi-journées, navigation et filtre ; tests existants des fériés.
- AC-03 : avertissement et aucune date inventée pour valeurs impossibles ; E2E mobile et desktop.
- Harness final : voir `.agents/state/verify-result.json` après commit.
- À appliquer au go : migration Prisma ; aucune variable supplémentaire.
