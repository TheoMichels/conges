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

export const yearPlanRepository = {
  async list(): Promise<YearPlan[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PLANS));
      return SEED_PLANS;
    }
    try {
      const parsed = JSON.parse(raw) as StoredPlan[];
      let plans = parsed.map(normalize);

      // If the user had a blank auto-generated placeholder without entries
      const isOnlyPlaceholder =
        plans.length === 1 &&
        plans[0].initialLeave === 0 &&
        plans[0].entries.length === 0;

      if (isOnlyPlaceholder) {
        plans = SEED_PLANS;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
        return plans;
      }

      // Ensure 2024 and 2025 are present
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
  },

  // The full list is always written at once, from the single in-memory copy
  // held by useYearPlans — never derived from a fresh read of storage.
  async saveAll(plans: YearPlan[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  },
};
