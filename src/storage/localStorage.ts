import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  LeaveEntry,
  YearPlan,
  yearPlansSchema,
} from "../types/yearPlan";

export const STORAGE_KEY = "@holy_year_plans_v1";
export const LEGACY_STORAGE_KEY = "@holidays_year_plans_v1";
export const LEGACY_CONGES_KEY = "conges:yearPlans";

// Format historique d'un plan avant l'introduction des entrées de congés
export type StoredPlan = Partial<YearPlan> & { months?: number[] };

export function legacyMonthEntries(months: number[] | undefined): LeaveEntry[] {
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

export function normalize(raw: StoredPlan): YearPlan {
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

export async function readRawKey(key: string): Promise<string | null> {
  const fromAsync = await AsyncStorage.getItem(key);
  if (fromAsync !== null) {
    return fromAsync;
  }
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return null;
}

export async function loadFromLocalStorage(): Promise<YearPlan[]> {
  // 1. Lecture de la clé canonique @holy_year_plans_v1
  const rawCanonical = await readRawKey(STORAGE_KEY);
  if (rawCanonical !== null) {
    try {
      const parsed = JSON.parse(rawCanonical);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map((item) => normalize(item as StoredPlan));
        const validation = yearPlansSchema.safeParse(normalized);
        if (validation.success) {
          return validation.data;
        }
      }
    } catch (e) {
      console.warn("Erreur de parsing/validation du stockage canonique:", e);
    }
  }

  // 2. Migration transparente depuis '@holidays_year_plans_v1' vers '@holy_year_plans_v1'
  const rawHolidaysLegacy = await readRawKey(LEGACY_STORAGE_KEY);
  if (rawHolidaysLegacy) {
    try {
      const parsedLegacy = JSON.parse(rawHolidaysLegacy);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
        const normalized = parsedLegacy.map((item) => normalize(item as StoredPlan));
        const validation = yearPlansSchema.safeParse(normalized);
        if (validation.success && validation.data.length > 0) {
          const migratedPlans = validation.data;
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migratedPlans));
          await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
          if (typeof window !== "undefined" && window.localStorage) {
            try {
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedPlans));
              window.localStorage.removeItem(LEGACY_STORAGE_KEY);
            } catch {
              // Ignorer erreurs localStorage
            }
          }
          return migratedPlans;
        }
      }
    } catch (e) {
      console.warn("Erreur lors de la migration depuis @holidays_year_plans_v1:", e);
    }
  }

  // 3. Migration transparente depuis la clé historique 'conges:yearPlans'
  const rawCongesLegacy = await readRawKey(LEGACY_CONGES_KEY);
  if (rawCongesLegacy) {
    try {
      const parsedLegacy = JSON.parse(rawCongesLegacy);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
        const normalized = parsedLegacy.map((item) => normalize(item as StoredPlan));
        const validation = yearPlansSchema.safeParse(normalized);
        if (validation.success && validation.data.length > 0) {
          const migratedPlans = validation.data;
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migratedPlans));
          return migratedPlans;
        }
      }
    } catch (e) {
      console.warn("Erreur lors de la migration des données legacy:", e);
    }
  }

  // 4. Aucune donnée trouvée : conserver un état vide explicite.
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  return [];
}
