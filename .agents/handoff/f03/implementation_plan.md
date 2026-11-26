# F03 — Activation des années et gestion des droits
Type : front

AC-06 : Une nouvelle personne sans année voit « Aucune année de congés activée » ; les brouillons restent invisibles, les années activées apparaissent après rechargement et les années existantes restent actives après migration.
AC-07 : Les droits et les totaux respectent les exemples de la spec, y compris le remplacement des fériés par zéro et le retour au mode automatique.
AC-08 : Le report validé reste fixe ; les écritures concurrentes de saisies préservent les droits corrigés.
AC-09 : Seul l’admin ouvre les années et modifie les droits ; seul le propriétaire actif écrit ses saisies dans ses années actives ; les agrégats administratifs excluent les libellés privés.

Périmètre et détails : docs/COMPANY_LEAVE_SPEC.md, section F03 ; conserver le mode local autonome. Vérifier chaque AC par tests adaptés, y compris autorisations et migration en base isolée et E2E ciblé. Les changements touchant stockage ou garde exigent la suite E2E complète.
