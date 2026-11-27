import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { AnnualEntitlement, listAdminYears, listAnnualEntitlements, saveAnnualEntitlement } from "../storage/annualEntitlementRepository";
import { colors, fonts, shape, spacing } from "../theme/colors";
import { LoadingSkeleton } from "./LoadingScreen";

type Props = { demo: boolean; query: string };
type Catalog = Awaited<ReturnType<typeof listAdminYears>>;
const parse = (value: string) => Number(value.trim().replace(",", "."));

function EntitlementRow({ row, year, wide, onSaved }: { row: AnnualEntitlement; year: string; wide: boolean; onSaved: (message: string) => Promise<void> }) {
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
  return <View testID={`annual-member-${row.user_id}`} style={[styles.member, wide && styles.memberWide]}>
    <View testID={`annual-identity-${row.user_id}`} style={styles.identity}><Text style={styles.memberName}>{row.display_name}</Text>
    <Text style={styles.memberMeta}>{row.plan_id ? row.year_active ? "Active" : "Brouillon" : "À créer"}{row.plan_id ? ` · Pris : ${row.taken}` : ""}</Text>{row.plan_id && row.remaining !== null && <Text testID={`annual-remaining-${row.user_id}`} style={[styles.memberMeta, Number(row.remaining) < 0 ? styles.negative : styles.positive]}>Restant : {row.remaining}</Text>}</View>
    {error ? <Text testID={`annual-row-error-${row.user_id}`} style={styles.error}>{error}</Text> : null}
    <View testID={`annual-fields-${row.user_id}`} style={[styles.fields, wide && styles.fieldsWide]}>
      <View style={[styles.field, wide && styles.fieldWide]}><Text style={styles.fieldLabel}>Solde initial</Text><TextInput testID={`annual-initial-${row.user_id}`} accessibilityLabel={`Solde initial de ${row.display_name}`} style={[styles.input, wide && styles.inputWide]} value={initial} onChangeText={setInitial} keyboardType="decimal-pad" /></View>
      <View style={[styles.field, wide && styles.fieldWide]}><Text style={styles.fieldLabel}>{wide ? "Reportés" : `Reportés${row.plan_id ? "" : " (proposition)"}`}</Text><TextInput testID={`annual-carried-${row.user_id}`} accessibilityLabel={`Reportés de ${row.display_name}`} style={[styles.input, wide && styles.inputWide]} value={carried} onChangeText={setCarried} keyboardType="decimal-pad" /></View>
      <View style={[styles.field, wide && styles.fieldWide]}><Text style={styles.fieldLabel}>CSupp</Text><TextInput testID={`annual-csupp-${row.user_id}`} accessibilityLabel={`CSupp de ${row.display_name}`} style={[styles.input, wide && styles.inputWide]} value={csupp} onChangeText={setCsupp} keyboardType="decimal-pad" /></View>
      <View style={[styles.field, wide && styles.fieldWide]}><Text style={styles.fieldLabel}>Fériés {holiday === "" ? `auto (${row.automatic_holidays})` : "manuel"}</Text><TextInput testID={`annual-holiday-${row.user_id}`} accessibilityLabel={`Fériés de ${row.display_name}`} style={[styles.input, wide && styles.inputWide]} value={holiday} onChangeText={setHoliday} placeholder={String(row.automatic_holidays)} keyboardType="decimal-pad" /></View>
    </View>
    <View testID={`annual-actions-${row.user_id}`} style={[styles.row, wide && styles.rowWide]}><Pressable testID={`annual-auto-${row.user_id}`} style={[styles.button, wide && styles.buttonWide]} onPress={() => setHoliday("")}><Text style={styles.buttonText}>{wide ? "Auto" : "Mode automatique"}</Text></Pressable><Pressable testID={`annual-save-${row.user_id}`} disabled={busy} style={[styles.button, styles.primaryButton, wide && styles.buttonWide, busy && styles.disabled]} onPress={() => void save(!!row.year_active)}><Text style={styles.primaryButtonText}>Enregistrer</Text></Pressable>{!row.year_active ? <Pressable testID={`annual-activate-${row.user_id}`} disabled={busy} style={[styles.button, wide && styles.buttonWide]} onPress={() => void save(true)}><Text style={styles.buttonText}>{wide ? "Activer" : "Activer l’année"}</Text></Pressable> : wide ? <View pointerEvents="none" style={[styles.button, styles.buttonWide, styles.reservedAction]} /> : null}</View>
  </View>;
}

