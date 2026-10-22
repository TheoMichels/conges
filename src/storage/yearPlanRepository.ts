import AsyncStorage from "@react-native-async-storage/async-storage";
import { isLocalMode } from "../config/storageMode";
import { syncService } from "../services/syncService";
import {
  LeaveEntry,
  YearPlan,
  yearPlanSchema,
  yearPlansSchema,
} from "../types/yearPlan";
import {
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  LEGACY_CONGES_KEY,
  loadFromLocalStorage,
  normalize,
  StoredPlan,
  legacyMonthEntries,
  readRawKey,
} from "./localStorage";

export {
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  LEGACY_CONGES_KEY,
  loadFromLocalStorage,
  normalize,
  legacyMonthEntries,
  readRawKey,
};
export type { StoredPlan };

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

    return syncService.pullFromCloud();
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

    const canonicalPlans = (await syncService.pushToCloud(validated)) ?? validated;
    for (let index = 0; index < plans.length; index++) {
      plans[index].id = canonicalPlans[index].id;
      validated[index].id = canonicalPlans[index].id;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
  },
};
