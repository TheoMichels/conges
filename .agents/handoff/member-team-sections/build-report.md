# Sections membres et équipes — build
- AC-01 : fiches membres avec sélecteur multiple et action d’activation ; E2E avec rechargement et aucune affectation.
- AC-02 : section équipes, suppression par archivage, renommage et archives ; E2E ciblé.
- AC-03 : recherche, droits, chargement, erreurs/réessai et mobile ; E2E équipes et comptes.
- UI : tokens existants ; squelette, vide, erreur et contenu ; testID stables ; cibles tactiles de 44 px.
- Correction QA : E2E à 375 px, cibles ≥ 44 px dans le viewport et aucun débordement horizontal ; PASS.
- Vérifications avant commit : typecheck, lint et 9 E2E PASS.
- Inspection visuelle @Browser non vérifiée : navigateur indisponible pour la QA.
- Harness strict front à exécuter après commit avec les deux specs concernées.
- Schéma et dépendances inchangés ; rien de supplémentaire à pousser au go.
