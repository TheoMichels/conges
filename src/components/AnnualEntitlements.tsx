import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AnnualEntitlement, listAdminYears, listAnnualEntitlements, saveAnnualEntitlement } from "../storage/annualEntitlementRepository";
import { colors, radius, spacing } from "../theme/colors";
import { LoadingSkeleton } from "./LoadingScreen";

type Props = { demo: boolean };
type Catalog = Awaited<ReturnType<typeof listAdminYears>>;
const parse = (value: string) => Number(value.trim().replace(",", "."));

function EntitlementRow({ row, year, onSaved }: { row: AnnualEntitlement; year: string; onSaved: (message: string) => Promise<void> }) {
  const [initial, setInitial] = useState(String(row.initial_leave ?? 0));
  const [carried, setCarried] = useState(String(row.carried_over ?? row.suggested_carry));
  const [csupp, setCsupp] = useState(String(row.csupp ?? 0));
  const [holiday, setHoliday] = useState(row.holiday_override === null ? "" : String(row.holiday_override));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (activate: boolean) => {
    if ([initial, carried, csupp].some(value => !/^-?\d+(?:[.,]\d{1,2})?$/.test(value.trim())) || (holiday !== "" && !/^\d+(?:[.,]\d{1,2})?$/.test(holiday.trim()))) { setError("Saisissez des montants valides avec au plus deux décimales."); return; }
    try {
      setBusy(true); setError("");
      await saveAnnualEntitlement(row.user_id, year, parse(initial), parse(carried), parse(csupp), holiday === "" ? null : parse(holiday), activate);
      await onSaved(activate && !row.year_active ? "Année activée et droits enregistrés." : "Droits enregistrés.");
    } catch (e) { setError(e instanceof Error ? e.message : "Impossible d’enregistrer les droits."); }
    finally { setBusy(false); }
  };
  return <View testID={`annual-member-${row.user_id}`} style={styles.member}>
    <Text>{row.display_name} · {row.email}</Text>
    <Text>{row.plan_id ? row.year_active ? "Active" : "Brouillon" : "À créer"}{row.plan_id ? ` · Pris : ${row.taken} · Restant : ${row.remaining}` : ""}</Text>
    {error ? <Text testID={`annual-row-error-${row.user_id}`} style={styles.error}>{error}</Text> : null}
    <View style={styles.fields}>
      <View style={styles.field}><Text>Solde initial</Text><TextInput testID={`annual-initial-${row.user_id}`} accessibilityLabel={`Solde initial de ${row.display_name}`} style={styles.input} value={initial} onChangeText={setInitial} keyboardType="decimal-pad" /></View>
      <View style={styles.field}><Text>Reportés{row.plan_id ? "" : " (proposition)"}</Text><TextInput testID={`annual-carried-${row.user_id}`} accessibilityLabel={`Reportés de ${row.display_name}`} style={styles.input} value={carried} onChangeText={setCarried} keyboardType="decimal-pad" /></View>
      <View style={styles.field}><Text>CSupp</Text><TextInput testID={`annual-csupp-${row.user_id}`} accessibilityLabel={`CSupp de ${row.display_name}`} style={styles.input} value={csupp} onChangeText={setCsupp} keyboardType="decimal-pad" /></View>
      <View style={styles.field}><Text>Fériés {holiday === "" ? `auto (${row.automatic_holidays})` : "manuel"}</Text><TextInput testID={`annual-holiday-${row.user_id}`} accessibilityLabel={`Fériés de ${row.display_name}`} style={styles.input} value={holiday} onChangeText={setHoliday} placeholder={String(row.automatic_holidays)} keyboardType="decimal-pad" /></View>
    </View>
    <View style={styles.row}><Pressable testID={`annual-auto-${row.user_id}`} style={styles.button} onPress={() => setHoliday("")}><Text>Mode automatique</Text></Pressable><Pressable testID={`annual-save-${row.user_id}`} disabled={busy} style={styles.button} onPress={() => void save(!!row.year_active)}><Text>Enregistrer</Text></Pressable>{!row.year_active && <Pressable testID={`annual-activate-${row.user_id}`} disabled={busy} style={styles.button} onPress={() => void save(true)}><Text>Activer l’année</Text></Pressable>}</View>
  </View>;
}

