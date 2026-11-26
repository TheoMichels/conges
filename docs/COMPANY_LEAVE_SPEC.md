# Holy pour les congés en entreprise

Chaque collaborateur garde son espace personnel de congés. L’administrateur ouvre les années et gère les droits et les équipes. Les membres d’une même équipe peuvent consulter leurs absences dans un calendrier mensuel partagé.

| Lot | Fonctionnalité | Type | Dépend de |
| --- | --- | --- | --- |
| F01 | Comptes Holy et accès à l’administration | `front` | — |
| F02 | Suppression du taux de travail | `front` | — |
| F03 | Activation des années et gestion des droits | `front` | F01, F02 |
| F04 | Saisie par dates et reprise des congés mensuels | `front` | — |
| F05 | Gestion des équipes et de leurs membres | `front` | F01 |
| F06 | Calendrier partagé des absences | `front` | F03, F04, F05 |

Ordre conseillé pour une réalisation séquentielle · **F01 → F02 → F03 → F04 → F05 → F06**. Chaque lot a ses propres critères d’acceptation et peut être confié séparément à un agent.

## F01 — Comptes Holy et accès à l’administration

- Conserver l’inscription et la connexion classiques par e-mail et mot de passe. Le registre dans Holy comprend les comptes qui ont déjà des données Holy et les comptes dès leur première connexion réussie à Holy. Les comptes du projet Supabase partagé qui n’utilisent que d’autres applications restent hors du registre.
- Réserver la page **Administration** et ses opérations au compte dont l’adresse authentifiée et vérifiée est `michelstheo1@gmail.com`. Vérifier ce droit à chaque opération côté serveur ou en base. Le lien d’administration est visible pour ce compte. L’administration utilise la session du même compte que l’espace personnel.
- L’admin retrouve un membre par e-mail. Pour le calendrier, chaque membre dispose d’un nom d’affichage, renseignable dans Holy pour les comptes existants et futurs. Dans l’intervalle, afficher la partie de l’adresse avant `@`. Réserver l’adresse complète à l’intéressé et à l’admin.
- L’admin peut désactiver puis réactiver un autre compte **dans Holy**. La désactivation bloque l’accès aux données Holy dès la prochaine requête, y compris avec une session déjà ouverte. Elle conserve les données et les affectations pour l’administration et la réactivation. L’unique compte administrateur reste actif.

| Critère | Résultat attendu | Vérification |
| --- | --- | --- |
| AC-01 | Un compte existant retrouve ses données. Un nouveau compte peut s’inscrire et figure une seule fois dans l’annuaire après connexion. Un compte qui utilise uniquement une autre app n’y figure pas. | E2E inscription et reconnexion, intégration de l’annuaire |
| AC-02 | L’admin voit et ouvre la page. Un membre ordinaire ou un visiteur est refusé via l’URL et via un appel direct. Saisir l’adresse admin dans son profil ne donne aucun droit. | E2E et intégration des autorisations |
| AC-03 | Après désactivation, les lectures et écritures d’un membre sont refusées malgré une session ouverte. Les données restent consultables dans les fonctions admin prévues et le membre les retrouve après réactivation. | E2E et intégration des autorisations |

## F02 — Suppression du taux de travail

- Retirer le champ « Taux » et son effet sur le calcul des nouvelles années. Les fériés récupérables sont calculés selon le calendrier luxembourgeois déjà utilisé. Il s’agit du **nombre de jours récupérables crédités au solde**. Les jours fériés exclus du décompte d’une absence relèvent toujours du calendrier de référence.
- Préserver les soldes à la migration. Si l’ancien taux changeait effectivement le nombre de fériés crédités pour une année existante, garder le montant déjà comptabilisé comme valeur manuelle pour cette année. Les autres années restent en mode automatique. F03 ajoute l’édition de cette valeur et le retour au mode automatique.
- Appliquer la même reprise aux données personnelles stockées en local. Conserver les saisies, les autres droits et les reports existants lors de cette reprise.

| Critère | Résultat attendu | Vérification |
| --- | --- | --- |
| AC-04 | Sur mobile et sur ordinateur, le taux disparaît. Une nouvelle année reçoit le nombre automatique de fériés récupérables sans prorata. | E2E et test unitaire du calcul |
| AC-05 | Un dossier avec un taux inférieur à 100 % et un prorata effectif conserve les mêmes valeurs de fériés crédités, de « Pris » et de « Restant » après reprise et rechargement. Une deuxième exécution de la reprise ne modifie pas ces valeurs. | Intégration de la reprise cloud et locale |

## F03 — Activation des années et gestion des droits

