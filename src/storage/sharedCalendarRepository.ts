import { z } from "zod";
import { supabase } from "../services/supabaseClient";
const teamSchema = z.object({ id: z.string().uuid(), name: z.string() });
const entrySchema = z.object({ id: z.string(), display_name: z.string(), start_date: z.string().date(), end_date: z.string().date(), start_half: z.enum(["morning", "afternoon"]).nullable(), end_half: z.enum(["morning", "afternoon"]).nullable() });
export type CalendarEntry = z.infer<typeof entrySchema>;
export type CalendarTeam = z.infer<typeof teamSchema>;
export async function loadSharedCalendar(monthStart: string, team: string | null): Promise<{ teams: CalendarTeam[]; entries: CalendarEntry[] }> {
 if (!supabase) throw new Error("Connexion au serveur indisponible.");
 try {
  const [teams, entries] = await Promise.all([supabase.rpc("my_calendar_teams"), supabase.rpc("shared_calendar", { month_start: monthStart, selected_team: team })]);
  if (teams.error || entries.error) throw new Error();
  return { teams: z.array(teamSchema).parse(teams.data), entries: z.array(entrySchema).parse(entries.data) };
 } catch { throw new Error("Impossible de charger les congés d’équipe. Réessayez."); }
}
