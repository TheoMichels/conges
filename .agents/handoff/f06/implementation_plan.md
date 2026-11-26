# F06 — Calendrier partagé
Type : front. Branche : feature/f06-shared-calendar.
AC-15 : un membre accède aux absences datées passées et futures de ses équipes, même sans année active ; changement de mois/année, demi-journées et périodes sur plusieurs mois, mobile et ordinateur.
AC-16 : filtre toutes les équipes ou une équipe ; une absence apparaît une seule fois, et un filtre non autorisé ne révèle aucune absence.
AC-17 : accès recalculé à chaque lecture selon les affectations et comptes actifs et les équipes non archivées ; aucune réponse ne contient libellé personnel, adresse complète ni solde.
États : chargement, aucune équipe assignée, aucun congé ce mois-ci, erreur avec réessai. Mode local personnel inchangé.
Preuves : tests unitaires/intégration des règles et autorisations sur base isolée ; Playwright ciblé mobile et ordinateur ; harness front ; QA et revue sécurité indépendantes.
