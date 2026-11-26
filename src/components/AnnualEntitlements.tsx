import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AnnualEntitlement, listAnnualEntitlements, saveAnnualEntitlement } from "../storage/annualEntitlementRepository";
import { colors, radius, spacing } from "../theme/colors";
import { LoadingSkeleton } from "./LoadingScreen";

type Props = { demo: boolean };
const parse = (value: string) => Number(value.trim().replace(",", "."));
export function AnnualEntitlements({ demo }: Props) {
  const requestId = useRef(0);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [rows, setRows] = useState<AnnualEntitlement[] | null>(null);
  const [selected, setSelected] = useState<AnnualEntitlement | null>(null);
  const [initial, setInitial] = useState("0");
  const [carried, setCarried] = useState("0");
  const [csupp, setCsupp] = useState("0");
  const [holiday, setHoliday] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2100) { setError("Saisissez une année valide."); return; }
    const request = ++requestId.current;
    try { setError(""); setRows(null); const result = await listAnnualEntitlements(year); if (request === requestId.current) setRows(result); }
    catch (e) { if (request === requestId.current) setError(e instanceof Error ? e.message : "Impossible de charger les droits."); }
  }, [year]);
  useEffect(() => { if (!demo && /^\d{4}$/.test(year)) void load(); }, [demo, load, year]);
  const select = (row: AnnualEntitlement) => {
    setSelected(row); setInitial(String(row.initial_leave ?? 0)); setCarried(String(row.carried_over ?? row.suggested_carry));
    setCsupp(String(row.csupp ?? 0)); setHoliday(row.holiday_override === null ? "" : String(row.holiday_override)); setNotice("");
  };
  const save = async (activate: boolean) => {
    if (!selected) return;
    if ([initial, carried, csupp].some(value => !/^-?\d+(?:[.,]\d{1,2})?$/.test(value.trim())) || (holiday !== "" && !/^\d+(?:[.,]\d{1,2})?$/.test(holiday.trim()))) { setError("Saisissez des montants valides avec au plus deux décimales."); return; }
    try {
      setBusy(true); setError(""); await saveAnnualEntitlement(selected.user_id, year, parse(initial), parse(carried), parse(csupp), holiday === "" ? null : parse(holiday), activate);
      setSelected(null); setNotice(activate ? "Année activée et droits enregistrés." : "Droits enregistrés."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Impossible d’enregistrer les droits."); }
    finally { setBusy(false); }
  };
  if (demo) return <Text>La gestion des droits est disponible en mode connecté.</Text>;
  return <View testID="annual-entitlements" style={styles.box}>
    <Text style={styles.title}>Droits annuels</Text>
    <View style={styles.row}><TextInput testID="annual-year" value={year} onChangeText={value => { requestId.current++; setSelected(null); setYear(value); }} keyboardType="number-pad" maxLength={4} style={styles.input} /><Pressable testID="annual-load" style={styles.button} onPress={() => { setSelected(null); void load(); }}><Text>Afficher</Text></Pressable></View>
    {error ? <View testID="annual-error"><Text style={styles.error}>{error}</Text><Pressable onPress={() => void load()} style={styles.button}><Text>Réessayer</Text></Pressable></View> : null}
    {notice ? <Text testID="annual-notice">{notice}</Text> : null}
    {rows === null && !error ? <LoadingSkeleton /> : rows?.length === 0 ? <Text testID="annual-empty">Aucun membre.</Text> : rows?.map(row => <Pressable key={row.user_id} testID={`annual-member-${row.user_id}`} style={styles.member} onPress={() => select(row)}><Text>{row.display_name} · {row.email}</Text><Text>{row.plan_id ? row.year_active ? "Active" : "Brouillon" : "À créer"}{row.plan_id ? ` · Pris : ${row.taken} · Restant : ${row.remaining}` : ""}</Text></Pressable>)}
    {selected && <View testID="annual-editor" style={styles.box}><Text style={styles.title}>{selected.display_name} · {year}</Text>
      <Text>Solde initial</Text><TextInput testID="annual-initial" style={styles.input} value={initial} onChangeText={setInitial} keyboardType="decimal-pad" />
      <Text>Reportés {selected.plan_id ? "" : "(proposition de l’année précédente)"}</Text><TextInput testID="annual-carried" style={styles.input} value={carried} onChangeText={setCarried} keyboardType="decimal-pad" />
      <Text>CSupp</Text><TextInput testID="annual-csupp" style={styles.input} value={csupp} onChangeText={setCsupp} keyboardType="decimal-pad" />
      <Text>Fériés récupérables : {holiday === "" ? `automatique (${selected.automatic_holidays})` : "manuel"}</Text><TextInput testID="annual-holiday" style={styles.input} value={holiday} onChangeText={setHoliday} placeholder={String(selected.automatic_holidays)} keyboardType="decimal-pad" /><Pressable testID="annual-auto" style={styles.button} onPress={() => setHoliday("")}><Text>Rétablir le mode automatique</Text></Pressable>
      <View style={styles.row}><Pressable testID="annual-save" disabled={busy} style={styles.button} onPress={() => void save(!!selected.year_active)}><Text>Enregistrer</Text></Pressable>{!selected.year_active && <Pressable testID="annual-activate" disabled={busy} style={styles.button} onPress={() => void save(true)}><Text>Activer l’année</Text></Pressable>}</View>
    </View>}
  </View>;
}
const styles = StyleSheet.create({ box: { gap: spacing.md }, title: { fontSize: 18, color: colors.textPrimary }, row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, member: { minHeight: 44, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm }, input: { minHeight: 44, minWidth: 100, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm, paddingHorizontal: spacing.md, color: colors.textPrimary }, button: { minHeight: 44, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surfaceActive, alignSelf: "flex-start", justifyContent: "center" }, error: { color: colors.danger } });
