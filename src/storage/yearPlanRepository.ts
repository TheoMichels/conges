import AsyncStorage from "@react-native-async-storage/async-storage";
import { isLocalMode } from "../config/storageMode";
import {
  LeaveEntry,
  YearPlan,
  yearPlanSchema,
  yearPlansSchema,
} from "../types/yearPlan";
import { SEED_PLANS } from "./seedPlans";

export const STORAGE_KEY = "@holidays_year_plans_v1";
export const LEGACY_STORAGE_KEY = "conges:yearPlans";

// Format historique d'un plan avant l'introduction des entrées de congés
type StoredPlan = Partial<YearPlan> & { months?: number[] };

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

function normalize(raw: StoredPlan): YearPlan {
  const rawEntries = Array.isArray(raw.entries)
    ? raw.entries
    : legacyMonthEntries(raw.months);

  return {
    id: String(raw.id ?? `plan-${raw.year ?? Date.now()}`),
    year: String(raw.year ?? new Date().getFullYear()),
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    initialLeave: typeof raw.initialLeave === "number" ? raw.initialLeave : 0,
    carriedOver: typeof raw.carriedOver === "number" ? raw.carriedOver : 0,
    csupp: typeof raw.csupp === "number" ? raw.csupp : 0,
    publicHolidays: typeof raw.publicHolidays === "number" ? raw.publicHolidays : 0,
    entries: rawEntries as LeaveEntry[],
  };
}

/**
 * Détermine l'URL de l'API en mode distant (non-local) :
 * - Si EXPO_PUBLIC_API_URL est défini, l'utilise.
 * - En web déployé (non-localhost), utilise le chemin relatif '/api/conges'.
 * - Retourne null si aucun endpoint distant n'est disponible.
 */
export function getApiUrl(): string | null {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return `${envUrl.trim().replace(/\/$/, "")}/api/conges`;
  }

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

export async function loadFromLocalStorage(): Promise<YearPlan[]> {
  // 1. Lecture de la clé canonique v1
  const rawCanonical = await AsyncStorage.getItem(STORAGE_KEY);
  if (rawCanonical) {
    try {
      const parsed = JSON.parse(rawCanonical);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map((item) => normalize(item as StoredPlan));
        const validation = yearPlansSchema.safeParse(normalized);
        if (validation.success && validation.data.length > 0) {
          let plans = validation.data;
          const isOnlyPlaceholder =
            plans.length === 1 &&
            plans[0].initialLeave === 0 &&
            plans[0].entries.length === 0;

          if (isOnlyPlaceholder) {
            plans = SEED_PLANS;
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
            return plans;
          }
          return plans;
        }
      }
    } catch (e) {
      console.warn("Erreur de parsing/validation du stockage canonique:", e);
    }
  }

  // 2. Migration transparente depuis la clé legacy 'conges:yearPlans' si STORAGE_KEY est vide
  const rawLegacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  if (rawLegacy) {
    try {
      const parsedLegacy = JSON.parse(rawLegacy);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
        const normalized = parsedLegacy.map((item) => normalize(item as StoredPlan));
        const validation = yearPlansSchema.safeParse(normalized);
        if (validation.success && validation.data.length > 0) {
          const migratedPlans = validation.data;
          // Persistance dans la nouvelle clé canonique sans supprimer l'ancienne clé
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migratedPlans));
          return migratedPlans;
        }
      }
    } catch (e) {
      console.warn("Erreur lors de la migration des données legacy:", e);
    }
  }

  // 3. Fallback initial : aucune donnée trouvée, injection des graines
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PLANS));
  return SEED_PLANS;
}

export interface CreateYearPlanInput {
  id?: string;
  year: string;
  createdAt?: number;
  initialLeave?: number;
  carriedOver?: number;
  csupp?: number;
  publicHolidays?: number;
  entries?: LeaveEntry[];
}

export const yearPlanRepository = {
  async list(): Promise<YearPlan[]> {
    if (isLocalMode) {
      return loadFromLocalStorage();
    }

    const apiUrl = getApiUrl();
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
        const normalized = (remoteData as unknown[]).map((raw) =>
          normalize(raw as StoredPlan)
        );
        const parsed = yearPlansSchema.safeParse(normalized);
        if (parsed.success && parsed.data.length > 0) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.data));
          return parsed.data;
        }
      }

      const initialPlans = await loadFromLocalStorage();
      await this.saveAll(initialPlans);
      return initialPlans;
    } catch (err) {
      console.warn(
        "Connexion à l'API distante impossible, bascule sur le cache local:",
        err
      );
      return loadFromLocalStorage();
    }
  },

  async get(id: string): Promise<YearPlan | null> {
    const plans = await this.list();
    return plans.find((p) => p.id === id) ?? null;
  },

  async create(data: CreateYearPlanInput): Promise<YearPlan> {
    const newPlan: YearPlan = {
      id: data.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      year: data.year,
      createdAt: data.createdAt ?? Date.now(),
      initialLeave: data.initialLeave ?? 0,
      carriedOver: data.carriedOver ?? 0,
      csupp: data.csupp ?? 0,
      publicHolidays: data.publicHolidays ?? 0,
      entries: data.entries ?? [],
    };
    const validated = yearPlanSchema.parse(newPlan);
    const plans = await this.list();
    const updated = [...plans.filter((p) => p.id !== validated.id), validated];
    await this.saveAll(updated);
    return validated;
  },

  async update(
    id: string,
    patch: Partial<Omit<YearPlan, "id">>
  ): Promise<YearPlan> {
    const plans = await this.list();
    const existing = plans.find((p) => p.id === id);
    if (!existing) {
      throw new Error(`Plan avec l'identifiant ${id} introuvable`);
    }
    const updated = yearPlanSchema.parse({
      ...existing,
      ...patch,
      id: existing.id,
    });
    const next = plans.map((p) => (p.id === id ? updated : p));
    await this.saveAll(next);
    return updated;
  },

  async remove(id: string): Promise<void> {
    const plans = await this.list();
    const next = plans.filter((p) => p.id !== id);
    await this.saveAll(next);
  },

  async saveAll(plans: YearPlan[]): Promise<void> {
    const validated = yearPlansSchema.parse(plans);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validated));

    if (isLocalMode) {
      return;
    }

    const apiUrl = getApiUrl();
    if (!apiUrl) {
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(validated),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `Échec de synchronisation distante (${response.status}): ${errorText || response.statusText}`
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Impossible de synchroniser avec le serveur distant.";
      console.error("Erreur lors de la synchronisation distante:", err);
      throw new Error(message);
    }
  },
};
