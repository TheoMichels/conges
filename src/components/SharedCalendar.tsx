import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { CalendarEntry, CalendarTeam, loadSharedCalendar } from "../storage/sharedCalendarRepository";
import { colors, fonts, shape, tabular, webOnly } from "../theme/colors";
import { toISODate, workingDaysCount } from "../utils/leaveDays";
import { publicHolidayMap } from "../utils/leaveStats";
import { initialsOf } from "./Avatar";
import { Button } from "./ui/Button";
import { Card, CardHeader } from "./ui/Card";
import { Icon } from "./ui/Icon";
import { Segmented } from "./ui/Segmented";

type Palette = { color: string; background: string };
type DayEntry = { key: string; entryId: string; memberKey: string; name: string; part: "Matin" | "Après-midi" | "Journée"; color: string; background: string };
type CalendarDay = { key: string; number: number; weekday: number; entries: DayEntry[] };

const leaveColors: Palette[] = [
 { color: "#1F4E79", background: "#EAF1F8" }, { color: "#A34E16", background: "#FEF0E7" },
 { color: "#12613A", background: "#E9F9EF" }, { color: "#7041A6", background: "#F2EAFB" },
 { color: "#A32942", background: "#FDECEC" }, { color: "#286A70", background: "#E5F4F3" },
 { color: "#5D4B00", background: "#FFF6D6" }, { color: "#334E9A", background: "#E9EDFC" },
 { color: "#8A3D73", background: "#F8E9F3" }, { color: "#356B2D", background: "#EDF7E8" },
 { color: "#9A4E00", background: "#FFF0DC" }, { color: "#24608A", background: "#E7F3FA" },
];
const WEEKDAYS = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];
const MAX_LANES = 3;
const HATCH = webOnly({ backgroundImage: "repeating-linear-gradient(135deg, #FAFBFC 0 7px, #F3F4F7 7px 14px)" });

function colorsForMembers(entries: CalendarEntry[]) {
 const names = new Map(entries.map(entry => [entry.member_key, entry.display_name]));
 const memberKeys = [...names.keys()].sort();
 const assigned = new Map<string, Palette>();
 if (memberKeys.length > leaveColors.length) {
  memberKeys.forEach((memberKey, index) => {
   const hue = index * 360 / memberKeys.length;
   assigned.set(memberKey, { color: `hsl(${hue}, 65%, 30%)`, background: `hsl(${hue}, 65%, 94%)` });
  });
  return assigned;
 }
 const used = new Set<number>();
 memberKeys.forEach((memberKey, index) => {
  const name = names.get(memberKey) ?? "";
  const preferred = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6;
  let colorIndex = 0;
  while (colorIndex < leaveColors.length && used.has((preferred + colorIndex) % leaveColors.length)) colorIndex += 1;
  if (colorIndex < leaveColors.length) {
   const paletteIndex = (preferred + colorIndex) % leaveColors.length;
   used.add(paletteIndex);
   assigned.set(memberKey, leaveColors[paletteIndex]);
   return;
  }
  assigned.set(memberKey, leaveColors[index] ?? leaveColors[0]);
 });
 return assigned;
}

function calendarDays(entries: CalendarEntry[], month: Date, memberColors: Map<string, Palette>): CalendarDay[] {
 const days: CalendarDay[] = [];
 for (let number = 1; number <= new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); number += 1) {
  const date = new Date(month.getFullYear(), month.getMonth(), number);
  const key = toISODate(date);
  const dayEntries = entries.flatMap(entry => {
   if (key < entry.start_date || key > entry.end_date || workingDaysCount(key, key) === 0) return [];
   const morningOnly = key === entry.end_date && entry.end_half === "morning";
   const afternoonOnly = key === entry.start_date && entry.start_half === "afternoon";
   const palette = memberColors.get(entry.member_key) ?? leaveColors[0];
   const part: DayEntry["part"] = morningOnly ? "Matin" : afternoonOnly ? "Après-midi" : "Journée";
   return [{ key: `${entry.id}-${key}`, entryId: entry.id, memberKey: entry.member_key, name: entry.display_name, part, ...palette }];
  }).sort((a, b) => a.name.localeCompare(b.name));
  days.push({ key, number, weekday: (date.getDay() + 6) % 7, entries: dayEntries });
 }
 return days;
}