export function AnnualEntitlements({ demo }: Props) {
  const requestId = useRef(0);
  const selectedYear = useRef("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [year, setYear] = useState("");
  const [newYear, setNewYear] = useState("");
  const [creating, setCreating] = useState(false);
  const [rows, setRows] = useState<AnnualEntitlement[] | null>(null);
  const [error, setError] = useState("");
  const [retryTarget, setRetryTarget] = useState<"catalog" | "rows" | null>(null);
  const [notice, setNotice] = useState("");
  const loadCatalog = useCallback(async () => {
    try { setError(""); const result = await listAdminYears(); setCatalog(result); if (!selectedYear.current) { const next = result.find(item => item.has_active)?.year || ""; selectedYear.current = next; setYear(next); } }
    catch (e) { setRetryTarget("catalog"); setError(e instanceof Error ? e.message : "Impossible de charger les années."); }
  }, []);
  const loadRows = useCallback(async (preserveRows = false) => {
    if (!year || selectedYear.current !== year) return;
    const request = ++requestId.current;
    try { setError(""); if (!preserveRows) setRows(null); const result = await listAnnualEntitlements(year); if (request === requestId.current && selectedYear.current === year) setRows(result); }
    catch (e) { if (request === requestId.current && selectedYear.current === year) { setRetryTarget("rows"); setError(e instanceof Error ? e.message : "Impossible de charger les droits."); } }
  }, [year]);
  useEffect(() => { if (!demo) void loadCatalog(); }, [demo, loadCatalog]);
  useEffect(() => { const tracker = requestId; if (!demo && year) void loadRows(); return () => { tracker.current++; }; }, [demo, year, loadRows]);
  const selectYear = (next: string) => {
    if (selectedYear.current !== next) { requestId.current++; selectedYear.current = next; setRows(null); setYear(next); }
  };
  const create = () => {
    if (!/^\d{4}$/.test(newYear) || Number(newYear) < 1900 || Number(newYear) > 2100) { setRetryTarget(null); setError("Saisissez une année valide entre 1900 et 2100."); return; }
    if (catalog?.some(item => item.year === newYear && item.has_active)) { setRetryTarget(null); setError("Cette année existe déjà."); return; }
    setError(""); setNotice(catalog?.some(item => item.year === newYear) ? "Brouillon existant repris." : "Nouvelle année : enregistrez les droits d’un membre pour créer un brouillon."); selectYear(newYear); setCreating(false); setNewYear("");
  };
  if (demo) return <Text>La gestion des droits est disponible en mode connecté.</Text>;
  return <View testID="annual-entitlements" style={styles.box}>
    <View style={styles.heading}><Text style={styles.title}>Droits annuels</Text><Pressable testID="annual-create-button" accessibilityRole="button" style={styles.button} onPress={() => setCreating(current => !current)}><Text>+ Créer une année</Text></Pressable></View>
    {creating && <View style={styles.row}><TextInput testID="annual-year" accessibilityLabel="Nouvelle année" value={newYear} onChangeText={setNewYear} keyboardType="number-pad" maxLength={4} placeholder="Année" style={styles.input} /><Pressable testID="annual-load" style={styles.button} onPress={create}><Text>Créer</Text></Pressable></View>}
    {error ? <View testID="annual-error"><Text style={styles.error}>{error}</Text>{retryTarget && <Pressable testID="annual-retry" onPress={() => { if (retryTarget === "catalog") void loadCatalog(); else void loadRows(); }} style={styles.button}><Text>Réessayer</Text></Pressable>}</View> : null}
    {notice ? <Text testID="annual-notice">{notice}</Text> : null}
    {catalog === null && !error ? <LoadingSkeleton /> : catalog && <View testID="annual-year-menu" style={styles.row}>{catalog.filter(item => item.has_active).map(item => <Pressable key={item.year} testID={`annual-year-${item.year}`} accessibilityRole="button" accessibilityState={{ selected: item.year === year }} onPress={() => { selectYear(item.year); setNotice(""); }} style={styles.button}><Text>{item.year}{item.year === year ? " ✓" : ""}</Text></Pressable>)}</View>}
    {catalog && !year && <Text testID="annual-empty">Aucune année active. Créez une année pour commencer.</Text>}
    {year ? <><Text style={styles.title}>Année {year}</Text>{rows === null && !error ? <LoadingSkeleton /> : rows?.length === 0 ? <Text testID="annual-members-empty">Aucun membre.</Text> : rows?.map(row => <EntitlementRow key={`${year}-${row.user_id}`} row={row} year={year} onSaved={async message => { if (selectedYear.current === year) { setNotice(message); await loadRows(true); } await loadCatalog(); }} />)}</> : null}
  </View>;
}
const styles = StyleSheet.create({ box: { gap: spacing.md }, title: { fontSize: 18, color: colors.textPrimary }, heading: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: spacing.md }, row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, fields: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, field: { flexGrow: 1, minWidth: 120, gap: spacing.xs }, member: { gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm }, input: { minHeight: 44, minWidth: 100, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm, paddingHorizontal: spacing.md, color: colors.textPrimary }, button: { minHeight: 44, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surfaceActive, alignSelf: "flex-start", justifyContent: "center" }, error: { color: colors.danger } });