- Dans **Administration**, l’admin choisit une année, retrouve chaque membre et voit si son année est à créer, en brouillon ou active. Il peut préparer et activer une année pour une seule personne. Un couple membre/année est unique.
- Avant d’activer, l’admin renseigne le **solde initial**, les **reportés** et le **CSupp**. Zéro est une valeur valable. Pour les **fériés récupérables**, le montant automatique est renseigné d’emblée. L’admin peut saisir un montant de remplacement et rétablir le montant automatique. L’écran indique le mode utilisé.
- Lors de la création, proposer comme report le restant de l’année précédente si elle existe pour le membre, ou zéro sinon. L’admin valide ou corrige la proposition. Après activation, le report reste la valeur fixée par l’admin, même si l’année précédente est modifiée. Accepter les reports signés et les valeurs en jours jusqu’à deux décimales. Les trois autres droits sont positifs ou nuls.
- À l’activation, l’année apparaît dans l’espace personnel. Le membre consulte les droits et continue à créer, modifier et supprimer ses propres saisies. Il choisit parmi ses années actives. Si aucune année n’est active, l’espace personnel affiche « Aucune année de congés activée ». Les utilisateurs ne peuvent plus créer, renommer ni supprimer d’année dans le mode connecté. Reprendre comme actives les années déjà présentes lors de la migration.
- L’admin peut corriger les quatre droits après activation. Il voit les totaux « Pris » et « Restant » pour chaque membre et chaque année, en lecture seule. Le détail des saisies personnelles reste du ressort de leur propriétaire. Il n’y a pas de validation d’une saisie par l’admin.

**Calculs.** « Pris » additionne les jours décomptés de toutes les saisies de l’année, y compris les congés déjà planifiés à des dates futures. « Restant » vaut **solde initial + reportés + CSupp + fériés récupérables − Pris**. Un restant négatif reste affiché, comme aujourd’hui. Modifier un droit recalcule « Restant ». Ajouter, modifier ou supprimer une saisie recalcule les deux totaux.

| Critère | Résultat attendu | Vérification |
| --- | --- | --- |
| AC-06 | Un nouveau compte sans année voit l’état d’attente. Une année en brouillon est invisible pour le membre. Dès que l’admin valide les droits et active l’année, le membre la retrouve sur son compte après rechargement. Une année existante reste accessible après migration. | E2E à deux comptes et intégration de la reprise |
| AC-07 | Avec un solde initial de 26, 2 jours reportés, 1 de CSupp et 2 fériés crédités, une saisie de 1,5 jour donne « Pris » = 1,5 et « Restant » = 29,5 pour le membre et l’admin. Passer les fériés à 0 donne 27,5 restants. Réactiver le mode automatique rétablit 29,5. | Unitaire et E2E |
| AC-08 | Un changement de l’année précédente laisse intact le report fixé pour l’année active. Une saisie enregistrée depuis un écran ouvert avant une correction admin conserve les droits corrigés. | Intégration des calculs et des écritures concurrentes |
| AC-09 | Appels directs compris, seul l’admin peut ouvrir une année et éditer les droits. Seul le propriétaire actif peut enregistrer une saisie dans une de ses années actives. L’accès admin aux agrégats ne donne pas accès aux libellés personnels. | Intégration des autorisations et E2E |

## F04 — Saisie par dates et reprise des congés mensuels

- Exiger une date de début et une date de fin valides à chaque création ou modification, avec une fin au plus tôt le jour de début. Une journée utilise la même date aux deux extrémités. Conserver les journées, demi-journées, périodes et libellés personnels de la saisie actuelle. Le décompte exclut les samedis, dimanches et fériés luxembourgeois. Le formulaire et l’écriture en base refusent une nouvelle entrée au format mensuel.
- Reprendre les anciennes saisies mensuelles par ordre de création, avec un ordre stable en cas d’égalité. Pour un membre donné, placer le volume au début du mois d’origine, sur les premiers créneaux ouvrés disponibles, matin avant après-midi. Tenir compte des congés déjà datés et des créneaux attribués plus tôt dans la reprise. Si nécessaire, répartir le volume sur plusieurs périodes pour contourner des créneaux occupés.
- Conserver le libellé personnel et le total d’origine. Marquer les dates générées comme **estimées** jusqu’à ce que le membre les confirme ou les corrige. Si le volume ne peut pas être placé entièrement dans le mois, par exemple 1,2 jour ou un mois déjà plein, conserver l’entrée historique dans le récapitulatif personnel et dans « Pris », avec l’indication **À dater**. Le membre peut la remplacer par des dates réelles et voit le nouveau décompte avant enregistrement. Ces exceptions restent absentes du calendrier d’équipe jusqu’à leur mise en dates.
- Appliquer cette reprise aux données cloud et aux données personnelles en local. Une nouvelle exécution de la reprise ne crée aucun doublon.

| Critère | Résultat attendu | Vérification |
| --- | --- | --- |
| AC-10 | La saisie mensuelle a disparu. Une journée, un matin seul et une période datée restent modifiables et donnent le bon décompte après rechargement. Une écriture sans dates ou avec des dates invalides est refusée. | Unitaire, intégration et E2E |
| AC-11 | Une ancienne saisie de 1,5 jour se place sur les premiers créneaux ouvrés libres du mois. Si le premier matin est déjà pris, elle utilise le premier après-midi libre et la journée ouvrée libre suivante. Le total annuel et les saisies préexistantes restent identiques après une ou plusieurs exécutions. | Intégration de la reprise cloud et locale |
| AC-12 | Une entrée de 1,2 jour ou impossible à placer reste comptabilisée et affiche « À dater ». Une saisie datée la remplace une seule fois, et le nouveau décompte correspond aux dates enregistrées. | Intégration et E2E |

