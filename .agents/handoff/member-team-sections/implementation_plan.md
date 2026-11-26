# Sections membres et équipes
Type : front. Branche : feature/member-team-sections.
AC-01 : la section Membres liste les membres, avec sur chaque ligne le sélecteur de plusieurs équipes actives et le bouton Désactiver ou Réactiver lorsque permis ; désélectionner toutes les équipes laisse le membre sans équipe, et les affectations persistent après rechargement.
AC-02 : la section Équipes permet de créer et supprimer une équipe ; la suppression utilise l’archivage existant, retire l’équipe des choix actifs et conserve ses affectations historiques. Préserver le renommage et les archives existants.
AC-03 : recherche, droits administrateur, états de chargement/erreur et affichage sur mobile restent fonctionnels. Vérification : E2E ciblé avec rechargement, cas vide, erreur et mobile ; harness front strict et QA indépendante.
