import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CalendarEntry, CalendarTeam, loadSharedCalendar } from "../storage/sharedCalendarRepository";
import { colors, fonts, shape, spacing } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { toISODate, workingDaysCount } from "../utils/leaveDays";
import { LoadingSkeleton } from "./LoadingScreen";

type DayEntry = { key: string; name: string; part: string; color: string; background: string };
type CalendarDay = { key: string; number: number; entries: DayEntry[] };
const leaveColors = [
 { color: "#1F4E79", background: "#EAF1F8" },
 { color: "#A34E16", background: "#FEF0E7" },
 { color: "#12613A", background: "#E9F9EF" },
 { color: "#7041A6", background: "#F2EAFB" },
 { color: "#A32942", background: "#FDECEC" },
 { color: "#286A70", background: "#E5F4F3" },
];
function colorForName(name: string) {
 const hash = [...name].reduce((value, char) => value + char.charCodeAt(0), 0);
 return leaveColors[hash % leaveColors.length];
}
function calendarDays(entries: CalendarEntry[], month: Date): CalendarDay[] {
 const days: CalendarDay[] = [];
 for (let number = 1; number <= new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); number += 1) {
  const date = new Date(month.getFullYear(), month.getMonth(), number);
  const key = toISODate(date);
  const dayEntries = entries.flatMap(entry => {
   if (key < entry.start_date || key > entry.end_date || workingDaysCount(key, key) === 0) return [];
   const morningOnly = key === entry.end_date && entry.end_half === "morning";
   const afternoonOnly = key === entry.start_date && entry.start_half === "afternoon";
   const palette = colorForName(entry.display_name);
   return [{ key: `${entry.id}-${key}`, name: entry.display_name, part: morningOnly ? "Matin" : afternoonOnly ? "Après-midi" : "Journée", ...palette }];
  }).sort((a, b) => a.name.localeCompare(b.name));
  days.push({ key, number, entries: dayEntries });
 }
 return days;
}
export function SharedCalendar({ onClose }: { onClose: () => void }) {
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
 const days = calendarDays(entries, month);
 const shift = (n: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + n, 1));
 const offset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
 return <ScrollView testID="shared-calendar-screen" style={styles.scroll} contentContainerStyle={styles.page}>
  <Pressable testID="calendar-close" onPress={onClose} style={[styles.button,cursorPointer]}><Text style={styles.text}>← Retour</Text></Pressable>
  <Text style={styles.title}>Congés d’équipe</Text>
  <View style={styles.card}>
   <View style={styles.controls}><Pressable testID="calendar-previous" accessibilityLabel="Mois précédent" onPress={() => shift(-1)} style={[styles.button,cursorPointer]}><Text style={styles.text}>←</Text></Pressable><Text testID="calendar-month" style={styles.heading}>{month.toLocaleDateString("fr-FR", { month:"long", year:"numeric" })}</Text><Pressable testID="calendar-next" accessibilityLabel="Mois suivant" onPress={() => shift(1)} style={[styles.button,cursorPointer]}><Text style={styles.text}>→</Text></Pressable></View>
   {teams.length > 0 && <View style={styles.filters}><Pressable testID="calendar-team-all" accessibilityRole="button" accessibilityState={{ selected: team === null }} onPress={() => setTeam(null)} style={[styles.button, team === null && styles.selected,cursorPointer]}><Text style={styles.text}>Toutes mes équipes</Text></Pressable>{teams.map(t => <Pressable key={t.id} testID={`calendar-team-${t.id}`} accessibilityRole="button" accessibilityState={{selected:team===t.id}} onPress={() => setTeam(t.id)} style={[styles.button,team===t.id && styles.selected,cursorPointer]}><Text style={styles.text}>{t.name}</Text></Pressable>)}</View>}
   {loading ? <View testID="calendar-loading"><LoadingSkeleton /></View> : error ? <View testID="calendar-error"><Text style={styles.error}>{error}</Text><Pressable testID="calendar-retry" onPress={() => setAttempt(n => n+1)} style={[styles.button,cursorPointer]}><Text style={styles.text}>Réessayer</Text></Pressable></View> : teams.length === 0 ? <Text testID="calendar-no-teams" style={styles.empty}>Aucune équipe assignée.</Text> : null}
   {unplaced.length > 0 && <Text testID="calendar-unplaced" style={styles.error}>Congés mensuels impossibles à répartir : {unplaced.join(", ")}.</Text>}
   <View style={styles.legend}><View style={styles.legendSwatch} /><Text style={styles.text}>Congé</Text></View>
   <View testID="calendar-grid" style={styles.grid}>
    {[["Lun.","Mar.","Mer.","Jeu.","Ven.","Sam.","Dim."]].flat().map(label => <View key={label} style={styles.weekday}><Text style={styles.weekdayText}>{label}</Text></View>)}
    {Array.from({ length: offset }, (_, index) => <View key={`pad-${index}`} style={styles.paddingCell} />)}
    {days.map(day => <View key={day.key} testID={`calendar-day-${day.key}`} style={styles.dayCell}>
     <Text style={styles.dayNumber}>{day.number}</Text>
     {day.entries.map(entry => <View key={entry.key} testID="calendar-entry" style={[styles.leaveBadge, { backgroundColor: entry.background }]}><Text style={[styles.leaveName, { color: entry.color }]} numberOfLines={2}>{entry.name}</Text><Text style={[styles.leavePart, { color: entry.color }]}>{entry.part}</Text></View>)}
    </View>)}
   </View>
  </View>
 </ScrollView>;
}
const styles = StyleSheet.create({scroll:{flex:1,backgroundColor:colors.background},page:{flexGrow:1,width:"100%",maxWidth:1200,alignSelf:"center",padding:spacing.xl,gap:spacing.lg},title:{fontFamily:fonts.base,fontSize:30,fontWeight:"700",color:colors.textPrimary},card:{padding:spacing.lg,borderRadius:shape.card,borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel,gap:spacing.lg},controls:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.sm},filters:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},button:{minHeight:44,paddingHorizontal:14,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:colors.border,justifyContent:"center",alignSelf:"flex-start"},selected:{backgroundColor:colors.selection,borderColor:colors.primaryBorder},heading:{fontFamily:fonts.base,fontSize:16,fontWeight:"700",color:colors.textPrimary},text:{fontFamily:fonts.base,fontSize:14,color:colors.textPrimary},empty:{padding:spacing.xl,textAlign:"center",color:colors.textSecondary},error:{color:colors.danger,marginBottom:spacing.sm},legend:{flexDirection:"row",alignItems:"center",gap:spacing.sm},legendSwatch:{width:14,height:14,borderRadius:4,backgroundColor:colors.primarySoft,borderWidth:1,borderColor:colors.primaryBorder},grid:{flexDirection:"row",flexWrap:"wrap",borderTopWidth:1,borderLeftWidth:1,borderColor:colors.border},weekday:{width:"14.2857%",minHeight:34,justifyContent:"center",alignItems:"center",backgroundColor:colors.panelSubtle,borderRightWidth:1,borderBottomWidth:1,borderColor:colors.border},weekdayText:{fontFamily:fonts.base,fontSize:12,fontWeight:"700",color:colors.textSecondary},paddingCell:{width:"14.2857%",minHeight:94,borderRightWidth:1,borderBottomWidth:1,borderColor:colors.border,backgroundColor:colors.panelSubtle},dayCell:{width:"14.2857%",minHeight:94,padding:4,borderRightWidth:1,borderBottomWidth:1,borderColor:colors.border,gap:3},dayNumber:{fontFamily:fonts.base,fontSize:12,fontWeight:"700",color:colors.textSecondary},leaveBadge:{borderRadius:6,paddingHorizontal:3,paddingVertical:2},leaveName:{fontFamily:fonts.base,fontSize:10,fontWeight:"700"},leavePart:{fontFamily:fonts.base,fontSize:9}});
