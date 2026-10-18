import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabaseClient";
import { HalfDay, LeaveEntry, YearPlan } from "../types/yearPlan";
import { STORAGE_KEY, loadFromLocalStorage } from "../storage/yearPlanRepository";

interface DbLeaveEntry {
  id: string;
  user_id: string;
  plan_id: string;
  kind: string;
  label: string;
  start_date: string | null;
  end_date: string | null;
  start_half: string | null;
  end_half: string | null;
  month: number | null;
  days: number | null;
  created_at: string;
  updated_at: string;
}

interface DbYearPlan {
  id: string;
  user_id: string;
  year: string;
  initial_leave: number;
  carried_over: number;
  csupp: number;
  public_holidays: number;
  created_at: string;
  updated_at: string;
  leave_entries?: DbLeaveEntry[];
}

function mapDbPlanToYearPlan(row: DbYearPlan): YearPlan {
  const entries: LeaveEntry[] = (row.leave_entries ?? []).map((e): LeaveEntry => {
    if (e.kind === "month") {
      return {
        id: e.id,
        kind: "month",
        label: e.label,
        month: e.month ?? 0,
        days: e.days !== null && e.days !== undefined ? Number(e.days) : 0,
        createdAt: new Date(e.created_at).getTime() || Date.now(),
      };
    }
    return {
      id: e.id,
      kind: "dates",
      label: e.label,
      startDate: e.start_date ?? "",
      endDate: e.end_date ?? "",
      startHalf: (e.start_half as HalfDay) ?? undefined,
      endHalf: (e.end_half as HalfDay) ?? undefined,
      createdAt: new Date(e.created_at).getTime() || Date.now(),
    };
  });

  return {
    id: row.id,
    year: row.year,
    createdAt: new Date(row.created_at).getTime() || Date.now(),
    initialLeave: Number(row.initial_leave ?? 0),
    carriedOver: Number(row.carried_over ?? 0),
    csupp: Number(row.csupp ?? 0),
    publicHolidays: Number(row.public_holidays ?? 0),
    entries,
  };
}

export async function clearLocalCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const holidaysKeys = keys.filter((k) => k.startsWith("@holidays_"));
    if (holidaysKeys.length > 0) {
      await AsyncStorage.multiRemove(holidaysKeys);
    }
  } catch (err) {
    console.warn("Erreur lors de la purge AsyncStorage:", err);
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith("@holidays_")) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        window.localStorage.removeItem(key);
      }
    } catch (err) {
      console.warn("Erreur lors de la purge localStorage:", err);
    }
  }
}

export async function pullFromCloud(userId: string): Promise<YearPlan[]> {
  if (!supabase) {
    return loadFromLocalStorage();
  }

  try {
    const { data, error } = await supabase
      .from("year_plans")
      .select("*, leave_entries(*)")
      .eq("user_id", userId)
      .order("year", { ascending: true });

    if (error) {
      console.warn("Erreur de récupération Supabase:", error);
      return loadFromLocalStorage();
    }

    if (Array.isArray(data) && data.length > 0) {
      const plans = (data as unknown as DbYearPlan[]).map(mapDbPlanToYearPlan);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
      return plans;
    }

    // Premier accès utilisateur sans données cloud : initialisation
    const localPlans = await loadFromLocalStorage();
    await pushToCloud(localPlans, userId);
    return localPlans;
  } catch (err) {
    console.warn("Échec du pull cloud:", err);
    return loadFromLocalStorage();
  }
}

export async function upsertCloudPlan(plan: YearPlan, userId: string): Promise<void> {
  if (!supabase) return;

  const nowIso = new Date().toISOString();
  const planIso = new Date(plan.createdAt).toISOString();

  const { error: planError } = await supabase.from("year_plans").upsert({
    id: plan.id,
    user_id: userId,
    year: plan.year,
    initial_leave: plan.initialLeave,
    carried_over: plan.carriedOver,
    csupp: plan.csupp,
    public_holidays: plan.publicHolidays,
    created_at: planIso,
    updated_at: nowIso,
  });

  if (planError) {
    throw new Error(`Erreur d'enregistrement du plan: ${planError.message}`);
  }

  if (plan.entries && plan.entries.length > 0) {
    const entriesRows = plan.entries.map((entry) => ({
      id: entry.id,
      user_id: userId,
      plan_id: plan.id,
      kind: entry.kind,
      label: entry.label,
      start_date: entry.kind === "dates" ? entry.startDate : null,
      end_date: entry.kind === "dates" ? entry.endDate : null,
      start_half: entry.kind === "dates" ? (entry.startHalf ?? null) : null,
      end_half: entry.kind === "dates" ? (entry.endHalf ?? null) : null,
      month: entry.kind === "month" ? entry.month : null,
      days: entry.kind === "month" ? entry.days : null,
      created_at: new Date(entry.createdAt).toISOString(),
      updated_at: nowIso,
    }));

    const { error: entriesError } = await supabase.from("leave_entries").upsert(entriesRows);
    if (entriesError) {
      throw new Error(`Erreur d'enregistrement des entrées: ${entriesError.message}`);
    }
  }
}

export async function deleteCloudPlan(planId: string, userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("year_plans")
    .delete()
    .eq("id", planId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Erreur lors de la suppression du plan: ${error.message}`);
  }
}

export async function pushToCloud(plans: YearPlan[], userId: string): Promise<void> {
  if (!supabase) return;

  for (const plan of plans) {
    await upsertCloudPlan(plan, userId);
  }
}

export const syncService = {
  pullFromCloud,
  pushToCloud,
  upsertCloudPlan,
  deleteCloudPlan,
  clearLocalCache,
};
