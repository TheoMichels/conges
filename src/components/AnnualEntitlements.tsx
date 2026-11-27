import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { AnnualEntitlement, listAdminYears, listAnnualEntitlements, saveAnnualEntitlement } from "../storage/annualEntitlementRepository";
import { colors, focusRing, fonts, shape, spacing, tabular } from "../theme/colors";
import { formatDayNumber } from "../utils/format";
import { Avatar } from "./Avatar";
import { LoadingSkeleton } from "./LoadingScreen";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Icon } from "./ui/Icon";
import { Segmented } from "./ui/Segmented";

type Props = { demo: boolean; query: string };
type Catalog = Awaited<ReturnType<typeof listAdminYears>>;
const parse = (value: string) => Number(value.trim().replace(",", "."));
const show = (value: number | null | undefined) => formatDayNumber(Number(value ?? 0));

function AmountInput({ testID, label, value, onChange, placeholder, wide, muted }: { testID: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; wide: boolean; muted?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      testID={testID}
      accessibilityLabel={label}
      style={[styles.input, wide && styles.inputWide, muted && styles.inputMuted, focused && styles.inputFocused, focused && focusRing]}
      value={value}
      onChangeText={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      keyboardType="decimal-pad"
    />
  );
}

function EntitlementRow({ row, year, wide, first, onSaved }: { row: AnnualEntitlement; year: string; wide: boolean; first: boolean; onSaved: (message: string) => Promise<void> }) {
  const initialValues = {
    initial: show(row.initial_leave),
    carried: show(row.carried_over ?? row.suggested_carry),
    csupp: show(row.csupp),
    holiday: row.holiday_override === null ? "" : show(row.holiday_override),
  };
  const [initial, setInitial] = useState(initialValues.initial);
  const [carried, setCarried] = useState(initialValues.carried);
  const [csupp, setCsupp] = useState(initialValues.csupp);
  const [holiday, setHoliday] = useState(initialValues.holiday);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = initial !== initialValues.initial || carried !== initialValues.carried || csupp !== initialValues.csupp || holiday !== initialValues.holiday;
  const save = async (activate: boolean) => {
    if ([initial, carried, csupp].some(value => !/^-?\d+(?:[.,]\d{1,2})?$/.test(value.trim())) || (holiday !== "" && !/^\d+(?:[.,]\d{1,2})?$/.test(holiday.trim()))) { setError("Saisissez des montants valides avec au plus deux décimales."); return; }
    try {
      setBusy(true); setError("");
      await saveAnnualEntitlement(row.user_id, year, parse(initial), parse(carried), parse(csupp), holiday === "" ? null : parse(holiday), activate);
      await onSaved(activate && !row.year_active ? "Année activée et droits enregistrés." : "Droits enregistrés.");
    } catch (e) { setError(e instanceof Error ? e.message : "Impossible d’enregistrer les droits."); }
    finally { setBusy(false); }
  };
  const status = row.plan_id ? row.year_active ? <Badge tone="ok" dot label="Active" /> : <Badge tone="warn" dot label="Brouillon" /> : <Badge tone="neutral" dot label="À créer" />;
  const negative = row.remaining !== null && Number(row.remaining) < 0;
  const field = (key: string, label: string, input: React.ReactNode) => (
    <View style={[styles.field, wide && styles.fieldWide]}>
      {!wide && <Text style={styles.fieldLabel}>{label}</Text>}
      {input}
    </View>
  );
  return (
    <View testID={`annual-member-${row.user_id}`} style={[styles.member, wide && styles.memberWide, !first && styles.memberBorder, dirty && styles.memberDirty]}>
      <View testID={`annual-identity-${row.user_id}`} style={[styles.identity, wide && styles.identityWide]}>
        <Avatar label={row.display_name} size={32} round />
        <View style={styles.identityText}>
          <View style={styles.nameLine}>
            <Text style={styles.memberName} numberOfLines={1}>{row.display_name}</Text>
            {status}
          </View>
          <View style={styles.metaLine}>
            {row.plan_id ? <Text style={styles.memberMeta}>Pris : {show(row.taken)}</Text> : <Text style={styles.memberMeta}>Aucun droit pour {year}</Text>}
            {row.plan_id && row.remaining !== null && <Text style={styles.memberMeta}>·</Text>}
            {row.plan_id && row.remaining !== null && <Text testID={`annual-remaining-${row.user_id}`} style={[styles.memberMeta, styles.remaining, negative ? styles.negative : styles.positive]}>Restant : {show(row.remaining)}</Text>}
          </View>
        </View>
      </View>
      {error ? <Text testID={`annual-row-error-${row.user_id}`} style={[styles.rowError, wide && styles.rowErrorWide]}>{error}</Text> : null}
      <View testID={`annual-fields-${row.user_id}`} style={[styles.fields, wide && styles.fieldsWide]}>
        {field("initial", "Solde initial", <AmountInput wide={wide} testID={`annual-initial-${row.user_id}`} label={`Solde initial de ${row.display_name}`} value={initial} onChange={setInitial} />)}
        {field("carried", `Reportés${row.plan_id ? "" : " (proposition)"}`, <AmountInput wide={wide} testID={`annual-carried-${row.user_id}`} label={`Reportés de ${row.display_name}`} value={carried} onChange={setCarried} />)}
        {field("csupp", "CSupp", <AmountInput wide={wide} testID={`annual-csupp-${row.user_id}`} label={`CSupp de ${row.display_name}`} value={csupp} onChange={setCsupp} />)}
        {field("holiday", `Fériés ${holiday === "" ? `auto (${show(row.automatic_holidays)})` : "manuel"}`, (
          <View style={styles.holidayWrap}>
            <View style={styles.holidayInput}>
              <AmountInput wide={wide} muted={holiday === ""} testID={`annual-holiday-${row.user_id}`} label={`Fériés de ${row.display_name}`} value={holiday} onChange={setHoliday} placeholder={show(row.automatic_holidays)} />
            </View>
            <Button testID={`annual-auto-${row.user_id}`} size="sm" variant="ghost" icon="reset" accessibilityLabel={`Fériés automatiques pour ${row.display_name}`} onPress={() => setHoliday("")} disabled={holiday === ""} />
          </View>
        ))}
      </View>
      <View testID={`annual-actions-${row.user_id}`} style={[styles.actions, wide && styles.actionsWide]}>
        <Button testID={`annual-save-${row.user_id}`} size={wide ? "sm" : "md"} variant={dirty ? "primary" : "secondary"} disabled={busy} label="Enregistrer" onPress={() => void save(!!row.year_active)} style={wide && styles.saveWide} />
        {!row.year_active && <Button testID={`annual-activate-${row.user_id}`} size={wide ? "sm" : "md"} disabled={busy} label="Activer" onPress={() => void save(true)} />}
      </View>
    </View>
  );
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
  if (demo) return <View style={styles.note}><Icon name="info" size={16} color={colors.textSecondary} /><Text style={styles.noteText}>La gestion des droits est disponible en mode connecté.</Text></View>;
  const activeYears = catalog?.filter(item => item.has_active) ?? [];
  const stats = rows ? {
    members: rows.length,
    active: rows.filter(row => row.year_active).length,
    pending: rows.filter(row => !row.year_active).length,
    negative: rows.filter(row => row.remaining !== null && Number(row.remaining) < 0).length,
  } : null;
  return <View testID="annual-entitlements" style={styles.box}>
    <View style={styles.toolbar}>
      {catalog === null && !error ? <View style={styles.catalogLoading}><LoadingSkeleton /></View> : catalog && activeYears.length > 0 && (
        <View testID="annual-year-menu">
          <Segmented scrollable value={year || null} onChange={next => { selectYear(next); setNotice(""); }} options={activeYears.map(item => ({ key: item.year, label: item.year, testID: `annual-year-${item.year}` }))} />
        </View>
      )}
      {catalog && year && !activeYears.some(item => item.year === year) ? <Badge tone="warn" dot label={`${year} · brouillon`} /> : null}
      <Button testID="annual-create-button" icon="plus" label="Nouvelle année" onPress={() => setCreating(current => !current)} />
    </View>
    {creating && (
      <Card style={styles.createCard}>
        <Text style={styles.createLabel}>Nouvelle année</Text>
        <View style={styles.createRow}>
          <TextInput testID="annual-year" accessibilityLabel="Nouvelle année" value={newYear} onChangeText={setNewYear} keyboardType="number-pad" maxLength={4} placeholder="AAAA" placeholderTextColor={colors.textFaint} style={[styles.input, styles.yearInput]} />
          <Button testID="annual-load" variant="primary" label="Créer" onPress={create} />
          <Button label="Annuler" variant="ghost" onPress={() => setCreating(false)} />
        </View>
      </Card>
    )}
    {error ? <View testID="annual-error" style={[styles.banner, styles.bannerError]}><Icon name="alert" size={16} color={colors.danger} /><Text style={[styles.bannerText, { color: colors.danger }]}>{error}</Text>{retryTarget && <Button testID="annual-retry" size="sm" label="Réessayer" onPress={() => { if (retryTarget === "catalog") void loadCatalog(); else void loadRows(); }} />}</View> : null}
    {notice ? <View style={[styles.banner, styles.bannerOk]}><Icon name="check" size={16} color={colors.positive} /><Text testID="annual-notice" style={[styles.bannerText, { color: colors.positive }]}>{notice}</Text></View> : null}
    {catalog && !year && <Text testID="annual-empty" style={styles.empty}>Aucune année active. Créez une année pour commencer.</Text>}
    {year && stats && wide ? (
      <View style={styles.stats}>
        <Card style={styles.stat}><Text style={styles.statLabel}>Membres</Text><Text style={styles.statValue}>{stats.members}</Text></Card>
        <Card style={styles.stat}><Text style={styles.statLabel}>Années actives</Text><Text style={styles.statValue}>{stats.active}</Text></Card>
        <Card style={styles.stat}><Text style={styles.statLabel}>Brouillons / à créer</Text><Text style={[styles.statValue, stats.pending > 0 && { color: colors.warning }]}>{stats.pending}</Text></Card>
        <Card style={styles.stat}><Text style={styles.statLabel}>Soldes négatifs</Text><Text style={[styles.statValue, stats.negative > 0 && { color: colors.danger }]}>{stats.negative}</Text></Card>
      </View>
    ) : null}
    {year ? (
      <Card style={styles.table}>
        <View style={styles.tableTitle}><Text style={styles.title}>Année {year}</Text>{visibleRows ? <Text style={styles.tableHint}>{visibleRows.length} membre{visibleRows.length > 1 ? "s" : ""}</Text> : null}</View>
        {wide && rows?.length ? (
          <View style={styles.headRow}>
            <Text style={[styles.th, styles.thIdentity]}>Membre</Text>
            <View style={styles.thFields}>
              {["Solde initial", "Reportés", "CSupp", "Fériés"].map(label => <Text key={label} style={[styles.th, styles.thField]}>{label}</Text>)}
            </View>
            <View style={styles.thActions} />
          </View>
        ) : null}
        {rows === null && !error ? <View style={styles.tablePad}><LoadingSkeleton /></View> : rows?.length === 0 ? <Text testID="annual-members-empty" style={[styles.empty, styles.tableEmpty]}>Aucun membre.</Text> : visibleRows?.length ? visibleRows.map((row, index) => <EntitlementRow key={`${year}-${row.user_id}`} row={row} year={year} wide={wide} first={index === 0} onSaved={async message => { if (selectedYear.current === year) { setNotice(message); await loadRows(true); } await loadCatalog(); }} />) : <Text testID="annual-members-empty" style={[styles.empty, styles.tableEmpty]}>Aucun membre trouvé.</Text>}
      </Card>
    ) : null}
  </View>;
}

const styles = StyleSheet.create({
  box: { gap: 14 },
  toolbar: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 },
  catalogLoading: { flex: 1, minWidth: 200 },
  createCard: { padding: 16, gap: 8 },
  createLabel: { fontFamily: fonts.base, fontSize: 12.5, fontWeight: "600", color: colors.textSecondary },
  createRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  yearInput: { width: 120, flexGrow: 0 },
  banner: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: shape.row, borderWidth: 1 },
  bannerError: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder },
  bannerOk: { backgroundColor: colors.positiveSoft, borderColor: colors.positiveBorder },
  bannerText: { flex: 1, minWidth: 160, fontFamily: fonts.base, fontSize: 13.5, fontWeight: "600" },
  stats: { flexDirection: "row", gap: 14 },
  stat: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  statLabel: { fontFamily: fonts.base, fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  statValue: { fontFamily: fonts.base, fontSize: 22, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.4, ...tabular },
  table: { overflow: "hidden" },
  tableTitle: { flexDirection: "row", alignItems: "baseline", gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  tableHint: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary },
  tablePad: { padding: 16 },
  title: { fontFamily: fonts.base, fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  headRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: colors.canvas, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  th: { fontFamily: fonts.base, fontSize: 11.5, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: colors.textSecondary },
  thIdentity: { width: 300 },
  thFields: { flex: 1, flexDirection: "row", gap: spacing.sm },
  thField: { flex: 1 },
  thActions: { width: 200 },
  member: { gap: spacing.md, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.panel },
  memberBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  memberWide: { flexDirection: "row", alignItems: "center", flexWrap: "nowrap", paddingVertical: 10 },
  memberDirty: { backgroundColor: "#FFFBF8", borderLeftWidth: 3, borderLeftColor: colors.cta, paddingLeft: 13 },
  identity: { flexDirection: "row", alignItems: "center", gap: 10 },
  identityWide: { width: 300, flexShrink: 0 },
  identityText: { flex: 1, minWidth: 0, gap: 2 },
  nameLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  metaLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  memberName: { flexShrink: 1, fontFamily: fonts.base, fontSize: 14.5, fontWeight: "600", color: colors.textPrimary },
  memberMeta: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary, ...tabular },
  remaining: { fontWeight: "700" },
  negative: { color: colors.danger },
  positive: { color: colors.primary },
  rowError: { fontFamily: fonts.base, fontSize: 13, fontWeight: "600", color: colors.danger, backgroundColor: colors.dangerSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden" },
  rowErrorWide: { position: "absolute", left: 16, bottom: 2, fontSize: 11.5, paddingVertical: 1, zIndex: 2 },
  fields: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md, columnGap: spacing.md },
  fieldsWide: { flex: 1, minWidth: 0, flexWrap: "nowrap", columnGap: spacing.sm },
  field: { flexGrow: 1, flexBasis: "40%", minWidth: 120, gap: 6 },
  fieldWide: { flex: 1, flexBasis: 0, minWidth: 0 },
  fieldLabel: { fontFamily: fonts.base, fontSize: 12.5, fontWeight: "600", color: colors.textSecondary },
  holidayWrap: { flexDirection: "row", alignItems: "center", gap: 2 },
  holidayInput: { flex: 1, minWidth: 0 },
  input: { fontFamily: fonts.base, fontSize: 15, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: shape.control, paddingHorizontal: 12, backgroundColor: colors.panel, color: colors.textPrimary, ...tabular },
  inputWide: { minHeight: 38, fontSize: 14, fontWeight: "600", textAlign: "right", paddingHorizontal: 10, minWidth: 0 },
  inputMuted: { backgroundColor: colors.canvas, borderStyle: "dashed" },
  inputFocused: { borderColor: colors.primary },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  actionsWide: { width: 200, flexWrap: "nowrap", flexShrink: 0, gap: 6 },
  saveWide: { width: 108 },
  note: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: shape.row, padding: 14 },
  noteText: { flex: 1, fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary },
  empty: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingVertical: 20, borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderDashed, borderRadius: shape.row },
  tableEmpty: { marginHorizontal: 16, marginBottom: 16 },
});
