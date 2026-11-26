# F05 — Build
- AC-13 : équipes et affectations, `tests/teams.test.mjs`, `e2e/team-management.spec.ts`.
- AC-14 : archives et autorisations, mêmes tests ; base isolée PGlite.
- UI : tokens existants, états chargement/vide/erreur/peuplé, actions et affectations avec testID ; écran mobile.
- Schéma : migration locale `20261202000000_teams` ; aucune écriture distante.
- Corrections revue : verrou de ligne avant affectation ; échec de rechargement affiché sans faux succès.
- PGlite : une session seulement ; concurrence réelle entre deux transactions non vérifiée localement.
- Vérification finale : harness front ciblé après commit.
- Au go : appliquer la migration ; aucune variable ajoutée.