// Découpe le mois en semaines (lundi → dimanche) et attribue à chaque congé une ligne stable
// dans la semaine, pour dessiner des barres continues.
function weeksOf(days: CalendarDay[]) {
 const weeks: (CalendarDay | null)[][] = [];
 let week: (CalendarDay | null)[] = Array.from({ length: days[0]?.weekday ?? 0 }, () => null);
 for (const day of days) {
  week.push(day);
  if (week.length === 7) { weeks.push(week); week = []; }
 }
 if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }
 return weeks.map(cells => {
  const spans = new Map<string, { first: number; last: number }>();
  cells.forEach((day, index) => day?.entries.forEach(entry => {
   const span = spans.get(entry.entryId);
   spans.set(entry.entryId, span ? { first: span.first, last: index } : { first: index, last: index });
  }));
  const ordered = [...spans.entries()].sort((a, b) => a[1].first - b[1].first || a[0].localeCompare(b[0]));
  const laneEnds: number[] = [];
  const lanes = new Map<string, number>();
  for (const [id, span] of ordered) {
   let lane = laneEnds.findIndex(end => end < span.first);
   if (lane < 0) { lane = laneEnds.length; laneEnds.push(span.last); } else laneEnds[lane] = span.last;
   lanes.set(id, lane);
  }
  return { cells, lanes, laneCount: laneEnds.length };
 });
}

// Seules les demi-journées sont étiquetées ; la journée entière est la norme.
function partLabel(entry: DayEntry) {
 return entry.part === "Journée" ? null : entry.part;
}

function LeavePill({ entry, showName, joinLeft, joinRight }: { entry: DayEntry; showName: boolean; joinLeft: boolean; joinRight: boolean }) {
 const part = partLabel(entry);
 return (
  <View testID="calendar-entry" accessibilityLabel={`${entry.name} — ${entry.part}`} style={[styles.pill, { backgroundColor: entry.background }, joinLeft ? styles.pillJoinLeft : { borderLeftWidth: 3, borderLeftColor: entry.color }, joinRight && styles.pillJoinRight]}>
   {showName && <View style={[styles.pillAvatar, { backgroundColor: entry.color }]}><Text style={styles.pillAvatarText}>{initialsOf(entry.name)}</Text></View>}
   {showName && <Text style={[styles.pillName, { color: entry.color }]} numberOfLines={1}>{entry.name}</Text>}
   {part && <Text style={[styles.pillPart, { color: entry.color }]} numberOfLines={1}>{part}</Text>}
  </View>
 );
}

