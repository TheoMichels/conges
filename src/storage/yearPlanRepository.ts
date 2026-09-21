import AsyncStorage from "@react-native-async-storage/async-storage";
import { LeaveEntry, YearPlan } from "../types/yearPlan";
import { SEED_PLANS } from "./seedPlans";

const STORAGE_KEY = "conges:yearPlans";

// Plans saved before leave entries existed held one editable total per month.
type StoredPlan = YearPlan & { months?: number[] };

function legacyMonthEntries(months: number[] | undefined): LeaveEntry[] {
  if (!months) return [];
  return months.flatMap((days, month) =>
    days > 0
      ? [
          {
            id: `legacy-${month}`,
            label: "Congés",
            createdAt: Date.now(),
            kind: "month" as const,
            month,
            days,
          },
        ]
      : []
  );
}

function normalize({ months, ...plan }: StoredPlan): YearPlan {
  return {
    ...plan,
    initialLeave: plan.initialLeave ?? 0,
    carriedOver: plan.carriedOver ?? 0,
    csupp: plan.csupp ?? 0,
    publicHolidays: plan.publicHolidays ?? 0,
    entries: plan.entries ?? legacyMonthEntries(months),
  };
}

/**
 * Détermine l'URL de l'API :
 * - Si EXPO_PUBLIC_API_URL est défini (mobile ou dev local connecté), l'utilise.
 * - En web déployé (non-localhost), utilise le chemin relatif '/api/conges'.
 * - En local standalone sans configuration, retourne null (mode AsyncStorage pur).
 */
export function getApiUrl(): string | null {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return `${envUrl.trim().replace(/\/$/, "")}/api/conges`;
  }

  // Navigateur web (client)
  if (typeof window !== "undefined" && window.location) {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!isLocalhost) {
      return "/api/conges";
    }
  }

  return null;
}

async function loadFromLocalStorage(): Promise<YearPlan[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PLANS));
    return SEED_PLANS;
  }
  try {
    const parsed = JSON.parse(raw) as StoredPlan[];
    let plans = parsed.map(normalize);

    const isOnlyPlaceholder =
      plans.length === 1 &&
      plans[0].initialLeave === 0 &&
      plans[0].entries.length === 0;

    if (isOnlyPlaceholder) {
      plans = SEED_PLANS;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
      return plans;
    }

    let modified = false;
    const has2024 = plans.some((p) => p.year === "2024");
    const has2025 = plans.some((p) => p.year === "2025");

    if (!has2024) {
      plans.push(SEED_PLANS[0]);
      modified = true;
    }
    if (!has2025) {
      plans.push(SEED_PLANS[1]);
      modified = true;
    }

    if (modified) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    }

    return plans;
  } catch {
    return SEED_PLANS;
  }
}

export const yearPlanRepository = {
  async list(): Promise<YearPlan[]> {
    const apiUrl = getApiUrl();

    // Si aucune URL API distante n'est configurée (mode local hors-ligne)
    if (!apiUrl) {
      return loadFromLocalStorage();
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status})`);
      }

      const remoteData = await response.json();

      if (Array.isArray(remoteData) && remoteData.length > 0) {
        const plans = (remoteData as StoredPlan[]).map(normalize);
        // Mise en miroir dans le stockage local
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
        return plans;
      }

      // Si la base distante est vide, initialiser avec les données locales ou seeds
      const initialPlans = await loadFromLocalStorage();
      await this.saveAll(initialPlans);
      return initialPlans;
    } catch (err) {
      console.warn("Connexion à l'API distante impossible, bascule sur le cache local:", err);
      return loadFromLocalStorage();
    }
  },

  async saveAll(plans: YearPlan[]): Promise<void> {
    // 1. Toujours enregistrer localement immédiatement pour garantir la persistance locale
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));

    const apiUrl = getApiUrl();
    if (!apiUrl) {
      // Mode local uniquement, rien d'autre à faire
      return;
    }

    // 2. Synchroniser vers le serveur Vercel / Upstash Redis
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(plans),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `Échec de synchronisation distante (${response.status}): ${errorText || response.statusText}`
        );
      }
    } catch (err: any) {
      console.error("Erreur lors de la synchronisation distante:", err);
      // On propage l'erreur si on était censé être en ligne pour informer l'utilisateur
      throw new Error(
        err.message || "Impossible de synchroniser avec le serveur distant."
      );
    }
  },
};