export function AnnualEntitlements({ demo, query }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 1280;
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
  const normalizedQuery = query.trim().toLowerCase();
  const visibleRows = rows?.filter(row => `${row.display_name} ${row.email}`.toLowerCase().includes(normalizedQuery));
  if (demo) return <Text style={styles.note}>La gestion des droits est disponible en mode connecté.</Text>;
  return <View testID="annual-entitlements" style={styles.box}>
    <View style={styles.heading}><Text style={styles.title}>Droits annuels</Text><Pressable testID="annual-create-button" accessibilityRole="button" style={styles.button} onPress={() => setCreating(current => !current)}><Text style={styles.buttonText}>+ Créer une année</Text></Pressable></View>
    {creating && <View style={styles.row}><TextInput testID="annual-year" accessibilityLabel="Nouvelle année" value={newYear} onChangeText={setNewYear} keyboardType="number-pad" maxLength={4} placeholder="Année" placeholderTextColor={colors.textSecondary} style={styles.input} /><Pressable testID="annual-load" style={styles.button} onPress={create}><Text style={styles.buttonText}>Créer</Text></Pressable></View>}
    {error ? <View testID="annual-error" style={styles.errorBox}><Text style={styles.error}>{error}</Text>{retryTarget && <Pressable testID="annual-retry" onPress={() => { if (retryTarget === "catalog") void loadCatalog(); else void loadRows(); }} style={styles.button}><Text style={styles.buttonText}>Réessayer</Text></Pressable>}</View> : null}
    {notice ? <Text testID="annual-notice" style={styles.notice}>{notice}</Text> : null}
    {catalog === null && !error ? <LoadingSkeleton /> : catalog && <View testID="annual-year-menu" style={styles.row}>{catalog.filter(item => item.has_active).map(item => <Pressable key={item.year} testID={`annual-year-${item.year}`} accessibilityRole="button" accessibilityState={{ selected: item.year === year }} onPress={() => { selectYear(item.year); setNotice(""); }} style={[styles.button, styles.chip, item.year === year && styles.chipSelected]}><Text style={[styles.buttonText, item.year === year && styles.chipTextSelected]}>{item.year}{item.year === year ? " ✓" : ""}</Text></Pressable>)}</View>}
    {catalog && !year && <Text testID="annual-empty" style={styles.empty}>Aucune année active. Créez une année pour commencer.</Text>}
    {year ? <><Text style={styles.title}>Année {year}</Text>{rows === null && !error ? <LoadingSkeleton /> : rows?.length === 0 ? <Text testID="annual-members-empty" style={styles.empty}>Aucun membre.</Text> : visibleRows?.length ? visibleRows.map(row => <EntitlementRow key={`${year}-${row.user_id}`} row={row} year={year} wide={wide} onSaved={async message => { if (selectedYear.current === year) { setNotice(message); await loadRows(true); } await loadCatalog(); }} />) : <Text testID="annual-members-empty" style={styles.empty}>Aucun membre trouvé.</Text>}</> : null}
  </View>;
}
const styles = StyleSheet.create({
  box: { gap: spacing.md, paddingBottom: spacing.lg, marginBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontFamily: fonts.base, fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  heading: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  rowWide: { flexWrap: "nowrap", flexShrink: 0, gap: spacing.xs },
  buttonWide: { minHeight: 40, paddingHorizontal: 8, paddingVertical: 8 },
  reservedAction: { width: 67, opacity: 0 },
  fields: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.lg, columnGap: 20 },
  fieldsWide: { flex: 1, minWidth: 0, flexWrap: "nowrap", columnGap: spacing.sm },
  field: { flexGrow: 1, minWidth: 120, gap: 8 },
  fieldWide: { flex: 1, minWidth: 0 },
  fieldLabel: { fontFamily: fonts.base, fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  member: { gap: spacing.md, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: shape.row, backgroundColor: colors.panel },
  memberWide: { flexDirection: "row", alignItems: "center", flexWrap: "nowrap", gap: spacing.md },
  identity: { flexShrink: 1, flexBasis: 280, minWidth: 180, maxWidth: 300, gap: 4 },
  memberName: { fontFamily: fonts.base, fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  memberMeta: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary },
  negative: { color: colors.danger },
  positive: { color: colors.primary },
  input: { fontFamily: fonts.base, fontSize: 16, minHeight: 46, minWidth: 100, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, backgroundColor: colors.panel, color: colors.textPrimary },
  inputWide: { minWidth: 0, paddingHorizontal: 8 },
  button: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, alignSelf: "flex-start", justifyContent: "center" },
  buttonText: { fontFamily: fonts.base, fontSize: 14, color: colors.textPrimary },
  primaryButton: { backgroundColor: colors.cta, borderColor: colors.cta },
  primaryButtonText: { fontFamily: fonts.base, fontSize: 14, fontWeight: "600", color: colors.textOnBrand },
  disabled: { opacity: 0.5 },
  chip: { borderRadius: shape.pill },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTextSelected: { color: colors.textOnBrand, fontWeight: "600" },
  note: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary, backgroundColor: colors.panelSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: shape.row, padding: 14, overflow: "hidden" },
  notice: { fontFamily: fonts.base, fontSize: 14, fontWeight: "600", color: colors.positive, backgroundColor: colors.positiveSoft, borderRadius: shape.row, paddingHorizontal: 16, paddingVertical: 12, overflow: "hidden" },
  empty: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingVertical: 20, borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderDashed, borderRadius: shape.row },
  errorBox: { gap: spacing.sm, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: "#F5C2C2", borderRadius: shape.row, padding: 14 },
  error: { fontFamily: fonts.base, fontSize: 14, fontWeight: "600", color: colors.danger },
});
