# F05 — Gestion des équipes
Type : front. Branche : feature/f05-team-management.
AC-13 : créer deux équipes, affecter un membre aux deux sans doublon, renommer une équipe puis retirer l’autre ; les changements persistent après rechargement.
AC-14 : archiver une équipe conserve son nom et ses affectations dans les archives, la retire des choix actifs et interdit aux membres ordinaires les opérations admin de lecture et d’écriture.
Contraintes : noms actifs uniques sans casse ni espaces extérieurs, affectations indépendantes des années ; conservation des congés. Mode connecté seulement.
Preuves : E2E ciblé, intégration base/API sur données isolées pour unicité et autorisations ; harness front strict et revue sécurité.
