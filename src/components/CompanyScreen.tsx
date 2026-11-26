import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Account, listMembers, Member, saveDisplayName, setMemberActive } from "../storage/memberRepository";
import { colors, fonts, shape, spacing } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { AnnualEntitlements } from "./AnnualEntitlements";
import { Teams } from "./Teams";
import { LoadingSkeleton } from "./LoadingScreen";

type Props = { account: Account; userId: string; admin: boolean; demo?: boolean; onClose: () => void; onName?: (name: string) => void };
export function CompanyScreen({ account, userId, admin, demo = false, onClose, onName }: Props) {
  const [members, setMembers] = useState<Member[] | null>(() => demo ? [
    { user_id: "demo-alice", email: "alice@example.com", display_name: "Alice Martin", active: true },
    { user_id: "demo-bob", email: "bob@example.com", display_name: "Bob Durand", active: true },
  ] : null);
  const [name, setName] = useState(account.display_name);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const load = async () => {
    try { setError(""); setMembers(await listMembers()); }
    catch (e) { setError(e instanceof Error ? e.message : "Une erreur est survenue."); }
  };
  useEffect(() => { if (admin && !demo) void load(); }, [admin, demo]);
  const submit = async () => {
    try { setBusy(true); setError(""); await saveDisplayName(name); onName?.(name.trim()); setNotice("Nom enregistré."); }
    catch (e) { setError(e instanceof Error ? e.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  };
  const toggle = async (member: Member) => {
    if (demo) {
      setMembers(current => current?.map(item => item.user_id === member.user_id ? { ...item, active: !item.active } : item) ?? null);
      setNotice("Modification de démonstration enregistrée pour cette visite.");
      return;
    }
    try { setBusy(true); setError(""); await setMemberActive(member.user_id, !member.active); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  };
  if (admin && !account.is_admin) return <View testID="access-denied" style={[styles.page, styles.pageCenter]}><View style={styles.card}><Text style={styles.error}>Accès refusé.</Text><Pressable testID="company-close" onPress={onClose} style={[styles.button, cursorPointer]}><Text style={styles.buttonText}>Retour</Text></Pressable></View></View>;
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = members?.filter(m => `${m.display_name} ${m.email}`.toLowerCase().includes(normalizedQuery));
  return <ScrollView testID={admin ? "administration-screen" : "profile-screen"} style={styles.scroll} contentContainerStyle={styles.page}>
    <Pressable testID="company-close" onPress={onClose} style={[styles.button, cursorPointer]}><Text style={styles.buttonText}>← Retour</Text></Pressable>
    <Text style={styles.title}>{admin ? "Administration" : "Mon profil"}</Text>
    {demo && <Text testID="demo-banner" style={styles.demoBanner}>Démonstration locale : membres fictifs, modifications temporaires sans effet sur les comptes réels.</Text>}
    {error ? <View testID="company-error" style={styles.errorBox}><Text style={styles.error}>{error}</Text>{admin && <Pressable onPress={() => void load()} style={[styles.button, cursorPointer]}><Text style={styles.buttonText}>Réessayer</Text></Pressable>}</View> : null}
    {notice ? <Text testID="company-notice" style={styles.notice}>{notice}</Text> : null}
    {!admin ? <View style={styles.card}><Text style={styles.label}>Nom d’affichage</Text><TextInput testID="display-name-input" value={name} onChangeText={setName} style={styles.input} maxLength={100} /><Pressable testID="save-display-name" disabled={busy} onPress={() => void submit()} style={[styles.button, styles.primaryButton, busy && styles.disabled, cursorPointer]}><Text style={styles.primaryButtonText}>Enregistrer</Text></Pressable></View> : <View style={styles.card}>
      <Text style={styles.label}>Personnes</Text><TextInput testID="member-search" placeholder="Rechercher par nom ou e-mail" placeholderTextColor={colors.textSecondary} value={query} onChangeText={setQuery} style={styles.input} autoCapitalize="none" />
      <AnnualEntitlements demo={demo} query={query} />
      {!demo ? <Teams members={filtered ?? null} allMembers={members ?? []} userId={userId} memberBusy={busy} memberError={!!error} onToggle={member => void toggle(member)} /> : <View testID="members-section" style={{ gap: spacing.md }}><Text style={styles.label}>Membres</Text>
      {members === null && !error ? <LoadingSkeleton /> : filtered?.length ? filtered.map(member => <View key={member.user_id} testID={`member-${member.user_id}`} style={styles.row}><View style={styles.rowMain}><Text style={styles.memberName}>{member.display_name}</Text><Text style={styles.memberMeta}>{member.email} · {member.active ? "Actif" : "Désactivé"}</Text></View>{member.user_id !== userId && <Pressable testID={`toggle-member-${member.user_id}`} disabled={busy} onPress={() => void toggle(member)} style={[styles.button, busy && styles.disabled, cursorPointer]}><Text style={styles.buttonText}>{member.active ? "Désactiver" : "Réactiver"}</Text></Pressable>}</View>) : <Text testID="members-empty" style={styles.empty}>Aucun membre trouvé.</Text>}</View>}
    </View>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  page: { flexGrow: 1, width: "100%", maxWidth: 1600, alignSelf: "center", paddingVertical: 36, paddingHorizontal: spacing.xl, gap: spacing.lg, backgroundColor: colors.background },
  pageCenter: { flex: 1, justifyContent: "center" },
  title: { fontFamily: fonts.base, fontSize: 30, fontWeight: "700", letterSpacing: -0.4, color: colors.textPrimary },
  card: { padding: 24, borderRadius: shape.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, gap: spacing.md },
  label: { fontFamily: fonts.base, fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  input: { fontFamily: fonts.base, fontSize: 16, minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, backgroundColor: colors.panel, color: colors.textPrimary },
  button: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, alignSelf: "flex-start", justifyContent: "center" },
  buttonText: { fontFamily: fonts.base, fontSize: 14, color: colors.textPrimary },
  primaryButton: { backgroundColor: colors.cta, borderColor: colors.cta },
  primaryButtonText: { fontFamily: fonts.base, fontSize: 14, fontWeight: "600", color: colors.textOnBrand },
  disabled: { opacity: 0.5 },
  row: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: spacing.md, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, borderRadius: shape.row },
  rowMain: { flexShrink: 1, gap: 2 },
  memberName: { fontFamily: fonts.base, fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  memberMeta: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary },
  empty: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingVertical: 20, borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderDashed, borderRadius: shape.row },
  demoBanner: { fontFamily: fonts.base, fontSize: 14, color: colors.ctaText, backgroundColor: colors.ctaSoft, borderRadius: shape.row, paddingHorizontal: 16, paddingVertical: 12, overflow: "hidden" },
  notice: { fontFamily: fonts.base, fontSize: 14, fontWeight: "600", color: colors.positive, backgroundColor: colors.positiveSoft, borderRadius: shape.row, paddingHorizontal: 16, paddingVertical: 12, overflow: "hidden" },
  errorBox: { gap: spacing.sm, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: "#F5C2C2", borderRadius: shape.row, padding: 14 },
  error: { fontFamily: fonts.base, fontSize: 14, fontWeight: "600", color: colors.danger },
});
