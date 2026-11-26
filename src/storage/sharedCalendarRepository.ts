import { z } from "zod";
import { supabase } from "../services/supabaseClient";
import { LeaveEntry } from "../types/yearPlan";
import { recoverMonthlyEntries } from "../utils/recoverMonthlyEntries";
const teamSchema = z.object({ id: z.string().uuid(), name: z.string() });
const rowSchema = z.object({ id: z.string(), display_name: z.string(), member_key: z.string(), kind: z.enum(["dates", "month"]), start_date: z.string().date().nullable(), end_date: z.string().date().nullable(), start_half: z.enum(["morning", "afternoon"]).nullable(), end_half: z.enum(["morning", "afternoon"]).nullable(), month: z.number().int().min(0).max(11).nullable(), days: z.coerce.number().nullable(), created_at: z.string().refine(value => Number.isFinite(Date.parse(value))), reserved_ids: z.array(z.string()) });
export type CalendarEntry = { id: string; display_name: string; start_date: string; end_date: string; start_half: "morning" | "afternoon" | null; end_half: "morning" | "afternoon" | null };
export type CalendarTeam = z.infer<typeof teamSchema>;
export function projectCalendar(rows: z.infer<typeof rowSchema>[], year: string): { entries: CalendarEntry[]; unplaced: string[] } {
 const groups = new Map<string, { name: string; entries: LeaveEntry[]; reserved: Set<string> }>();
 for (const row of rows) {
  const group = groups.get(row.member_key) ?? { name: row.display_name, entries: [], reserved: new Set<string>() };
  const base = { id: row.id, label: "", createdAt: Date.parse(row.created_at) };
  if (row.kind === "dates" && row.start_date && row.end_date) group.entries.push({ ...base, kind: "dates", startDate: row.start_date, endDate: row.end_date, startHalf: row.start_half ?? undefined, endHalf: row.end_half ?? undefined });
  else if (row.kind === "month" && row.month !== null && row.days !== null) group.entries.push({ ...base, kind: "month", month: row.month, days: row.days });
  else throw new Error("Invalid calendar entry");
  row.reserved_ids.forEach(id => group.reserved.add(id));
  groups.set(row.member_key, group);
 }
 const entries: CalendarEntry[] = []; const unplaced: string[] = [];
 for (const group of groups.values()) {
  const present = new Set(group.entries.map(entry => entry.id));
  const placeholders: LeaveEntry[] = [...group.reserved].filter(id => !present.has(id)).map(id => ({ id, kind: "dates", label: "", createdAt: 0, startDate: "", endDate: "" }));
  for (const entry of recoverMonthlyEntries(year, [...group.entries, ...placeholders])) {
  if (placeholders.some(placeholder => placeholder.id === entry.id)) continue;
  if (entry.kind === "month") { unplaced.push(group.name); continue; }
  entries.push({ id: entry.id, display_name: group.name, start_date: entry.startDate, end_date: entry.endDate, start_half: entry.startHalf ?? null, end_half: entry.endHalf ?? null });
  }
 }
 return { entries, unplaced };
}
export async function loadSharedCalendar(monthStart: string, team: string | null): Promise<{ teams: CalendarTeam[]; entries: CalendarEntry[]; unplaced: string[] }> {
 if (!supabase) throw new Error("Connexion au serveur indisponible.");
 try {
  const [teams, entries] = await Promise.all([supabase.rpc("my_calendar_teams"), supabase.rpc("shared_calendar", { month_start: monthStart, selected_team: team })]);
  if (teams.error || entries.error) throw new Error();
  return { teams: z.array(teamSchema).parse(teams.data), ...projectCalendar(z.array(rowSchema).parse(entries.data), monthStart.slice(0, 4)) };
 } catch { throw new Error("Impossible de charger les congés d’équipe. Réessayez."); }
}