export function SharedCalendar() {
 const { width } = useWindowDimensions();
 const isMobile = width < 768;
 const withSide = width >= 1100;
 const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
 const [team, setTeam] = useState<string | null>(null);
 const [teams, setTeams] = useState<CalendarTeam[]>([]);
 const [entries, setEntries] = useState<CalendarEntry[]>([]);
 const [unplaced, setUnplaced] = useState<string[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [attempt, setAttempt] = useState(0);
 useEffect(() => {
  let cancelled = false; setLoading(true); setError(""); setEntries([]); setUnplaced([]);
  void loadSharedCalendar(toISODate(month), team).then(data => { if (!cancelled) { setTeams(data.teams); setEntries(data.entries); setUnplaced(data.unplaced); } }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Une erreur est survenue."); }).finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
 }, [month, team, attempt]);

 const memberColors = colorsForMembers(entries);
 const days = calendarDays(entries, month, memberColors);
 const weeks = weeksOf(days);
 const holidays = publicHolidayMap(month.getFullYear());
 const today = new Date();
 const todayKey = toISODate(today);
 const isCurrentMonth = today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth();
 const todayEntries = isCurrentMonth ? days.find(day => day.key === todayKey)?.entries ?? [] : [];
 const members = [...new Map(entries.map(entry => [entry.member_key, entry.display_name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
 const shift = (n: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + n, 1));
 const monthLabel = month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

 const keys = (
  <View style={[styles.keys, isMobile && styles.keysMobile]}>
   <View style={styles.keyItem}><View style={[styles.keySwatch, { backgroundColor: colors.primarySoft, borderLeftWidth: 3, borderLeftColor: colors.primary }]} /><Text style={styles.keyText}>Congé</Text></View>
   <View style={styles.keyItem}><Text style={styles.keyTag}>Matin</Text><Text style={styles.keyText}>Demi-journée</Text></View>
   {!isMobile && <View style={styles.keyItem}><View style={[styles.keySwatch, styles.keyWeekend, HATCH]} /><Text style={styles.keyText}>Week-end</Text></View>}
   <View style={styles.keyItem}><View style={styles.keyHoliday} /><Text style={styles.keyText}>Jour férié (Lux.)</Text></View>
  </View>
 );

 const grid = isMobile ? (
  <View testID="calendar-grid" style={styles.agenda}>
   {days.filter(day => day.weekday < 5).map(day => {
    const isToday = day.key === todayKey;
    const holiday = holidays.get(day.key);
    return (
     <View key={day.key} testID={`calendar-day-${day.key}`} style={[styles.agendaDay, day.weekday === 0 && styles.agendaWeekStart]}>
      <View style={styles.agendaDate}>
       <Text style={[styles.agendaWeekday, isToday && styles.todayText]}>{WEEKDAYS[day.weekday]}</Text>
       <Text style={[styles.agendaNumber, isToday && styles.todayText]}>{day.number}</Text>
      </View>
      <View style={styles.agendaEntries}>
       {holiday ? <Text style={styles.holidayLabel}>{holiday}</Text> : null}
       {day.entries.length ? day.entries.map(entry => (
        <View key={entry.key} testID="calendar-entry" accessibilityLabel={`${entry.name} — ${entry.part}`} style={[styles.agendaPill, { backgroundColor: entry.background, borderLeftColor: entry.color }]}>
         <View style={[styles.pillAvatar, { backgroundColor: entry.color }]}><Text style={styles.pillAvatarText}>{initialsOf(entry.name)}</Text></View>
         <Text style={[styles.agendaName, { color: entry.color }]} numberOfLines={1}>{entry.name}</Text>
         <Text style={[styles.agendaPart, { color: entry.color }]}>{entry.part}</Text>
        </View>
       )) : !holiday ? <Text style={styles.agendaEmpty}>—</Text> : null}
      </View>
     </View>
    );
   })}
  </View>
 ) : (
  <Card style={styles.gridCard}>
   <View style={styles.weekHeader}>
    {WEEKDAYS.map((label, index) => <View key={label} style={[styles.weekHeaderCell, index > 4 && styles.weekendCol]}><Text style={[styles.weekdayText, index > 4 && styles.weekdayTextMuted]}>{label}</Text></View>)}
   </View>
   <View testID="calendar-grid">
    {weeks.map(({ cells, lanes, laneCount }, weekIndex) => (
     <View key={weekIndex} style={[styles.weekRow, weekIndex === weeks.length - 1 && styles.weekRowLast]}>
      {cells.map((day, index) => {
       const weekend = index > 4;
       if (!day) return <View key={`pad-${weekIndex}-${index}`} style={[styles.dayCell, weekend && styles.weekendCol, styles.padCell, index === 6 && styles.lastCol]} />;
       const isToday = day.key === todayKey;
       const holiday = holidays.get(day.key);
       const byLane = new Map(day.entries.map(entry => [lanes.get(entry.entryId) ?? 0, entry]));
       const visibleLanes = Math.min(laneCount, MAX_LANES);
       const hidden = day.entries.filter(entry => (lanes.get(entry.entryId) ?? 0) >= MAX_LANES).length;
       return (
        <View key={day.key} testID={`calendar-day-${day.key}`} style={[styles.dayCell, weekend && styles.weekendCol, weekend && HATCH, weekend && styles.weekendCell, index === 6 && styles.lastCol]}>
         <View style={styles.dayHead}>
          <View style={[styles.dayNumber, isToday && styles.dayNumberToday]}><Text style={[styles.dayNumberText, isToday && styles.dayNumberTextToday]}>{day.number}</Text></View>
          {holiday && !weekend ? <Text style={styles.holidayLabel} numberOfLines={1}>{holiday}</Text> : null}
         </View>
         {weekend && holiday ? <Text style={[styles.holidayLabel, styles.holidayWeekend]} numberOfLines={2}>{holiday}</Text> : null}
         {!weekend && Array.from({ length: visibleLanes }, (_, lane) => {
          const entry = byLane.get(lane);
          if (!entry) return <View key={lane} style={styles.laneSpacer} />;
          const full = (e?: DayEntry) => !!e && e.part === "Journée";
          const prev = index > 0 ? cells[index - 1]?.entries.find(e => e.entryId === entry.entryId) : undefined;
          const next = index < 4 ? cells[index + 1]?.entries.find(e => e.entryId === entry.entryId) : undefined;
          const joinLeft = full(entry) && full(prev);
          const joinRight = full(entry) && full(next);
          return <LeavePill key={lane} entry={entry} showName={!joinLeft} joinLeft={joinLeft} joinRight={joinRight} />;
         })}
         {hidden > 0 && <Text style={styles.more}>+{hidden} autre{hidden > 1 ? "s" : ""}</Text>}
        </View>
       );
      })}
     </View>
    ))}
   </View>
  </Card>
 );

 const side = (
  <View style={[styles.side, withSide && styles.sideWide]}>
   {isCurrentMonth && (
    <Card style={styles.sideCard}>
     <CardHeader title="Absents aujourd’hui" right={<Text style={styles.sideHint}>{today.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</Text>} />
     <View style={styles.sideBody}>
      {loading ? <Text style={styles.sideEmpty}>Chargement…</Text> : todayEntries.length === 0 ? <Text style={styles.sideEmpty}>Personne n’est absent aujourd’hui.</Text> : todayEntries.map((entry, index) => (
       <View key={entry.key} style={[styles.who, index > 0 && styles.whoBorder]}>
        <View style={[styles.whoAvatar, { backgroundColor: entry.color }]}><Text style={styles.whoAvatarText}>{initialsOf(entry.name)}</Text></View>
        <Text style={styles.whoName} numberOfLines={1}>{entry.name}</Text>
        <View style={[styles.whoBadge, entry.part !== "Journée" && styles.whoBadgeHalf]}><Text style={[styles.whoBadgeText, entry.part !== "Journée" && styles.whoBadgeTextHalf]}>{entry.part}</Text></View>
       </View>
      ))}
     </View>
    </Card>
   )}
   <Card style={styles.sideCard}>
    <CardHeader title="Légende" />
    <View style={styles.sideBody}>
     {members.length > 0 && (
      <View style={styles.memberList}>
       {members.map(([key, name]) => (
        <View key={key} style={styles.memberItem}><View style={[styles.memberSwatch, { backgroundColor: memberColors.get(key)?.color ?? colors.primary }]} /><Text style={styles.memberName} numberOfLines={1}>{name}</Text></View>
       ))}
      </View>
     )}
     {keys}
    </View>
   </Card>
  </View>
 );

 return <ScrollView testID="shared-calendar-screen" style={styles.scroll} contentContainerStyle={[styles.page, isMobile && styles.pageMobile]}>
  <View style={styles.head}>
   <View style={styles.headText}>
    <Text style={[styles.title, isMobile && styles.titleMobile]}>Congés d’équipe</Text>
    {!isMobile && <Text style={styles.subtitle}>Absences des membres de vos équipes</Text>}
   </View>
   <View style={[styles.toolbar, isMobile && styles.toolbarMobile]}>
    {!isMobile && !isCurrentMonth && <Button label="Aujourd’hui" onPress={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))} />}
    <Button testID="calendar-previous" accessibilityLabel="Mois précédent" icon="left" onPress={() => shift(-1)} />
    <Text testID="calendar-month" style={[styles.month, isMobile && styles.monthMobile]}>{monthLabel}</Text>
    <Button testID="calendar-next" accessibilityLabel="Mois suivant" icon="right" onPress={() => shift(1)} />
   </View>
  </View>

  {teams.length > 0 && (
   <Segmented
    scrollable={isMobile}
    value={team ?? "__all__"}
    onChange={key => setTeam(key === "__all__" ? null : key)}
    options={[{ key: "__all__", label: "Toutes mes équipes", testID: "calendar-team-all" }, ...teams.map(t => ({ key: t.id, label: t.name, testID: `calendar-team-${t.id}` }))]}
   />
  )}

  {loading ? <View testID="calendar-loading" style={styles.status}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.statusText}>Chargement des absences…</Text></View>
   : error ? <View testID="calendar-error" style={[styles.banner, styles.bannerError]}><Icon name="alert" size={16} color={colors.danger} /><Text style={[styles.bannerText, { color: colors.danger }]}>{error}</Text><Button testID="calendar-retry" size="sm" label="Réessayer" onPress={() => setAttempt(n => n + 1)} /></View>
   : teams.length === 0 ? <Text testID="calendar-no-teams" style={styles.noTeams}>Aucune équipe assignée.</Text> : null}
  {unplaced.length > 0 && <View style={[styles.banner, styles.bannerWarn]}><Icon name="alert" size={16} color={colors.warning} /><Text testID="calendar-unplaced" style={[styles.bannerText, { color: colors.warning }]}>Congés mensuels impossibles à répartir : {unplaced.join(", ")}.</Text></View>}

  {isMobile && keys}
  <View style={[styles.body, withSide && styles.bodyWide]}>
   <View style={styles.main}>{grid}</View>
   {!isMobile && side}
  </View>
 </ScrollView>;
}

const styles = StyleSheet.create({
 scroll: { flex: 1, backgroundColor: colors.canvas },
 page: { flexGrow: 1, width: "100%", maxWidth: 1600, alignSelf: "center", paddingVertical: 28, paddingHorizontal: 32, gap: 16 },
 pageMobile: { paddingVertical: 16, paddingHorizontal: 16, gap: 12 },
 head: { flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap", gap: 16 },
 headText: { flex: 1, minWidth: 220 },
 title: { fontFamily: fonts.base, fontSize: 26, fontWeight: "700", letterSpacing: -0.4, color: colors.textPrimary },
 titleMobile: { fontSize: 22 },
 subtitle: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary, marginTop: 4 },
 toolbar: { flexDirection: "row", alignItems: "center", gap: 8 },
 toolbarMobile: { width: "100%", justifyContent: "space-between" },
 month: { fontFamily: fonts.base, fontSize: 17, fontWeight: "700", color: colors.textPrimary, minWidth: 150, textAlign: "center", textTransform: "capitalize" },
 monthMobile: { flex: 1, fontSize: 16 },
 status: { flexDirection: "row", alignItems: "center", gap: 10 },
 statusText: { fontFamily: fonts.base, fontSize: 13, color: colors.textSecondary },
 banner: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: shape.row, borderWidth: 1 },
 bannerError: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder },
 bannerWarn: { backgroundColor: colors.warningSoft, borderColor: colors.warningBorder },
 bannerText: { flex: 1, minWidth: 160, fontFamily: fonts.base, fontSize: 13, fontWeight: "600" },
 noTeams: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary, textAlign: "center", padding: 16, borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderDashed, borderRadius: shape.row },
 body: { gap: 20 },
 bodyWide: { flexDirection: "row", alignItems: "flex-start" },
 main: { flex: 1, minWidth: 0 },
 gridCard: { overflow: "hidden" },
 weekHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.panel },
 weekHeaderCell: { flex: 1, paddingHorizontal: 10, paddingVertical: 10 },
 weekdayText: { fontFamily: fonts.base, fontSize: 11.5, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: colors.textSecondary },
 weekdayTextMuted: { color: colors.textFaint },
 weekendCol: { flex: 0.5 },
 weekRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.divider },
 weekRowLast: { borderBottomWidth: 0 },
 dayCell: { flex: 1, minWidth: 0, minHeight: 112, paddingTop: 6, paddingBottom: 6, borderRightWidth: 1, borderRightColor: colors.divider, gap: 4 },
 lastCol: { borderRightWidth: 0 },
 padCell: { backgroundColor: "#FCFCFD" },
 weekendCell: { backgroundColor: "#F6F7F9" },
 dayHead: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, minHeight: 24 },
 dayNumber: { minWidth: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
 dayNumberToday: { backgroundColor: colors.cta },
 dayNumberText: { fontFamily: fonts.base, fontSize: 12.5, fontWeight: "700", color: colors.textBody, ...tabular },
 dayNumberTextToday: { color: colors.textOnBrand },
 holidayLabel: { flexShrink: 1, fontFamily: fonts.base, fontSize: 10.5, fontWeight: "600", color: colors.ctaText },
 holidayWeekend: { paddingHorizontal: 8 },
 laneSpacer: { height: 26 },
 pill: { height: 26, flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 4, paddingLeft: 4, paddingRight: 6, borderRadius: 7, overflow: "hidden" },
 pillJoinLeft: { marginLeft: -1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, paddingLeft: 8 },
 pillJoinRight: { marginRight: -1, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
 pillAvatar: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
 pillAvatarText: { fontFamily: fonts.base, fontSize: 8.5, fontWeight: "700", color: colors.textOnBrand },
 pillName: { flexShrink: 1, fontFamily: fonts.base, fontSize: 12, fontWeight: "600" },
 pillPart: { marginLeft: "auto", fontFamily: fonts.base, fontSize: 10.5, fontWeight: "700", backgroundColor: "rgba(255,255,255,0.65)", borderRadius: 4, paddingHorizontal: 5, overflow: "hidden" },
 more: { fontFamily: fonts.base, fontSize: 11.5, fontWeight: "600", color: colors.textSecondary, paddingHorizontal: 8 },
 side: { gap: 16 },
 sideWide: { width: 290 },
 sideCard: { padding: 18 },
 sideBody: { marginTop: 10 },
 sideHint: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary },
 sideEmpty: { fontFamily: fonts.base, fontSize: 13, color: colors.textSecondary },
 who: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
 whoBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
 whoAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
 whoAvatarText: { fontFamily: fonts.base, fontSize: 10, fontWeight: "700", color: colors.textOnBrand },
 whoName: { flex: 1, fontFamily: fonts.base, fontSize: 13.5, fontWeight: "600", color: colors.textPrimary },
 whoBadge: { backgroundColor: colors.divider, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
 whoBadgeHalf: { backgroundColor: colors.primarySoft },
 whoBadgeText: { fontFamily: fonts.base, fontSize: 11.5, fontWeight: "600", color: colors.textSecondary },
 whoBadgeTextHalf: { color: colors.primary },
 memberList: { flexDirection: "row", flexWrap: "wrap", rowGap: 8, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
 memberItem: { width: "50%", flexDirection: "row", alignItems: "center", gap: 7, paddingRight: 6 },
 memberSwatch: { width: 10, height: 10, borderRadius: 3 },
 memberName: { flexShrink: 1, fontFamily: fonts.base, fontSize: 12.5, color: colors.textBody },
 keys: { gap: 8 },
 keysMobile: { flexDirection: "row", flexWrap: "wrap", columnGap: 14 },
 keyItem: { flexDirection: "row", alignItems: "center", gap: 8 },
 keySwatch: { width: 22, height: 12, borderRadius: 3 },
 keyWeekend: { backgroundColor: "#F3F4F7" },
 keyHoliday: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cta, marginHorizontal: 8 },
 keyTag: { fontFamily: fonts.base, fontSize: 10.5, fontWeight: "700", color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: 4, paddingHorizontal: 5, overflow: "hidden" },
 keyText: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary },
 todayText: { color: colors.cta },
 agenda: { backgroundColor: colors.panel, borderRadius: shape.card, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
 agendaDay: { flexDirection: "row", gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.divider },
 agendaWeekStart: { borderTopColor: colors.border, borderTopWidth: 1 },
 agendaDate: { width: 40, alignItems: "center" },
 agendaWeekday: { fontFamily: fonts.base, fontSize: 11, fontWeight: "700", textTransform: "uppercase", color: colors.textSecondary },
 agendaNumber: { fontFamily: fonts.base, fontSize: 18, fontWeight: "700", color: colors.textPrimary, ...tabular },
 agendaEntries: { flex: 1, minWidth: 0, gap: 6, justifyContent: "center", minHeight: 40 },
 agendaPill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderLeftWidth: 3 },
 agendaName: { flex: 1, fontFamily: fonts.base, fontSize: 13, fontWeight: "600" },
 agendaPart: { fontFamily: fonts.base, fontSize: 11, fontWeight: "700" },
 agendaEmpty: { fontFamily: fonts.base, fontSize: 13, color: colors.textFaint },
});
