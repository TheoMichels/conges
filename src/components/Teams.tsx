import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { archiveTeam, Assignment, listTeams, saveTeam, setTeamMember, Team } from "../storage/teamRepository";
import { Member } from "../storage/memberRepository";
import { colors, fonts, shape, spacing } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { LoadingSkeleton } from "./LoadingScreen";

type Props = { members: Member[] | null; allMembers: Member[]; userId: string; memberBusy: boolean; memberError: boolean; onToggle: (member: Member) => void };
export function Teams({ members, allMembers, userId, memberBusy, memberError, onToggle }: Props) {
 const [teams, setTeams] = useState<Team[] | null>(null);
 const [assignments, setAssignments] = useState<Assignment[]>([]);
 const [name, setName] = useState("");
 const [editing, setEditing] = useState<string | null>(null);
 const [selected, setSelected] = useState<string | null>(null);
 const [error, setError] = useState("");
 const [notice, setNotice] = useState("");
 const [busy, setBusy] = useState(false);
 const load = useCallback(async () => { const data = await listTeams(); setTeams(data.teams); setAssignments(data.assignments); }, []);
 const retry = useCallback(async () => { try { setError(""); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Une erreur est survenue."); } }, [load]);
 useEffect(() => { void retry(); }, [retry]);
 const run = async (action: () => Promise<void>, message: string) => {
  try { setBusy(true); setError(""); setNotice(""); await action(); await load(); setNotice(message); }
  catch (e) { setError(e instanceof Error ? e.message : "Une erreur est survenue."); }
  finally { setBusy(false); }
 };
 const active = teams?.filter(t => !t.archived) ?? [];
 const archived = teams?.filter(t => t.archived) ?? [];
 return <View style={styles.container}>
  {error ? <View testID="teams-error" style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable testID="teams-retry" onPress={() => void retry()} style={styles.button}><Text>Réessayer</Text></Pressable></View> : null}
  {notice ? <Text testID="teams-notice" style={styles.notice}>{notice}</Text> : null}
  <View testID="members-section" style={styles.container}>
   <Text style={styles.title}>Membres</Text>
   {members === null ? (!memberError ? <LoadingSkeleton /> : null) : members.length ? members.map(member => <View key={member.user_id} testID={`member-${member.user_id}`} style={styles.row}>
    <View style={styles.memberHeader}><View style={styles.identity}><View style={styles.nameLine}><Text style={styles.name} numberOfLines={2}>{member.display_name}</Text><View testID={`team-member-${member.user_id}`}><Pressable testID={`team-member-open-${member.user_id}`} accessibilityRole="button" accessibilityState={{ expanded: selected === member.user_id }} style={styles.teamSelect} onPress={() => setSelected(selected === member.user_id ? null : member.user_id)}><Text style={styles.teamSelectText}>{assignments.filter(a => a.user_id === member.user_id).map(a => active.find(t => t.id === a.team_id)?.name).filter((value): value is string => !!value).join(", ") || "Choisir une équipe"}⌄</Text></Pressable></View></View><Text style={styles.meta}>{member.active ? "Actif" : "Désactivé"}</Text></View>{member.user_id !== userId && <Pressable testID={`toggle-member-${member.user_id}`} disabled={memberBusy} onPress={() => onToggle(member)} style={[styles.button, memberBusy && styles.disabled]}><Text>{member.active ? "Désactiver" : "Réactiver"}</Text></Pressable>}</View>
    <View>
    {selected === member.user_id && <View style={styles.actions}>{teams === null && !error ? <LoadingSkeleton /> : error && teams === null ? <Text>Équipes indisponibles.</Text> : active.length ? active.map(team => { const assigned = assignments.some(a => a.team_id === team.id && a.user_id === member.user_id); return <Pressable key={team.id} testID={`team-assignment-${member.user_id}-${team.id}`} accessibilityRole="checkbox" accessibilityState={{ checked: assigned, disabled: busy }} disabled={busy} style={[styles.button, assigned && styles.selected]} onPress={() => void run(() => setTeamMember(team.id, member.user_id, !assigned), "Affectation enregistrée.")}><Text>{assigned ? "☑" : "☐"} {team.name}</Text></Pressable>; }) : <Text>Aucune équipe active.</Text>}</View>}</View>
   </View>) : <Text testID="members-empty" style={styles.empty}>Aucun membre trouvé.</Text>}
  </View>
  <View style={styles.container} testID="teams-section">
  <Text style={styles.title}>Équipes</Text>
  <TextInput testID="team-name" value={name} onChangeText={setName} placeholder="Nom de l’équipe" style={styles.input} maxLength={100} />
  <View style={styles.actions}><Pressable testID="team-save" disabled={busy} style={[styles.button, styles.primary, busy && styles.disabled, cursorPointer]} onPress={() => void run(async () => { await saveTeam(editing, name); setName(""); setEditing(null); }, "Équipe enregistrée.")}><Text style={styles.primaryText}>{editing ? "Enregistrer" : "Créer l’équipe"}</Text></Pressable>{editing && <Pressable testID="team-cancel" style={styles.button} onPress={() => { setEditing(null); setName(""); }}><Text>Annuler</Text></Pressable>}</View>
  {teams === null ? (!error ? <LoadingSkeleton /> : null) : active.length ? active.map(team => <View key={team.id} testID={`team-${team.id}`} style={styles.row}><Text style={styles.name} numberOfLines={2}>{team.name}</Text><View style={styles.actions}><Pressable testID={`team-rename-${team.id}`} disabled={busy} style={styles.button} onPress={() => { setEditing(team.id); setName(team.name); }}><Text>Renommer</Text></Pressable><Pressable testID={`team-archive-${team.id}`} disabled={busy} style={styles.button} onPress={() => void run(() => archiveTeam(team.id), "Équipe archivée.")}><Text>Supprimer</Text></Pressable></View></View>) : <Text testID="teams-empty" style={styles.empty}>Aucune équipe active. Créez votre première équipe ci-dessus.</Text>}
  {teams !== null && <><Text style={styles.title}>Archives</Text>
  {archived.length ? archived.map(team => <View key={team.id} testID={`team-archived-${team.id}`} style={styles.row}><Text style={styles.name}>{team.name}</Text><Text>{assignments.filter(a => a.team_id === team.id).map(a => allMembers.find(m => m.user_id === a.user_id)?.display_name ?? "Membre").join(", ") || "Aucun membre"}</Text></View>) : <Text testID="teams-archives-empty" style={styles.empty}>Aucune équipe archivée.</Text>}</>}
  </View>
 </View>;
}
const styles = StyleSheet.create({
 container: { gap: spacing.md }, title: { fontFamily: fonts.base, fontSize: 18, fontWeight: "700", color: colors.textPrimary },
 input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, color: colors.textPrimary },
 button: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, justifyContent: "center" },
 primary: { backgroundColor: colors.cta, borderColor: colors.cta }, primaryText: { color: colors.textOnBrand, fontWeight: "600" }, disabled: { opacity: 0.5 },
 memberHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }, identity: { flexShrink: 1 }, nameLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm }, teamSelect: { height: 44, minHeight: 44, maxWidth: 220, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: shape.pill, backgroundColor: colors.primarySoft }, teamSelectText: { color: colors.primary, fontSize: 13, fontWeight: "600" }, meta: { color: colors.textSecondary },
 row: { padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: shape.row, gap: spacing.sm }, actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
 name: { fontSize: 16, fontWeight: "700", color: colors.textPrimary }, selected: { backgroundColor: colors.selection }, empty: { color: colors.textSecondary, padding: 12 },
 error: { padding: 12, backgroundColor: colors.dangerSoft, gap: spacing.sm }, errorText: { color: colors.danger }, notice: { color: colors.positive },
});
