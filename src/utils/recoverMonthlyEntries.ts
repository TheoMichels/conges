import { HalfDay, LeaveEntry } from "../types/yearPlan";
import { parseISODate, toISODate, workingDaysCount } from "./leaveDays";

type Slot = { date: string; half: HalfDay };

// Recovery never drops an unplaceable historic value, and runs identically on every load.
export function recoverMonthlyEntries(year: string, entries: LeaveEntry[]): LeaveEntry[] {
  if (!/^\d{4}$/.test(year) || !entries.some(entry => entry.kind === "month")) return entries;
  const yearNumber = Number(year);
  const slots: Slot[] = [];
  const day = new Date(yearNumber, 0, 1);
  while (day.getFullYear() === yearNumber) {
    const date = toISODate(day);
    if (workingDaysCount(date, date) === 1) {
      slots.push({ date, half: "morning" }, { date, half: "afternoon" });
    }
    day.setDate(day.getDate() + 1);
  }
  const occupied = new Set<number>();
  for (const entry of entries) {
    if (entry.kind !== "dates" || !parseISODate(entry.startDate) || !parseISODate(entry.endDate)) continue;
    slots.forEach((slot, index) => {
      if (slot.date < entry.startDate || slot.date > entry.endDate) return;
      if (slot.date === entry.startDate && slot.half === "morning" && entry.startHalf === "afternoon") return;
      if (slot.date === entry.endDate && slot.half === "afternoon" && entry.endHalf === "morning") return;
      occupied.add(index);
    });
  }
  const replacements = new Map<string, LeaveEntry[]>();
  const ids = new Set(entries.map(entry => entry.id));
  const monthly = entries.filter(entry => entry.kind === "month")
    .sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const entry of monthly) {
    if (entry.kind !== "month" || entry.days <= 0 || !Number.isInteger(entry.days * 2)) continue;
    const available = slots.map((slot, index) => ({ slot, index }))
      .filter(({ slot, index }) => Number(slot.date.slice(5, 7)) === entry.month + 1 && !occupied.has(index));
    const required = entry.days * 2;
    if (available.length < required) continue;
    const chosen = available.slice(0, required);
    const groups: typeof chosen[] = [];
    for (const item of chosen) {
      const last = groups[groups.length - 1];
      if (!last || last[last.length - 1].index + 1 !== item.index) groups.push([item]);
      else last.push(item);
    }
    const result: LeaveEntry[] = [];
    let conflict = false;
    groups.forEach((group, index) => {
      const id = index === 0 ? entry.id : `${entry.id}~recovered~${index}`;
      if (index > 0 && ids.has(id)) conflict = true;
      result.push({ id, kind: "dates", label: entry.label, createdAt: entry.createdAt,
        startDate: group[0].slot.date, endDate: group[group.length - 1].slot.date,
        startHalf: group[0].slot.half, endHalf: group[group.length - 1].slot.half, estimated: true });
    });
    if (conflict) continue;
    chosen.forEach(({ index }) => occupied.add(index));
    result.forEach(item => ids.add(item.id));
    replacements.set(entry.id, result);
  }
  return entries.flatMap(entry => replacements.get(entry.id) ?? [entry]);
}
