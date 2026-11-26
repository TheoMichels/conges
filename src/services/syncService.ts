import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabaseClient";
import { HalfDay, LeaveEntry, YearPlan } from "../types/yearPlan";
import { loadFromLocalStorage } from "../storage/localStorage";
import { registerMember } from "../storage/memberRepository";

export const CLOUD_CACHE_PREFIX = "@holy_cloud_year_plans_";

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
  holiday_override?: number | string | null;
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
    holidayOverride: row.holiday_override == null ? null : Number(row.holiday_override),
    publicHolidays: Number(row.public_holidays ?? 0),
    entries,
  };
}

async function resolveUserId(userId?: string): Promise<string | null> {
  if (userId) return userId;
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

export async function clearLocalCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter((k) => k.startsWith(CLOUD_CACHE_PREFIX));
    if (appKeys.length > 0) {
      await AsyncStorage.multiRemove(appKeys);
    }
  } catch (err) {
    console.warn("Erreur lors de la purge AsyncStorage:", err);
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(CLOUD_CACHE_PREFIX)) {
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

export async function pullFromCloud(userId?: string): Promise<YearPlan[]> {
  if (!supabase) {
    return loadFromLocalStorage();
  }

  const uid = await resolveUserId(userId);
  if (!uid) throw new Error("Session Holy indisponible.");

  try {
    const { data, error } = await supabase
      .from("year_plans")
      .select("*, leave_entries(*)")
      .eq("user_id", uid)
      .order("year", { ascending: true });

    if (error) {
      throw new Error("Impossible de charger vos données Holy. Réessayez.");
    }

    // A disabled account can produce an empty RLS result without an SQL error.
    // Revalidate after the read before accepting or caching that result.
    const account = await registerMember();
    if (!account.active) throw new Error("Votre compte Holy est désactivé.");
    const cacheKey = CLOUD_CACHE_PREFIX + uid;
    if (Array.isArray(data) && data.length > 0) {
      const plans = (data as unknown as DbYearPlan[]).map(mapDbPlanToYearPlan);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(plans));
      return plans;
    }

    // Un compte cloud vide est la source de vérité, même si un cache local existe.
    await AsyncStorage.setItem(cacheKey, JSON.stringify([]));
    return [];
  } catch (error) {
    if (error instanceof Error && error.message === "Votre compte Holy est désactivé.") throw error;
    throw new Error("Impossible de charger vos données Holy. Réessayez.");
  }
}

