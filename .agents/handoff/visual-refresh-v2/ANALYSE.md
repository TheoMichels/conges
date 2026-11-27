# Holy — analyse visuelle et refonte v2

> Périmètre : **Mes congés** (avec la saisie), **Congés d’équipe**, **Administration**, plus une déclinaison mobile.
> Contrainte : même fonctionnement, même DA (bleu ITS4U `#1F4E79`, orange `#EE6A24`, fond blanc et gris perle `#F8F9FB`, bordures `#E6E8EE`, texte `#1B2B3A`, Segoe UI).
> Mockup : `mockup.html` (dans ce dossier).
> Sources : build `dist/` (mode local) capturé en 1440 px et 390 px avec un jeu de données, lecture du code `src/components/*` (mode connecté, admin réel, calendrier partagé).

---

## 1. Synthèse

L’application est propre, sobre et cohérente avec la charte ITS4U. Elle reste pourtant en retrait des standards actuels (Linear, Lucca, Factorial, Notion, Stripe Dashboard) sur quatre points :

1. **La navigation se casse** dès qu’on quitte « Mes congés » : l’en-tête disparaît et un bouton « ← Retour » le remplace (Administration, Profil, Congés d’équipe).
2. **La hiérarchie est plate** : cartes blanches sur fond blanc, même bordure partout, trois KPI de même poids, puis un bloc qui répète Pris et Restant.
3. **La couleur ne porte pas de sens** : badges de durée colorés d’une ligne à l’autre sans logique métier, initiales « SR / CP / DT » en dégradé sur les KPI, légende unique « Congé » dans un calendrier multicolore.
4. **Les composants ne sont pas unifiés** : au moins cinq définitions locales de `button`, cases et chevrons en caractères Unicode (`☑ ☐ ⌄ ✓ ✕ ←`), `Teams.tsx` sans `fontFamily`, `4.5` dans un champ contre `25,5` à l’affichage.

La refonte v2 corrige ces points **sans toucher au comportement**. Les quelques ajouts purement visuels, calculés à partir de données déjà présentes, sont marqués **[option]**.

---

## 2. Constats transverses

| # | Constat | Impact | Recommandation |
|---|---|---|---|
| T1 | En-tête absent sur Admin, Profil et Congés d’équipe (`CompanyScreen`, `SharedCalendar` rendus sans `Header`) | Perte de repère, pas de navigation latérale entre pages | Garder une seule barre sur toutes les pages, avec l’onglet actif souligné en orange. Profil et déconnexion passent dans un menu utilisateur. |
| T2 | Lien actif signalé seulement par du texte orange `#EE6A24` (contraste 3,1:1 sur blanc) | Accessibilité AA non atteinte, état peu visible | Texte foncé + soulignement orange de 2 px : la couleur ITS4U est gardée, sans porter la lisibilité. |
| T3 | Fond blanc + cartes blanches + bordure identique | Pas de profondeur, tout a le même poids | Canvas `#F8F9FB` (token existant `panelSubtle`), cartes blanches avec `shadow-xs`. Aucune nouvelle couleur. |
| T4 | Échelle typo incohérente : nav en 17 px, contenu en 14 px, titres en 30 px | La navigation domine le contenu | Nav 14 px semibold, H1 26 px, titres de carte 15 px, eyebrow 11,5 px en majuscules. Chiffres en `tabular-nums`. |
| T5 | Unicode utilisé comme icônes (`✓ ✕ ☑ ☐ ⌄ ← → ⓘ`) | Rendu variable selon l’OS, aspect « brouillon » | Jeu d’icônes SVG à trait (style Lucide), déjà possible avec `react-native-svg` (`ActionIcon` existe). |
| T6 | Boutons définis localement dans 5 fichiers, avec des hauteurs de 44 à 46 et des rayons de 12 à 14 | Dérive visuelle à chaque nouvelle fonctionnalité | Composant `Button` unique (variantes `primary`, `secondary`, `ghost`, `danger` ; tailles `md` 38, `sm` 32) avec une zone tactile de 44 conservée via `hitSlop`. |
| T7 | Couleur des badges de durée (`tagPalette`) sans signification | Bruit visuel : on cherche un sens qui n’existe pas | Durée en texte neutre et gras ; la couleur reste réservée aux statuts (OK, alerte, brouillon). |
| T8 | Focus des champs : contour noir de 2 px (navigateur) | En décalage avec la DA | Anneau `0 0 0 3px rgba(31,78,121,.16)` et bordure `#1F4E79`. |
| T9 | Formats numériques mixtes (`4.5` dans un champ, `25,5` affiché) | Doute sur la valeur | Formater les champs en fr-FR (virgule), en acceptant aussi le point à la saisie, comme le fait déjà l’admin. |
| T10 | Bouton CTA : texte blanc sur `#EE6A24`, soit **3,1:1** | Sous le seuil AA de 4,5 pour du texte de 14 px | **À arbitrer** : (a) garder tel quel (choix de marque fréquent) ; (b) utiliser le token existant `ctaText #C2541A` comme fond du bouton (4,6:1) ; (c) garder `#EE6A24` avec un libellé de 16 px en gras (gain limité). Le mockup garde (a). |

