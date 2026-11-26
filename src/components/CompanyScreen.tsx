import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Account, listMembers, Member, saveDisplayName, setMemberActive } from "../storage/memberRepository";
import { colors, fonts, glassStyle, radius, spacing } from "../theme/colors";
import { LoadingSkeleton } from "./LoadingScreen";

type Props = { account: Account; userId: string; admin: boolean; onClose: () => void; onName: (name: string) => void };
export function CompanyScreen({ account, userId, admin, onClose, onName }: Props) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [name, setName] = useState(account.display_name);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const load = async () => {
    try { setError(""); setMembers(await listMembers()); }
    catch (e) { setError(e instanceof Error ? e.message : "Une erreur est survenue."); }
  };
  useEffect(() => { if (admin) void load(); }, [admin]);
  const submit = async () => {
    try { setBusy(true); setError(""); await saveDisplayName(name); onName(name.trim()); setNotice("Nom enregistré."); }
    catch (e) { setError(e instanceof Error ? e.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  };
  const toggle = async (member: Member) => {
    try { setBusy(true); setError(""); await setMemberActive(member.user_id, !member.active); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  };
  if (admin && !account.is_admin) return <View testID="access-denied" style={styles.page}><Text>Accès refusé.</Text><Pressable testID="company-close" onPress={onClose}><Text>Retour</Text></Pressable></View>;
  return <ScrollView testID={admin ? "administration-screen" : "profile-screen"} contentContainerStyle={styles.page}>
    <Pressable testID="company-close" onPress={onClose} style={styles.button}><Text>← Retour</Text></Pressable>
    <Text style={styles.title}>{admin ? "Administration" : "Mon profil"}</Text>
    {error ? <View testID="company-error"><Text style={styles.error}>{error}</Text>{admin && <Pressable onPress={() => void load()} style={styles.button}><Text>Réessayer</Text></Pressable>}</View> : null}
    {notice ? <Text testID="company-notice">{notice}</Text> : null}
    {!admin ? <View style={styles.card}><Text style={styles.label}>Nom d’affichage</Text><TextInput testID="display-name-input" value={name} onChangeText={setName} style={styles.input} maxLength={100} /><Pressable testID="save-display-name" disabled={busy} onPress={() => void submit()} style={styles.button}><Text>Enregistrer</Text></Pressable></View> : <View style={styles.card}>
      <Text style={styles.label}>Membres</Text><TextInput testID="member-search" placeholder="Rechercher par e-mail" value={query} onChangeText={setQuery} style={styles.input} autoCapitalize="none" />
      {members === null && !error ? <LoadingSkeleton /> : members?.filter(m => m.email.toLowerCase().includes(query.toLowerCase())).length ? members.filter(m => m.email.toLowerCase().includes(query.toLowerCase())).map(member => <View key={member.user_id} testID={`member-${member.user_id}`} style={styles.row}><View><Text>{member.display_name}</Text><Text>{member.email} · {member.active ? "Actif" : "Désactivé"}</Text></View>{member.user_id !== userId && <Pressable testID={`toggle-member-${member.user_id}`} disabled={busy} onPress={() => void toggle(member)} style={styles.button}><Text>{member.active ? "Désactiver" : "Réactiver"}</Text></Pressable>}</View>) : <Text testID="members-empty">Aucun membre trouvé.</Text>}
    </View>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.background },
  title: { fontFamily: fonts.base, fontSize: 28, color: colors.brand },
  card: { ...glassStyle, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md },
  label: { fontSize: 18, color: colors.textPrimary },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm, paddingHorizontal: spacing.md, color: colors.textPrimary },
  button: { minHeight: 44, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surfaceActive, alignSelf: "flex-start", justifyContent: "center" },
  row: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  error: { color: colors.danger },
});
