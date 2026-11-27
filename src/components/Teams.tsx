import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { archiveTeam, Assignment, listTeams, saveTeam, setTeamMember, Team } from "../storage/teamRepository";
import { Member } from "../storage/memberRepository";
import { colors, focusRing, fonts, shape, spacing } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { Avatar } from "./Avatar";
import { LoadingSkeleton } from "./LoadingScreen";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardHeader } from "./ui/Card";
import { Icon } from "./ui/Icon";

type Props = { members: Member[] | null; allMembers: Member[]; userId: string; memberBusy: boolean; memberError: boolean; onToggle: (member: Member) => void };

export function Teams({ members, allMembers, userId, memberBusy, memberError, onToggle }: Props) {
 const { width } = useWindowDimensions();
 const wide = width >= 1100;
 const compact = width < 768;
 const [teams, setTeams] = useState<Team[] | null>(null);
 const [assignments, setAssignments] = useState<Assignment[]>([]);
 const [name, setName] = useState("");
 const [nameFocused, setNameFocused] = useState(false);
 const [editing, setEditing] = useState<string | null>(null);
 const [selected, setSelected] = useState<string | null>(null);
 const [showArchives, setShowArchives] = useState(true);
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
 const teamNamesOf = (memberId: string) => assignments.filter(a => a.user_id === memberId).map(a => active.find(t => t.id === a.team_id)?.name).filter((value): value is string => !!value);
 const membersOf = (teamId: string) => assignments.filter(a => a.team_id === teamId).map(a => allMembers.find(m => m.user_id === a.user_id)).filter((value): value is Member => !!value);
 const activeCount = members?.filter(m => m.active).length ?? 0;

 const membersCard = (
  <Card testID="members-section" style={[styles.card, wide && styles.membersWide]}>
   <CardHeader title="Membres" count={members?.length ?? 0} right={members?.length ? <Text style={styles.hint}>{activeCount} actif{activeCount > 1 ? "s" : ""} · {members.length - activeCount} désactivé{members.length - activeCount > 1 ? "s" : ""}</Text> : undefined} />
   <View style={styles.list}>
    {members === null ? (!memberError ? <LoadingSkeleton /> : null) : members.length ? members.map((member, index) => {
     const names = teamNamesOf(member.user_id);
     const open = selected === member.user_id;
     return (
      <View key={member.user_id} testID={`member-${member.user_id}`} style={[styles.memberRow, index > 0 && styles.rowBorder]}>
       <View style={[styles.memberLine, compact && styles.memberLineCompact]}>
        <View style={[styles.identity, !compact && styles.identityWide]}>
         <Avatar label={member.display_name} size={32} round />
         <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={2}>{member.display_name}</Text>
          <Text style={styles.meta} numberOfLines={1}>{member.email}</Text>
         </View>
         {compact && <Badge tone={member.active ? "ok" : "neutral"} dot label={member.active ? "Actif" : "Désactivé"} />}
        </View>
        <View style={styles.memberControls}>
         <View testID={`team-member-${member.user_id}`} style={styles.teamSelectWrap}>
          <Pressable
           testID={`team-member-open-${member.user_id}`}
           accessibilityRole="button"
           accessibilityLabel={names.join(", ") || "Choisir une équipe"}
           accessibilityState={{ expanded: open }}
           style={[styles.teamSelect, open && styles.teamSelectOpen, cursorPointer]}
           onPress={() => setSelected(open ? null : member.user_id)}
          >
           <View style={styles.chips}>
            {names.length ? names.map(teamName => <View key={teamName} style={styles.chip}><Text style={styles.chipText} numberOfLines={1}>{teamName}</Text></View>) : <Text style={styles.placeholder}>Choisir une équipe</Text>}
           </View>
           <View style={open && styles.chevronOpen}><Icon name="down" size={16} color={colors.textSecondary} /></View>
          </Pressable>
         </View>
         {!compact && <View style={styles.statusCol}><Badge tone={member.active ? "ok" : "neutral"} dot label={member.active ? "Actif" : "Désactivé"} /></View>}
         {member.user_id !== userId
          ? <Button testID={`toggle-member-${member.user_id}`} disabled={memberBusy} variant={member.active ? "danger" : "secondary"} label={member.active ? "Désactiver" : "Réactiver"} onPress={() => onToggle(member)} style={styles.memberToggle} />
          : <View testID={`member-toggle-space-${member.user_id}`} style={[styles.memberToggle, styles.toggleSpace]}><Text style={styles.selfText}>Vous</Text></View>}
        </View>
       </View>
       {open && (
        <View style={styles.menu}>
         <Text style={styles.menuTitle}>Équipes de {member.display_name}</Text>
         {teams === null && !error ? <LoadingSkeleton /> : error && teams === null ? <Text style={styles.meta}>Équipes indisponibles.</Text> : active.length ? active.map(team => {
          const assigned = assignments.some(a => a.team_id === team.id && a.user_id === member.user_id);
          return (
           <Pressable
            key={team.id}
            testID={`team-assignment-${member.user_id}-${team.id}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: assigned, disabled: busy }}
            aria-checked={assigned}
            disabled={busy}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed, cursorPointer]}
            onPress={() => void run(() => setTeamMember(team.id, member.user_id, !assigned), "Affectation enregistrée.")}
           >
            <View style={[styles.checkbox, assigned && styles.checkboxOn]}>{assigned && <Icon name="check" size={12} color={colors.textOnBrand} strokeWidth={3} />}</View>
            <Text style={styles.optionText} numberOfLines={1}>{team.name}</Text>
            <Text style={styles.optionCount}>{membersOf(team.id).length}</Text>
           </Pressable>
          );
         }) : <Text style={styles.meta}>Aucune équipe active.</Text>}
        </View>
       )}
      </View>
     );
    }) : <Text testID="members-empty" style={styles.empty}>Aucun membre trouvé.</Text>}
   </View>
  </Card>
 );

 const teamsCard = (
  <Card testID="teams-section" style={[styles.card, wide && styles.teamsWide]}>
   <CardHeader title="Équipes" count={active.length} />
   <View style={styles.createRow}>
    <TextInput
     testID="team-name"
     value={name}
     onChangeText={setName}
     onFocus={() => setNameFocused(true)}
     onBlur={() => setNameFocused(false)}
     placeholder={editing ? "Nouveau nom de l’équipe" : "Nom de la nouvelle équipe"}
     placeholderTextColor={colors.textFaint}
     style={[styles.input, nameFocused && styles.inputFocused, nameFocused && focusRing]}
     maxLength={100}
    />
    <View style={styles.createActions}>
     <Button testID="team-save" variant="primary" disabled={busy} label={editing ? "Enregistrer" : "Créer l’équipe"} onPress={() => void run(async () => { await saveTeam(editing, name); setName(""); setEditing(null); }, "Équipe enregistrée.")} />
     {editing && <Button testID="team-cancel" label="Annuler" variant="ghost" onPress={() => { setEditing(null); setName(""); }} />}
    </View>
   </View>
   <View style={styles.list}>
    {teams === null ? (!error ? <LoadingSkeleton /> : null) : active.length ? active.map((team, index) => {
     const teamMembers = membersOf(team.id);
     return (
      <View key={team.id} testID={`team-${team.id}`} style={[styles.teamRow, index > 0 && styles.rowBorder]}>
       <View style={styles.teamMain}>
        <Text style={styles.name} numberOfLines={2}>{team.name}</Text>
        <Text style={styles.meta}>{teamMembers.length} membre{teamMembers.length > 1 ? "s" : ""}</Text>
       </View>
       {teamMembers.length > 0 && (
        <View style={styles.stack}>
         {teamMembers.slice(0, 4).map((member, i) => <View key={member.user_id} style={[styles.stackItem, i > 0 && styles.stackOverlap]}><Avatar label={member.display_name} size={24} round /></View>)}
        </View>
       )}
       <View style={styles.teamActions}>
        <Button testID={`team-rename-${team.id}`} variant="ghost" icon="edit" label="Renommer" disabled={busy} onPress={() => { setEditing(team.id); setName(team.name); }} />
        <Button testID={`team-archive-${team.id}`} variant="ghost" icon="archive" label="Archiver" disabled={busy} onPress={() => void run(() => archiveTeam(team.id), "Équipe archivée.")} />
       </View>
      </View>
     );
    }) : <Text testID="teams-empty" style={styles.empty}>Aucune équipe active. Créez votre première équipe ci-dessus.</Text>}
   </View>
   {teams !== null && (
    <View style={styles.archives}>
     <Pressable accessibilityRole="button" accessibilityState={{ expanded: showArchives }} onPress={() => setShowArchives(v => !v)} style={[styles.archivesHead, cursorPointer]}>
      <View style={!showArchives && styles.chevronClosed}><Icon name="down" size={15} color={colors.textSecondary} /></View>
      <Text style={styles.archivesTitle}>Archives</Text>
      <View style={styles.countPill}><Text style={styles.countText}>{archived.length}</Text></View>
     </Pressable>
     {showArchives && (archived.length ? archived.map(team => (
      <View key={team.id} testID={`team-archived-${team.id}`} style={styles.archivedRow}>
       <View style={styles.teamMain}>
        <Text style={styles.archivedName}>{team.name}</Text>
        <Text style={styles.meta}>{assignments.filter(a => a.team_id === team.id).map(a => allMembers.find(m => m.user_id === a.user_id)?.display_name ?? "Membre").join(", ") || "Aucun membre"}</Text>
       </View>
       <Badge label="Archivée" />
      </View>
     )) : <Text testID="teams-archives-empty" style={styles.archivesEmpty}>Aucune équipe archivée.</Text>)}
    </View>
   )}
  </Card>
 );

 return <View style={styles.container}>
  {error ? <View testID="teams-error" style={[styles.banner, styles.bannerError]}><Icon name="alert" size={16} color={colors.danger} /><Text style={[styles.bannerText, { color: colors.danger }]}>{error}</Text><Button testID="teams-retry" size="sm" label="Réessayer" onPress={() => void retry()} /></View> : null}
  {notice ? <View style={[styles.banner, styles.bannerOk]}><Icon name="check" size={16} color={colors.positive} /><Text testID="teams-notice" style={[styles.bannerText, { color: colors.positive }]}>{notice}</Text></View> : null}
  <View style={[styles.columns, wide && styles.columnsWide]}>
   {membersCard}
   {teamsCard}
  </View>
 </View>;
}

const styles = StyleSheet.create({
 container: { gap: spacing.md },
 columns: { gap: 20 },
 columnsWide: { flexDirection: "row", alignItems: "flex-start" },
 card: { padding: 18 },
 membersWide: { flex: 1, minWidth: 0 },
 teamsWide: { width: 380 },
 hint: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary },
 list: { marginTop: 8 },
 rowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
 memberRow: { paddingVertical: 10, gap: 8 },
 memberLine: { flexDirection: "row", alignItems: "center", gap: 12 },
 memberLineCompact: { flexDirection: "column", alignItems: "stretch", gap: 8 },
 identity: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
 identityWide: { flex: 1.1 },
 identityText: { flex: 1, minWidth: 0 },
 name: { fontFamily: fonts.base, fontSize: 14.5, fontWeight: "600", color: colors.textPrimary },
 meta: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary },
 memberControls: { flex: 1.4, flexDirection: "row", alignItems: "center", gap: spacing.sm, minWidth: 0 },
 teamSelectWrap: { flex: 1, minWidth: 0 },
 teamSelect: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: shape.control, backgroundColor: colors.panel },
 teamSelectOpen: { borderColor: colors.primary },
 chips: { flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", gap: 6 },
 chip: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, maxWidth: "100%" },
 chipText: { fontFamily: fonts.base, fontSize: 12, fontWeight: "600", color: colors.primary },
 placeholder: { fontFamily: fonts.base, fontSize: 13, color: colors.textFaint },
 chevronOpen: { transform: [{ rotate: "180deg" }] },
 chevronClosed: { transform: [{ rotate: "-90deg" }] },
 statusCol: { width: 100 },
 memberToggle: { width: 116, alignItems: "center" },
 toggleSpace: { minHeight: 44, justifyContent: "center" },
 selfText: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textFaint },
 menu: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.panel, padding: 6, gap: 2 },
 menuTitle: { fontFamily: fonts.base, fontSize: 11.5, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: colors.textSecondary, paddingHorizontal: 10, paddingVertical: 6 },
 option: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 10, borderRadius: 8 },
 optionPressed: { backgroundColor: colors.canvas },
 checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
 checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
 optionText: { flex: 1, fontFamily: fonts.base, fontSize: 14, color: colors.textPrimary },
 optionCount: { fontFamily: fonts.base, fontSize: 12, color: colors.textFaint },
 createRow: { gap: 8, marginTop: 12, marginBottom: 4 },
 createActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
 input: { fontFamily: fonts.base, fontSize: 14.5, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: shape.control, paddingHorizontal: 12, color: colors.textPrimary, backgroundColor: colors.panel },
 inputFocused: { borderColor: colors.primary },
 teamRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingVertical: 10 },
 teamMain: { flex: 1, minWidth: 140 },
 teamActions: { flexDirection: "row", gap: 2 },
 stack: { flexDirection: "row" },
 stackItem: { borderRadius: 14, borderWidth: 2, borderColor: colors.panel },
 stackOverlap: { marginLeft: -8 },
 archives: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
 archivesHead: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40 },
 archivesTitle: { fontFamily: fonts.base, fontSize: 13.5, fontWeight: "600", color: colors.textSecondary },
 countPill: { backgroundColor: colors.divider, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
 countText: { fontFamily: fonts.base, fontSize: 11, fontWeight: "600", color: colors.textSecondary },
 archivedRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingLeft: 23, opacity: 0.8 },
 archivedName: { fontFamily: fonts.base, fontSize: 14, fontWeight: "600", color: colors.textPrimary },
 archivesEmpty: { fontFamily: fonts.base, fontSize: 13, color: colors.textSecondary, paddingLeft: 23, paddingVertical: 6 },
 empty: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingVertical: 20, paddingHorizontal: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderDashed, borderRadius: shape.row },
 banner: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: shape.row, borderWidth: 1 },
 bannerError: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder },
 bannerOk: { backgroundColor: colors.positiveSoft, borderColor: colors.positiveBorder },
 bannerText: { flex: 1, minWidth: 160, fontFamily: fonts.base, fontSize: 13.5, fontWeight: "600" },
});