---

## 3. Page « Mes congés »

### Constats
- **Trois KPI de même poids** avec avatars à initiales (`SR`, `CP`, `DT`) : les initiales servent à identifier des personnes, pas des métriques. La pastille verte de statut est ambiguë.
- **Redondance** : « Pris » et « Restant » apparaissent dans les KPI puis à nouveau dans *Détail des droits et soldes*, sous forme de champs grisés qui ressemblent à des inputs désactivés.
- Les droits sont présentés en grille 3×2, alors qu’il s’agit d’une **addition** (Initial + Reportés + Csupp + Fériés = Total).
- **Liste des congés** : toutes les lignes ont le même poids, passées comme à venir, triées sans regroupement, avec un badge coloré arbitraire et des icônes modifier / supprimer de même intensité que le contenu.
- **Barre latérale des années** : l’année sélectionnée perd son solde (remplacé par les icônes) ; le liseré orange et le fond bleu se superposent.

### Recommandations (mockup §1)
- **Carte « Solde restant » mise en avant** : grand chiffre, puis une jauge segmentée *pris / planifiés / restants* et sa légende chiffrée. Badge « Dans le budget » ou « Dépassement » (même logique qu’aujourd’hui : `remaining < 0`).
- **Carte « Composition des droits »** sous forme d’addition, alignée à droite en chiffres tabulaires. En mode connecté les montants sont en lecture seule (« Défini par l’administration ») ; en mode local, les mêmes lignes affichent les `NumberField` existants.
- **Liste groupée « À venir » / « Passés »** (tri existant `entryOrderKey`), avec un bloc date (mois + jour), un sous-titre de période, une étiquette *Matin / Après-midi* explicite et la durée en texte neutre. Actions estompées, pleinement visibles au survol.
- **Le CTA « Ajouter un congé » remonte** dans l’en-tête de page : c’est l’action principale.
- **[option] Aperçu annuel** : 12 mini-colonnes (jours posés par mois), mois courant cerclé d’orange.

## 3b. Saisie d’un congé

### Constats
- Le calendrier fait environ 330 px et laisse les deux tiers de la carte vides à droite.
- « Du / Au » est rendu en police monospace ; le champ *Justificatif* a un contour noir épais au focus.
- On ne voit pas l’effet de la saisie sur le solde avant de valider.

### Recommandations (mockup §1b)
- **Deux colonnes** : calendrier à gauche ; justificatif, période, demi-journées et récapitulatif à droite.
- **Plage visible** : début et fin en pastilles bleues pleines, jours intermédiaires teintés `primarySoft`, week-ends atténués, jours déjà posés soulignés, fériés pointés en orange.
- **Demi-journées en contrôle segmenté** (mêmes options qu’aujourd’hui : *Toute la journée / Dès l’après-midi* et *Toute la journée / Jusqu’à midi*).
- **Récapitulatif** : durée ouvrée (calcul existant), solde actuel et **[option] solde après**.

---

## 4. Page « Congés d’équipe »

