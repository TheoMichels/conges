import { z } from "zod";
import { supabase } from "../services/supabaseClient";

const memberSchema = z.object({ user_id: z.string().uuid(), email: z.string().email(), display_name: z.string(), active: z.boolean() });
const accountSchema = z.object({ active: z.boolean(), is_admin: z.boolean(), display_name: z.string() });
export type Account = z.infer<typeof accountSchema>;
export type Member = z.infer<typeof memberSchema>;

function client() {
  if (!supabase) throw new Error("Connexion au serveur indisponible.");
  return supabase;
}
export async function registerMember(): Promise<Account> {
  const { data, error } = await client().rpc("register_member");
  if (error) throw new Error("Impossible de vérifier votre compte Holy.");
  const parsed = z.array(accountSchema).length(1).safeParse(data);
  if (!parsed.success) throw new Error("Réponse du serveur invalide.");
  return parsed.data[0];
}
export async function saveDisplayName(value: string): Promise<void> {
  const name = z.string().trim().min(1).max(100).safeParse(value);
  if (!name.success) throw new Error("Saisissez un nom de 1 à 100 caractères.");
  const { error } = await client().rpc("set_display_name", { value: name.data });
  if (error) throw new Error("Impossible d’enregistrer le nom.");
}
export async function listMembers(): Promise<Member[]> {
  const { data, error } = await client().rpc("admin_members");
  if (error) throw new Error("Impossible de charger les membres.");
  const parsed = z.array(memberSchema).safeParse(data);
  if (!parsed.success) throw new Error("Réponse du serveur invalide.");
  return parsed.data;
}
export async function setMemberActive(target: string, enabled: boolean): Promise<void> {
  const { error } = await client().rpc("admin_set_active", { target, enabled });
  if (error) throw new Error("Impossible de modifier ce compte.");
}
