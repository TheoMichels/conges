import { YearPlan } from "../types/yearPlan";
import { entryTotalDays } from "./leaveDays";
import { countLuxembourgCompensatoryHolidays } from "./luxembourgHolidays";

export function roundTwoDecimals(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isValidYearFormat(year: string): boolean {
  const trimmed = year.trim();
  if (!/^\d{4}$/.test(trimmed)) return false;
  const num = parseInt(trimmed, 10);
  return num >= 1900 && num <= 2100;
}

export function parseYearNumber(year: string): number | null {
  const trimmed = year.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  const num = parseInt(trimmed, 10);
  return Number.isFinite(num) ? num : null;
}

export function calculatePlanBudget(plan: YearPlan): number {
  const holidays = countLuxembourgCompensatoryHolidays(plan.year);
  return roundTwoDecimals(
    plan.initialLeave + plan.carriedOver + plan.csupp + holidays
  );
}

export function calculatePlanTaken(plan: YearPlan): number {
  const total = (plan.entries ?? []).reduce(
    (sum, entry) => sum + entryTotalDays(entry),
    0
  );
  return roundTwoDecimals(total);
}

export function calculatePlanRemaining(plan: YearPlan): number {
  return roundTwoDecimals(calculatePlanBudget(plan) - calculatePlanTaken(plan));
}

export function sortPlansChronologically(plans: YearPlan[]): YearPlan[] {
  return [...plans].sort((a, b) => {
    const yearA = parseYearNumber(a.year);
    const yearB = parseYearNumber(b.year);
    if (yearA !== null && yearB !== null) {
      return yearA - yearB;
    }
    if (yearA !== null) return -1;
    if (yearB !== null) return 1;
    return a.year.localeCompare(b.year);
  });
}

export function findPreviousYearPlan(
  plans: YearPlan[],
  plan: YearPlan
): YearPlan | undefined {
  const yearNum = parseYearNumber(plan.year);
  if (yearNum === null) return undefined;
  return plans.find((p) => parseYearNumber(p.year) === yearNum - 1);
}

export function findNextYearPlan(
  plans: YearPlan[],
  plan: YearPlan
): YearPlan | undefined {
  const yearNum = parseYearNumber(plan.year);
  if (yearNum === null) return undefined;
  return plans.find((p) => parseYearNumber(p.year) === yearNum + 1);
}

/**
 * Propagates the remaining balance of `sourceYearNum` to the `carriedOver`
 * field of the next consecutive year (`sourceYearNum + 1`), and cascades
 * forward as long as consecutive years exist.
 */
export function propagateCarryOverFrom(
  plans: YearPlan[],
  sourceYearNum: number
): YearPlan[] {
  const planMap = new Map<string, YearPlan>();
  for (const p of plans) {
    planMap.set(p.id, { ...p });
  }

  let currentYear = sourceYearNum;

  while (true) {
    // Find current year plan
    const currentPlan = Array.from(planMap.values()).find(
      (p) => parseYearNumber(p.year) === currentYear
    );
    if (!currentPlan) break;

    const nextYear = currentYear + 1;
    const nextPlan = Array.from(planMap.values()).find(
      (p) => parseYearNumber(p.year) === nextYear
    );
    if (!nextPlan) break;

    // Remaining of current year becomes carriedOver of next year
    const remaining = calculatePlanRemaining(currentPlan);
    const updatedNextPlan = { ...nextPlan, carriedOver: remaining };
    planMap.set(updatedNextPlan.id, updatedNextPlan);

    // Continue cascade to next year
    currentYear = nextYear;
  }

  return sortPlansChronologically(Array.from(planMap.values()));
}
