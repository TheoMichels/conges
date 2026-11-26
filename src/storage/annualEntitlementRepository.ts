import { z } from "zod";
import { supabase } from "../services/supabaseClient";

const amount = z.coerce.number().finite();
const yearSchema = z.object({ user_id: z.string().uuid(), email: z.string().email(), display_name: z.string(), active: z.boolean(), plan_id: z.string().nullable(), year_active: z.boolean().nullable(), initial_leave: amount.nullable(), carried_over: amount.nullable(), csupp: amount.nullable(), holiday_override: amount.nullable(), automatic_holidays: amount, taken: amount, remaining: amount.nullable(), suggested_carry: amount });
export type AnnualEntitlement = z.infer<typeof yearSchema>;
export async function listAdminYears(): Promise<{ year: string; has_active: boolean }[]> {
  if (!supabase) throw new Error("Connexion au serveur indisponible.");
  const { data, error } = await supabase.rpc("admin_year_catalog");
  if (error) throw new Error("Impossible de charger les années.");
  const parsed = z.array(z.object({ year: z.string().regex(/^\d{4}$/), has_active: z.boolean() })).safeParse(data);
  if (!parsed.success) throw new Error("Réponse des années invalide.");
  return parsed.data;
}
export async function listAnnualEntitlements(year: string): Promise<AnnualEntitlement[]> {
  if (!supabase) throw new Error("Connexion au serveur indisponible.");
  const { data, error } = await supabase.rpc("admin_years", { target_year: year });
  if (error) throw new Error("Impossible de charger les droits annuels.");
  const parsed = z.array(yearSchema).safeParse(data);
  if (!parsed.success) throw new Error("Réponse des droits annuels invalide.");
  return parsed.data;
}
export async function saveAnnualEntitlement(target: string, year: string, initial: number, carried: number, supplementary: number, holiday: number | null, activate: boolean): Promise<void> {
  if (!supabase) throw new Error("Connexion au serveur indisponible.");
  const valid = (n: number) => Number.isFinite(n) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-7;
  if (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2100 || ![initial, carried, supplementary, ...(holiday === null ? [] : [holiday])].every(valid) || initial < 0 || supplementary < 0 || (holiday !== null && holiday < 0)) throw new Error("Saisissez des droits valides avec au plus deux décimales.");
  const { error } = await supabase.rpc("admin_save_year", { target, target_year: year, initial, carried, supplementary, holiday, activate });
  if (error) throw new Error("Impossible d’enregistrer les droits annuels.");
}
