# Calendrier : congés mensuels
Type : front
AC-01 : les congés mensuels des membres actifs des équipes autorisées apparaissent dès les premiers créneaux ouvrés disponibles du mois, selon la règle existante de reprise, sans modifier les données source.
AC-02 : les congés datés, demi-journées, chevauchements, jours fériés, sélection d’équipe et changements de mois restent corrects ; aucune donnée hors équipe autorisée n’est exposée.
AC-03 : les valeurs impossibles à répartir restent signalées sans dates inventées ; la vue reste utilisable sur mobile et desktop.
Preuves : tests unitaires/intégration et E2E du calendrier, inspection indépendante et harness strict front.