### Constats
- Pas d’en-tête global ; « ← Retour » en haut à gauche.
- Navigation mois : flèches aux deux extrémités de la carte, mois centré, ce qui oblige à de grands déplacements de souris.
- **Week-ends en pleine largeur** alors qu’aucun congé ne s’y affiche (`workingDaysCount === 0`) : 2/7 de la grille sont perdus.
- **Badges en 10 px et 9 px**, un badge par jour et par personne (une semaine complète = 5 badges identiques) ; le texte passe sur deux lignes.
- **Légende unique « Congé »** alors que chaque membre a sa couleur.
- Jour courant non signalé ; avertissement « Congés mensuels impossibles à répartir » en texte rouge brut.

### Recommandations (mockup §2)
- En-tête global conservé ; toolbar à droite du titre : **[option] « Aujourd’hui »**, ‹ mois ›.
- Filtre d’équipe en **contrôle segmenté** (mêmes valeurs : *Toutes mes équipes* + équipes).
- **Grille 5 + 2** : week-ends à 50 % de largeur et hachurés.
- **Barres continues par semaine** : un segment par personne et par semaine, avec initiales + nom ; étiquette *Matin* / *Ap.-midi* pour les demi-journées ; « +N autres » au-delà de 3 lignes. Implémentation RN : découper chaque congé en segments `[début ∩ semaine, fin ∩ semaine]`, puis positionner en `position:absolute` (left = colonne × largeur).
- **Panneau latéral** : **[option] « Absents aujourd’hui »** et **légende par membre** (même algorithme `colorsForMembers`, même palette `leaveColors`).
- Jour courant en pastille orange ; **[option]** fériés luxembourgeois (`luxembourgHolidays.ts`) ; avertissement en bannière `warningSoft`.

---

## 5. Page « Administration »

### Constats
- Une **seule carte** contient recherche, droits annuels, membres, équipes et archives : défilement long, pas de repère.
- **Droits annuels** : chaque membre est une carte avec 4 champs étiquetés et 3 boutons (`Auto`, `Enregistrer` en orange, `Activer`). Avec 20 membres, cela fait 20 boutons orange : le CTA ne signale plus rien.
- Sélecteur d’année : pastilles avec « ✓ » textuel.
- **Membres** : le sélecteur d’équipe est un bloc bleu terminé par « ⌄ », qui s’ouvre sur des boutons « ☑ / ☐ ». Statut « Actif / Désactivé » en texte gris ; « Désactiver » est un bouton neutre alors que l’action est sensible.
- **Équipes** : le bouton « Supprimer » **archive** en réalité l’équipe (`archiveTeam`).
- `Teams.tsx` : plusieurs `<Text>` sans `fontFamily`, et des couleurs de texte non définies dans les boutons.

### Recommandations (mockup §3 et §3b)
- **Onglets** « Droits annuels » / « Membres & équipes ». La **recherche** passe en haut à droite et continue de filtrer les deux onglets (`query` partagé, comme aujourd’hui).
- **Droits annuels en tableau** : Membre · Statut · Solde initial · Reportés · CSupp · Fériés · Pris · Restant · Actions.
  - Champs compacts éditables sur place (34 px), chiffres tabulaires.
  - **État modifié** : liseré orange sur la ligne et bouton « Enregistrer » en orange **uniquement sur cette ligne** ; ailleurs le bouton reste secondaire. Même appel `saveAnnualEntitlement` par ligne.
  - « Auto » devient une **icône ↺** dans la cellule Fériés, avec l’étiquette *auto* / *manuel*.
  - « Activer » n’apparaît que pour *Brouillon* et *À créer* (règle existante `!row.year_active`).
  - Statuts en badges : Active (vert), Brouillon (ambre), À créer (neutre). Restant négatif en rouge.
  - Erreur de ligne affichée en bandeau sous la ligne concernée.
- **Années en contrôle segmenté** (point ambre sur une année en brouillon) + bouton secondaire « Nouvelle année ».
- **[option] Compteurs** : membres, actives, à traiter, soldes négatifs.
- **Membres & équipes côte à côte** :
  - Table Membres : avatar, nom et e-mail, **étiquettes d’équipes** avec « + » ouvrant un menu à vraies cases à cocher (même `setTeamMember`), badge de statut, « Désactiver » en *ghost danger* et « Réactiver » en secondaire.
  - Carte Équipes : création en ligne, liste avec nombre de membres et pile d’avatars, icônes *Renommer* / *Archiver*, **Archives repliables**.
  - Libellé **« Archiver »** à la place de « Supprimer » (comportement inchangé).

