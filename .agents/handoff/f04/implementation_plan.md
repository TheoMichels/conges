# F04 — Saisie datée et reprise
Type : front · Branche : feature/f04-dated-leave

Référence et périmètre : docs/COMPANY_LEAVE_SPEC.md, section F04 et contraintes communes.

- AC-10 : supprimer la saisie mensuelle ; dates valides obligatoires à la création et modification, y compris côté base ; journée, demi-journée et période éditables avec décompte correct après rechargement.
- AC-11 : reprendre les entrées mensuelles par ordre stable sur les premiers créneaux ouvrés libres, matin puis après-midi, en tenant compte des entrées datées et déjà reprises ; conserver libellés, totaux et données existantes ; reprise locale et cloud idempotente ; dates estimées jusqu’à confirmation ou correction.
- AC-12 : conserver et comptabiliser les volumes non plaçables avec indication « À dater » ; leur remplacement daté est unique et affiche le nouveau décompte avant enregistrement.

Vérifications : unitaires et intégration des reprises locale/cloud, validation base et idempotence ; Playwright ciblé création, modification, exceptions, rechargement et formats mobile/desktop. Vérifier les migrations sur base isolée si disponible. Aucun changement distant sans go.
