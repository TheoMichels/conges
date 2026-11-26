# F01 — Comptes Holy et administration
Type : front ; auth et stockage transverses : harness E2E complet.

AC-01 — Un utilisateur Holy existant retrouve ses données ; après inscription et première connexion, un nouveau compte apparaît une seule fois dans le registre. Un compte appartenant uniquement à une autre app est exclu. Vérifier les migrations et le registre sur base isolée et le parcours en E2E.
AC-02 — Seul le compte dont l’adresse authentifiée vérifiée est michelstheo1@gmail.com voit et ouvre Administration ; un visiteur ou membre est refusé par URL et appels directs, y compris après saisie de cette adresse dans son profil. Vérifier UI et base/API.
AC-03 — Un admin désactive et réactive un autre membre ; dès la prochaine requête, lectures et écritures Holy sont refusées même avec une session ouverte. Les données restent accessibles aux fonctions admin prévues et reviennent après réactivation ; l’admin reste actif. Vérifier UI et base/API.
AC-04 — Chaque membre peut renseigner son nom d’affichage ; à défaut utiliser la partie avant @ ; seuls le membre et l’admin peuvent accéder à son adresse complète. Le mode local reste autonome.

Respecter docs/COMPANY_LEAVE_SPEC.md, contraintes communes, Prisma et migrations versionnées ; aucune écriture distante. Preuves : intégration base isolée pour migrations et autorisations, E2E Playwright et harness front. Revue sécurité et QA indépendantes requises.