---

## 6. Mobile

### Constats
- L’en-tête mobile cumule logo, « Stockage local » ou e-mail, « Congés d’équipe », « Profil », « Administration » et « Quitter », et passe sur deux lignes.
- Les KPI en 3 colonnes ont des libellés en 10–11 px.
- La grille 7 colonnes du calendrier d’équipe est illisible sous 400 px.

### Recommandations (mockup §4)
- **Barre d’onglets en bas** : Mes congés · Équipe · Admin (si `is_admin`) · Profil. La déconnexion passe dans Profil.
- **Bouton d’ajout flottant** au-dessus de la barre.
- Solde mis en avant + jauge, composition repliable, liste groupée.
- **Congés d’équipe en agenda** : bandeau semaine + absences par jour (mêmes données, mêmes filtres).
- **Admin** : une carte par membre, champs en 2×2, « Enregistrer » par carte.

---

## 7. Tokens

Les couleurs ne changent pas. Ajouts proposés dans `src/theme/colors.ts` :

```ts
textFaint: "#9AA1AD",            // décoratif / désactivé uniquement (2,6:1)
canvas: colors.panelSubtle,      // fond de page #F8F9FB
focusRing: "rgba(31,78,121,.16)",
shadows.xs: { shadowColor:"#141E3C", shadowOffset:{width:0,height:1}, shadowOpacity:.04, shadowRadius:2, elevation:1 },
shadows.pop: { … 0 12 32 / .12 }  // menus, popovers
shape.control: 10                // boutons et champs (cartes : 18 inchangé)
type: { h1: 26, cardTitle: 15, body: 14, small: 12.5, eyebrow: 11.5 }
```

Contrastes vérifiés : `#6B7280` sur blanc 4,8:1 ✓ · `#1F4E79` sur `#EAF1F8` 7,6:1 ✓ · `#15803D` sur `#E9F9EF` 4,6:1 ✓ · `#A16207` sur `#FEF5E2` 4,5:1 ✓ · blanc sur `#EE6A24` **3,1:1** (voir T10) · `#C2541A` sur `#FEF0E7` 4,1:1 (à réserver aux libellés ≥ 12 px en gras).

---

## 8. Plan de mise en œuvre suggéré

| Lot | Contenu | Fichiers principaux | Effort |
|---|---|---|---|
| L1 · Fondations | Tokens, composants `Button`, `Badge`, `SegmentedControl`, `Icon` (SVG), anneau de focus | `theme/colors.ts`, `components/ui/*`, `ActionIcon.tsx` | M |
| L2 · Shell | Header persistant + menu utilisateur ; barre d’onglets mobile ; suppression des « ← Retour » | `Header.tsx`, `App.tsx`, `CompanyScreen.tsx`, `SharedCalendar.tsx` | M |
| L3 · Mes congés | Carte solde + jauge, composition des droits, liste groupée, barre latérale | `KpiCards.tsx`, `SummaryFields.tsx`, `LeaveEntries.tsx`, `Sidebar.tsx`, `MobileDashboard.tsx` | M |
| L4 · Saisie | Formulaire en deux colonnes, plage visible, récapitulatif | `LeaveEntryForm.tsx`, `Calendar.tsx` | S–M |
| L5 · Équipe | Grille 5+2, barres par semaine, panneau latéral, agenda mobile | `SharedCalendar.tsx` | L |
| L6 · Admin | Onglets, tableau des droits, table membres + menu d’équipes, carte équipes | `CompanyScreen.tsx`, `AnnualEntitlements.tsx`, `Teams.tsx` | L |

Les `testID` existants doivent être conservés à l’identique pour que les specs Playwright (`e2e/*.spec.ts`) restent vertes ; seuls `design.spec.ts` et `light-glass.spec.ts` devraient nécessiter une mise à jour des attentes visuelles.

## 9. Ce qui ne change pas

Calculs (solde, fériés, demi-journées, jours ouvrés), modes local / connecté, synchronisation, règles d’activation des années, filtres d’équipe, affectations, archivage, recherche, droits d’accès admin, couleurs par membre, routes (`/`, `/administration`).
