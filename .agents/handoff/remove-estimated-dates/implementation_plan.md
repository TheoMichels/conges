# Suppression des dates estimées
Type : front · Branche : feature/remove-estimated-dates

AC-01 : Les congés datés, anciens ou nouveaux, ne présentent aucune mention ni action de confirmation de dates estimées ; création et modification restent possibles après rechargement.
AC-02 : Le champ estimated est supprimé du schéma, des écritures cloud et du stockage local ; la migration SQL met aussi à jour la fonction de reprise mensuelle sans modifier les dates, libellés, droits ou totaux existants. Les anciennes données locales contenant ce champ restent lisibles.
AC-03 : La reprise mensuelle reste idempotente et conserve les volumes non plaçables « À dater » ; dates et totaux sont identiques avant et après migration.
Vérifications : tests unitaires, migration sur base isolée incluant anciennes données et fonction de reprise, test E2E ciblé avec rechargement, QA visuelle ; harness strict front. Pas de migration distante avant go.
