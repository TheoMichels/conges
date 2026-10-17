# Stockage local — Holidays

Ce document décrit le fonctionnement du stockage local de l'application Holidays, conforme à la section §4 de `stack-target.md`.

## 1. Clés de stockage (AsyncStorage / localStorage)

L'application persiste ses données dans le stockage clé-valeur du navigateur ou du runtime mobile :

| Clé | Rôle | Format |
|---|---|---|
| `@holidays_year_plans_v1` | **Clé canonique v1** utilisée pour l'ensemble des plans annuels de congés | Tableau JSON d'objets `YearPlan` validés par Zod |
| `conges:yearPlans` | **Clé historique** (legacy) conservée pour la rétrocompatibilité | Tableau JSON de plans bruts |

### Règle d'or de rétrocompatibilité et migration transparente
1. Au démarrage, l'application recherche en priorité la clé canonique `@holidays_year_plans_v1`.
2. Si cette clé est vide ou absente, mais que l'ancienne clé `conges:yearPlans` existe, les données historiques sont automatiquement converties, normalisées et validées avec Zod, puis enregistrées sous `@holidays_year_plans_v1`.
3. L'ancienne clé `conges:yearPlans` n'est **jamais supprimée** afin de garantir une sécurité totale contre toute perte de données.
4. Si aucune clé n'existe, l'application s'initialise avec les plans d'exemple (`SEED_PLANS` 2024-2025).

## 2. Validation runtime Zod

Toutes les lectures et écritures sont contrôlées par les schémas Zod définis dans `src/types/yearPlan.ts` :

- **`HalfDay`** : `"morning" | "afternoon"`
- **`LeaveEntryDraft`** / **`LeaveEntry`** :
  - Soit par plage de dates :
    ```ts
    {
      id: string,
      kind: "dates",
      label: string,
      startDate: string, // YYYY-MM-DD
      endDate: string,   // YYYY-MM-DD
      startHalf?: "morning" | "afternoon",
      endHalf?: "morning" | "afternoon",
      createdAt: number
    }
    ```
  - Soit par total mensuel :
    ```ts
    {
      id: string,
      kind: "month",
      label: string,
      month: number, // 0 à 11
      days: number,  // >= 0
      createdAt: number
    }
    ```
- **`YearPlan`** :
  - `id`: identifiant unique (`string`)
  - `year`: libellé de l'année sur 4 chiffres (`string`, ex: `"2025"`)
  - `createdAt`: horodatage de création (`number`)
  - `initialLeave`: quota de base en jours (`number`)
  - `carriedOver`: reliquat reporté de l'année précédente (`number`)
  - `csupp`: congés supplémentaires / ancienneté (`number`)
  - `publicHolidays`: jours fériés compensatoires légaux (`number`)
  - `entries`: tableau de `LeaveEntry`

Si des données invalides ou corrompues sont rencontrées, un repli propre est déclenché sans crash de l'interface utilisateur.

## 3. Modes de stockage (`storageMode.ts`)

Conformément à `stack-target.md` §4, le mode est déterminé par la fonction canonique `resolveStorageMode` :

- **Mode `local`** :
  - Activé sur toute origine de loopback (`localhost`, `127.0.0.1`, `*.localhost`, `::1`) ou lors d'un build hors Vercel.
  - **Zéro appel réseau** : aucun appel n'est émis vers des API externes ou Upstash Redis. Les données restent strictement dans le navigateur.
  - L'entête de l'application affiche le badge « Stockage local ».
- **Mode `supabase`** :
  - Réservé aux déploiements Vercel Preview et Production sur origine distante non-loopback.

## 4. Isolation par origine navigateur

Dans un navigateur web, le `localStorage` est strictement isolé par couple `(protocole, nom d'hôte, port)` :
- `http://localhost:8081` possède un espace distinct de `http://127.0.0.1:8081`.
- Les environnements de test (`http://localhost:4173`) ou les domaines distants ont également leur propre espace.

## 5. Inspection et réinitialisation

### Inspecter les données
1. Ouvrir les Outils de Développement du navigateur (touche `F12` ou `Cmd+Option+I`).
2. Se rendre dans l'onglet **Application** (ou **Stockage**) > **Stockage local** (Local Storage) > sélectionner l'origine actuelle.
3. Rechercher la clé `@holidays_year_plans_v1`.

### Réinitialiser le stockage local
Dans la console du navigateur :
```js
// Réinitialiser la clé canonique
localStorage.removeItem("@holidays_year_plans_v1");

// Pour une remise à zéro complète :
localStorage.clear();
location.reload();
```
Au prochain rechargement, l'application réinitialisera automatiquement les données de graine.