## F05 — Gestion des équipes et de leurs membres

- Dans **Administration**, l’admin peut créer, renommer et archiver une équipe. Une équipe a un nom obligatoire, unique parmi les équipes actives, sans distinction de casse ni d’espaces en début et fin.
- Depuis la fiche d’un membre, l’admin peut associer ou retirer une ou plusieurs équipes actives. Un membre peut appartenir à zéro, une ou plusieurs équipes. Chaque affectation est unique et peut être modifiée indépendamment de l’activation d’une année.
- L’archivage rend l’équipe indisponible pour les nouvelles affectations et les calendriers partagés. L’admin retrouve l’équipe et ses affectations dans les archives. Les congés personnels sont conservés.

| Critère | Résultat attendu | Vérification |
| --- | --- | --- |
| AC-13 | L’admin crée deux équipes, inscrit une personne dans les deux, renomme l’une puis retire l’autre. Les changements persistent après rechargement. Répéter une affectation ne crée pas de doublon. | E2E et intégration |
| AC-14 | Une équipe archivée garde son nom et ses affectations dans l’administration. Elle sort des choix actifs. Un membre ordinaire ne peut lire ou modifier l’annuaire des équipes via les opérations admin. | E2E et intégration des autorisations |

## F06 — Calendrier partagé des absences

- Un membre actif affecté à une équipe active accède à **Congés d’équipe**, même si son propre plan annuel est encore en attente. Ouvrir le mois courant. Permettre de changer de mois et d’année et de filtrer sur une équipe ou toutes ses équipes. Prévoir un état « Aucun congé ce mois-ci » et un message avec possibilité de réessayer si le chargement échoue.
- Afficher les absences datées déjà saisies des membres actifs des équipes choisies, y compris les siennes. Un membre nouvellement affecté peut voir les mois passés et futurs déjà saisis par les collègues actuels. Les événements couvrant plusieurs mois s’affichent sur les jours décomptés de chaque mois concerné.
- Pour chaque absence, afficher le nom d’affichage, la date et la journée ou demi-journée concernée. Signaler les dates estimées issues de F04. Exposer seulement les données nécessaires au calendrier. Les libellés personnels, adresses complètes et droits restent privés, y compris dans les réponses réseau du calendrier. Avec plusieurs équipes en commun, afficher une absence une seule fois dans la vue « Toutes mes équipes ».
- L’accès est réévalué côté serveur ou en base à chaque lecture. Retirer une affectation supprime la visibilité liée à l’équipe dès la prochaine lecture, y compris sur son historique. Si les deux membres partagent une autre équipe active, l’accès subsiste par celle-ci. Un compte désactivé et une équipe archivée sortent du calendrier partagé. Un membre sans affectation active voit un état « Aucune équipe assignée ». L’admin accède à cette vue selon ses propres affectations.

| Critère | Résultat attendu | Vérification |
| --- | --- | --- |
| AC-15 | Sur ordinateur et sur mobile, un nouveau membre retrouve les congés passés et futurs déjà saisis d’un collègue. Les demi-journées, les absences réparties sur deux mois et l’indication « Dates estimées » sont correctement rendues. | E2E avec plusieurs années et tailles d’écran |
| AC-16 | Avec deux équipes en commun, une absence apparaît une fois dans « Toutes mes équipes » et dans chaque filtre concerné. Un utilisateur extérieur à l’équipe ne récupère aucune de ses absences en modifiant le filtre ou l’appel réseau. | E2E et intégration des autorisations |
| AC-17 | Un ancien membre ne voit plus les absences après retrait de sa dernière équipe commune, même pour un mois passé. Désactiver un compte ou archiver une équipe retire l’accès correspondant. Une réponse autorisée ne contient ni libellé personnel, ni e-mail complet, ni solde. | Intégration des autorisations et des données retournées |

## Contraintes communes de réalisation

- Les fonctionnalités collectives appartiennent au mode connecté. Le mode local reste un espace personnel autonome, avec suppression du taux et saisies datées. Les migrations conservent séparément les données de chaque compte et du mode local.
- Prisma et ses migrations restent la référence du schéma `holy`. Les permissions côté serveur ou en base garantissent les règles d’accès des lots F01, F03, F05 et F06. Toute projection du calendrier est limitée aux champs utiles et aux équipes autorisées. Une écriture de congé et une modification des droits annuels doivent rester indépendantes, y compris quand elles sont faites simultanément.
- Pour chaque lot, vérifier son parcours avec le harness `front` et une spec Playwright ciblée. Prouver les autorisations et les migrations sur des données isolées au niveau de la base ou de l’API. Les tests navigateur avec réponses simulées couvrent l’interface. Prévoir la revue des changements d’authentification, des politiques d’accès et de la synchronisation.
