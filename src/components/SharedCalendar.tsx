import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CalendarEntry, CalendarTeam, loadSharedCalendar } from "../storage/sharedCalendarRepository";
import { colors, fonts, shape, spacing } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { formatDateFr, toISODate, workingDaysCount } from "../utils/leaveDays";
import { LoadingSkeleton } from "./LoadingScreen";

type Day = { key: string; name: string; date: string; part: string };
function daysForMonth(entries: CalendarEntry[], month: Date): Day[] {
 const result: Day[] = [];
 for (const entry of entries) {
  const cursor = new Date(month.getFullYear(), month.getMonth(), 1);
  while (cursor.getMonth() === month.getMonth()) {
   const date = toISODate(cursor);
   if (date >= entry.start_date && date <= entry.end_date && workingDaysCount(date, date) > 0) {
    const morningOnly = date === entry.end_date && entry.end_half === "morning";
    const afternoonOnly = date === entry.start_date && entry.start_half === "afternoon";
    result.push({ key: `${entry.id}-${date}`, name: entry.display_name, date, part: morningOnly ? "Matin" : afternoonOnly ? "Après-midi" : "Journée" });
   }
   cursor.setDate(cursor.getDate() + 1);
  }
 }
 return result.sort((a,b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}
export function SharedCalendar({ onClose }: { onClose: () => void }) {
 const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
 const [team, setTeam] = useState<string | null>(null);
 const [teams, setTeams] = useState<CalendarTeam[]>([]);
 const [entries, setEntries] = useState<CalendarEntry[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [attempt, setAttempt] = useState(0);
 useEffect(() => {
  let cancelled = false; setLoading(true); setError("");
  void loadSharedCalendar(toISODate(month), team).then(data => { if (!cancelled) { setTeams(data.teams); setEntries(data.entries); } }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Une erreur est survenue."); }).finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
 }, [month, team, attempt]);
 const days = daysForMonth(entries, month);
 const shift = (n: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + n, 1));
 return <ScrollView testID="shared-calendar-screen" style={styles.scroll} contentContainerStyle={styles.page}>
  <Pressable testID="calendar-close" onPress={onClose} style={[styles.button,cursorPointer]}><Text style={styles.text}>← Retour</Text></Pressable>
  <Text style={styles.title}>Congés d’équipe</Text>
  <View style={styles.card}>
   <View style={styles.controls}><Pressable testID="calendar-previous" accessibilityLabel="Mois précédent" onPress={() => shift(-1)} style={[styles.button,cursorPointer]}><Text style={styles.text}>←</Text></Pressable><Text testID="calendar-month" style={styles.heading}>{month.toLocaleDateString("fr-FR", { month:"long", year:"numeric" })}</Text><Pressable testID="calendar-next" accessibilityLabel="Mois suivant" onPress={() => shift(1)} style={[styles.button,cursorPointer]}><Text style={styles.text}>→</Text></Pressable></View>
   {loading ? <LoadingSkeleton /> : error ? <View testID="calendar-error"><Text style={styles.error}>{error}</Text><Pressable testID="calendar-retry" onPress={() => setAttempt(n => n+1)} style={[styles.button,cursorPointer]}><Text style={styles.text}>Réessayer</Text></Pressable></View> : teams.length === 0 ? <Text testID="calendar-no-teams" style={styles.empty}>Aucune équipe assignée.</Text> : <>
    <View style={styles.filters}><Pressable testID="calendar-team-all" accessibilityRole="button" accessibilityState={{ selected: team === null }} onPress={() => setTeam(null)} style={[styles.button, team === null && styles.selected,cursorPointer]}><Text style={styles.text}>Toutes mes équipes</Text></Pressable>{teams.map(t => <Pressable key={t.id} testID={`calendar-team-${t.id}`} accessibilityRole="button" accessibilityState={{selected:team===t.id}} onPress={() => setTeam(t.id)} style={[styles.button,team===t.id && styles.selected,cursorPointer]}><Text style={styles.text}>{t.name}</Text></Pressable>)}</View>
    {days.length ? days.map(day => <View key={day.key} testID="calendar-entry" style={styles.row}><Text style={styles.heading}>{day.name}</Text><Text style={styles.text}>{formatDateFr(day.date)} · {day.part}</Text></View>) : <Text testID="calendar-empty" style={styles.empty}>Aucun congé ce mois-ci.</Text>}
   </>}
  </View>
 </ScrollView>;
}
const styles = StyleSheet.create({scroll:{flex:1,backgroundColor:colors.background},page:{flexGrow:1,width:"100%",maxWidth:1200,alignSelf:"center",padding:spacing.xl,gap:spacing.lg},title:{fontFamily:fonts.base,fontSize:30,fontWeight:"700",color:colors.textPrimary},card:{padding:spacing.lg,borderRadius:shape.card,borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel,gap:spacing.lg},controls:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.sm},filters:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},button:{minHeight:44,paddingHorizontal:14,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:colors.border,justifyContent:"center",alignSelf:"flex-start"},selected:{backgroundColor:colors.selection,borderColor:colors.primaryBorder},heading:{fontFamily:fonts.base,fontSize:16,fontWeight:"700",color:colors.textPrimary},text:{fontFamily:fonts.base,fontSize:14,color:colors.textPrimary},row:{padding:spacing.md,borderWidth:1,borderColor:colors.border,borderRadius:shape.row,gap:4},empty:{padding:spacing.xl,textAlign:"center",color:colors.textSecondary},error:{color:colors.danger,marginBottom:spacing.sm}});
