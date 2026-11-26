import { z } from "zod";
import { supabase } from "../services/supabaseClient";

const teamSchema = z.object({ id: z.string().uuid(), name: z.string(), archived: z.boolean() });
const assignmentSchema = z.object({ team_id: z.string().uuid(), user_id: z.string().uuid() });
export type Team = z.infer<typeof teamSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
function client() { if (!supabase) throw new Error("Connexion au serveur indisponible."); return supabase; }
export async function listTeams() {
 const [teams, assignments] = await Promise.all([client().rpc("admin_teams"), client().rpc("admin_team_members")]);
 if (teams.error || assignments.error) throw new Error("Impossible de charger les équipes.");
 const parsedTeams = z.array(teamSchema).safeParse(teams.data);
 const parsedAssignments = z.array(assignmentSchema).safeParse(assignments.data);
 if (!parsedTeams.success || !parsedAssignments.success) throw new Error("Réponse du serveur invalide.");
 return { teams: parsedTeams.data, assignments: parsedAssignments.data };
}
export async function saveTeam(target: string | null, value: string) {
 const name = z.string().trim().min(1).max(100).safeParse(value);
 if (!name.success) throw new Error("Saisissez un nom de 1 à 100 caractères.");
 const { error } = await client().rpc("admin_save_team", { target, value: name.data });
 if (error) throw new Error("Impossible d’enregistrer l’équipe. Vérifiez que son nom est unique.");
}
export async function archiveTeam(target: string) {
 const { error } = await client().rpc("admin_archive_team", { target });
 if (error) throw new Error("Impossible d’archiver l’équipe.");
}
export async function setTeamMember(target: string, member: string, assigned: boolean) {
 const { error } = await client().rpc("admin_set_team_member", { target, member, assigned });
 if (error) throw new Error("Impossible de modifier l’affectation.");
}