export async function upsertCloudPlan(plan: YearPlan, userId?: string): Promise<string> {
  if (!supabase) return plan.id;
  const uid = await resolveUserId(userId);
  if (!uid) return plan.id;

  const nowIso = new Date().toISOString();
  const planIso = new Date(plan.createdAt).toISOString();

  const planRow = {
    id: plan.id,
    user_id: uid,
    year: plan.year,
    initial_leave: plan.initialLeave,
    carried_over: plan.carriedOver,
    csupp: plan.csupp,
    holiday_override: plan.holidayOverride,
    public_holidays: plan.publicHolidays,
    created_at: planIso,
    updated_at: nowIso,
  };

  const planQuery = supabase.from("year_plans").upsert(planRow, {
    onConflict: "user_id,year",
    ignoreDuplicates: true,
  });
  let canonicalPlanId = plan.id;
  if (typeof planQuery.select === "function") {
    const { data: insertedPlan, error: planError } = await planQuery.select("id").maybeSingle();
    if (planError) {
      throw new Error(`Erreur d'enregistrement du plan: ${planError.message}`);
    }

    if (insertedPlan?.id) {
      canonicalPlanId = insertedPlan.id;
    } else {
      const { data: existingPlan, error: fetchPlanError } = await supabase
        .from("year_plans")
        .select("id")
        .eq("user_id", uid)
        .eq("year", plan.year)
        .single();
      if (fetchPlanError || !existingPlan?.id) {
        throw new Error(`Erreur lors de la récupération du plan: ${fetchPlanError?.message ?? "plan introuvable"}`);
      }
      canonicalPlanId = existingPlan.id;

      const { error: updatePlanError } = await supabase
        .from("year_plans")
        .update({
          initial_leave: plan.initialLeave,
          carried_over: plan.carriedOver,
          csupp: plan.csupp,
          holiday_override: plan.holidayOverride,
          public_holidays: plan.publicHolidays,
          updated_at: nowIso,
        })
        .eq("id", canonicalPlanId)
        .eq("user_id", uid);
      if (updatePlanError) {
        throw new Error(`Erreur d'enregistrement du plan: ${updatePlanError.message}`);
      }
    }
  } else {
    // Compatibilité avec les clients de test historiques sans query builder complet.
    const { error: planError } = await planQuery;
    if (planError) {
      throw new Error(`Erreur d'enregistrement du plan: ${planError.message}`);
    }
  }

  // Une création concurrente avec un autre ID a déjà ses entrées rattachées au plan canonique.
  // Ne remplace pas ces entrées avec l'instantané stale de la création perdante.
  if (canonicalPlanId !== plan.id) return canonicalPlanId;

  if (plan.entries && plan.entries.length > 0) {
    const entriesRows = plan.entries.map((entry) => ({
      id: entry.id,
      user_id: uid,
      plan_id: canonicalPlanId,
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

    // Suppression des entrées orphelines (retirées du plan)
    const currentEntryIds = new Set(plan.entries.map((e) => e.id));
    const { data: existingEntries, error: fetchEntriesError } = await supabase
      .from("leave_entries")
      .select("id")
      .eq("user_id", uid)
      .eq("plan_id", canonicalPlanId);

    if (fetchEntriesError) {
      throw new Error(`Erreur lors de la vérification des entrées: ${fetchEntriesError.message}`);
    }

    if (existingEntries) {
      const orphanIds = existingEntries
        .map((e) => e.id)
        .filter((id) => !currentEntryIds.has(id));

      if (orphanIds.length > 0) {
        const { error: delError } = await supabase
          .from("leave_entries")
          .delete()
          .eq("user_id", uid)
          .eq("plan_id", canonicalPlanId)
          .in("id", orphanIds);

        if (delError) {
          throw new Error(`Erreur lors du nettoyage des entrées orphelines: ${delError.message}`);
        }
      }
    }
  } else {
    // Aucune entrée dans le plan : suppression de toutes les entrées orphelines en base
    const { error: delError } = await supabase
      .from("leave_entries")
      .delete()
      .eq("user_id", uid)
      .eq("plan_id", canonicalPlanId);

    if (delError) {
      throw new Error(`Erreur lors de la suppression des entrées orphelines: ${delError.message}`);
    }
  }

  return canonicalPlanId;
}

export async function deleteCloudPlan(planId: string, userId?: string): Promise<void> {
  if (!supabase) return;
  const uid = await resolveUserId(userId);
  if (!uid) return;

  await supabase
    .from("leave_entries")
    .delete()
    .eq("user_id", uid)
    .eq("plan_id", planId);

  const { error } = await supabase
    .from("year_plans")
    .delete()
    .eq("id", planId)
    .eq("user_id", uid);

  if (error) {
    throw new Error(`Erreur lors de la suppression du plan: ${error.message}`);
  }
}

export async function pushToCloud(plans: YearPlan[], userId?: string): Promise<YearPlan[]> {
  if (!supabase) return plans;
  const uid = await resolveUserId(userId);
  if (!uid) return plans;

  // 1. Détection et suppression des plans supprimés
  const { data: remotePlans, error: fetchPlansError } = await supabase
    .from("year_plans")
    .select("id,year")
    .eq("user_id", uid);

  if (fetchPlansError) {
    throw new Error(`Erreur lors de la récupération des plans distants: ${fetchPlansError.message}`);
  }

  const currentPlanIds = new Set(plans.map((p) => p.id));
  const currentYears = new Set(plans.map((p) => p.year));
  const deletedPlanIds = (remotePlans ?? [])
    .filter((remotePlan) => !currentPlanIds.has(remotePlan.id))
    .filter((remotePlan) => !remotePlan.year || !currentYears.has(remotePlan.year))
    .map((p) => p.id);

  for (const planId of deletedPlanIds) {
    await deleteCloudPlan(planId, uid);
  }

  // 2. Enregistrement des plans actuels et nettoyage des entrées orphelines
  const canonicalIds: string[] = [];
  for (const plan of plans) {
    canonicalIds.push(await upsertCloudPlan(plan, uid));
  }
  return plans.map((plan, index) => ({ ...plan, id: canonicalIds[index] }));
}

// Une mutation cible uniquement la saisie concernée, jamais l'instantané du plan.
export async function saveCloudEntry(planId: string, entry: LeaveEntry, operation: "create" | "update"): Promise<void> {
  if (!supabase) throw new Error("Connexion au serveur indisponible.");
  const uid = await resolveUserId();
  if (!uid) throw new Error("Session Holy indisponible.");
  const row = {
    id: entry.id, user_id: uid, plan_id: planId, kind: entry.kind, label: entry.label,
    start_date: entry.kind === "dates" ? entry.startDate : null,
    end_date: entry.kind === "dates" ? entry.endDate : null,
    start_half: entry.kind === "dates" ? (entry.startHalf ?? null) : null,
    end_half: entry.kind === "dates" ? (entry.endHalf ?? null) : null,
    month: entry.kind === "month" ? entry.month : null,
    days: entry.kind === "month" ? entry.days : null,
    created_at: new Date(entry.createdAt).toISOString(), updated_at: new Date().toISOString(),
  };
  const result = operation === "create"
    ? await supabase.from("leave_entries").insert([row])
    : await supabase.from("leave_entries").update(row).eq("user_id", uid).eq("plan_id", planId).eq("id", entry.id);
  if (result.error) throw new Error("Impossible d’enregistrer la saisie de congé.");
}

export async function deleteCloudEntry(planId: string, entryId: string): Promise<void> {
  if (!supabase) throw new Error("Connexion au serveur indisponible.");
  const uid = await resolveUserId();
  if (!uid) throw new Error("Session Holy indisponible.");
  const { error } = await supabase.from("leave_entries").delete().eq("user_id", uid).eq("plan_id", planId).eq("id", entryId);
  if (error) throw new Error("Impossible de supprimer la saisie de congé.");
}

export const syncService = {
  pullFromCloud,
  saveCloudEntry,
  deleteCloudEntry,
  pushToCloud,
  upsertCloudPlan,
  deleteCloudPlan,
  clearLocalCache,
};
