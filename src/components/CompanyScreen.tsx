import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Account, listMembers, Member, saveDisplayName, setMemberActive } from "../storage/memberRepository";
import { colors, focusRing, fonts, shape, spacing } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { AnnualEntitlements } from "./AnnualEntitlements";
import { Avatar } from "./Avatar";
import { Teams } from "./Teams";
import { LoadingSkeleton } from "./LoadingScreen";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardHeader } from "./ui/Card";
import { Icon } from "./ui/Icon";

type Props = { account: Account; userId: string; admin: boolean; demo?: boolean; onClose: () => void; onName?: (name: string) => void };
type AdminTab = "annual" | "members";
const TAB_KEY = "@holy_admin_tab";

// Onglet mémorisé pour la session du navigateur (rechargement compris).
function readTab(fallback: AdminTab): AdminTab {
  if (Platform.OS !== "web") return fallback;
  try { const value = window.sessionStorage.getItem(TAB_KEY); return value === "annual" || value === "members" ? value : fallback; } catch { return fallback; }
}
function writeTab(tab: AdminTab) {
  if (Platform.OS !== "web") return;
  try { window.sessionStorage.setItem(TAB_KEY, tab); } catch { /* stockage indisponible */ }
}

export function CompanyScreen({ account, userId, admin, demo = false, onClose, onName }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [members, setMembers] = useState<Member[] | null>(() => demo ? [
    { user_id: "demo-alice", email: "alice@example.com", display_name: "Alice Martin", active: true },
    { user_id: "demo-bob", email: "bob@example.com", display_name: "Bob Durand", active: true },
  ] : null);
  const [name, setName] = useState(account.display_name);
  const [nameFocused, setNameFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<AdminTab>(() => (demo ? "members" : readTab("annual")));
  const load = async () => {
    try { setError(""); setMembers(await listMembers()); }
    catch (e) { setError(e instanceof Error ? e.message : "Une erreur est survenue."); }
  };
  useEffect(() => { if (admin && !demo) void load(); }, [admin, demo]);
  const selectTab = (next: AdminTab) => { setTab(next); if (!demo) writeTab(next); };
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

  if (admin && !account.is_admin) {
    return (
      <View testID="access-denied" style={[styles.scroll, styles.centered]}>
        <Card style={styles.deniedCard}>
          <Icon name="shield" size={28} color={colors.danger} />
          <Text style={styles.deniedTitle}>Accès refusé.</Text>
          <Text style={styles.deniedText}>Cette page est réservée aux administrateurs.</Text>
          <Button testID="company-close" label="Retour à mes congés" icon="left" onPress={onClose} style={styles.centerButton} />
        </Card>
      </View>
    );
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = members?.filter(m => `${m.display_name} ${m.email}`.toLowerCase().includes(normalizedQuery));

  const search = admin ? (
    <View style={[styles.search, isMobile && styles.searchMobile, searchFocused && styles.searchFocused, searchFocused && focusRing]}>
      <Icon name="search" size={16} color={colors.textFaint} />
      <TextInput
        testID="member-search"
        accessibilityLabel="Rechercher par nom ou e-mail"
        placeholder="Rechercher par nom ou e-mail"
        placeholderTextColor={colors.textFaint}
        value={query}
        onChangeText={setQuery}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
        style={styles.searchInput}
        autoCapitalize="none"
      />
    </View>
  ) : null;

  const memberCount = members?.length;
  const demoMembers = (
    <Card testID="members-section" style={styles.membersCard}>
      <CardHeader title="Membres" count={filtered?.length ?? 0} />
      <View style={styles.memberList}>
        {members === null && !error ? <LoadingSkeleton /> : filtered?.length ? filtered.map((member, index) => (
          <View key={member.user_id} testID={`member-${member.user_id}`} style={[styles.memberRow, index > 0 && styles.memberRowBorder]}>
            <Avatar label={member.display_name} size={32} round />
            <View style={styles.memberMain}>
              <Text style={styles.memberName}>{member.display_name}</Text>
              <Text style={styles.memberMeta}>{member.email}</Text>
            </View>
            <Badge tone={member.active ? "ok" : "neutral"} dot label={member.active ? "Actif" : "Désactivé"} />
            {member.user_id !== userId && (
              <Button testID={`toggle-member-${member.user_id}`} disabled={busy} variant={member.active ? "danger" : "secondary"} label={member.active ? "Désactiver" : "Réactiver"} onPress={() => void toggle(member)} />
            )}
          </View>
        )) : <Text testID="members-empty" style={styles.empty}>Aucun membre trouvé.</Text>}
      </View>
    </Card>
  );

  return (
    <ScrollView testID={admin ? "administration-screen" : "profile-screen"} style={styles.scroll} contentContainerStyle={[styles.page, isMobile && styles.pageMobile]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={[styles.title, isMobile && styles.titleMobile]}>{admin ? "Administration" : "Mon profil"}</Text>
          <Text style={styles.subtitle}>{admin ? "Droits annuels, membres et équipes de l’organisation" : "Informations visibles par vos collègues"}</Text>
        </View>
        {search}
      </View>

      {demo && (
        <View style={[styles.banner, styles.bannerInfo]}>
          <Icon name="info" size={16} color={colors.ctaText} />
          <Text testID="demo-banner" style={[styles.bannerText, { color: colors.ctaText }]}>Démonstration locale : membres fictifs, modifications temporaires sans effet sur les comptes réels.</Text>
        </View>
      )}
      {error ? (
        <View testID="company-error" style={[styles.banner, styles.bannerError]}>
          <Icon name="alert" size={16} color={colors.danger} />
          <Text style={[styles.bannerText, { color: colors.danger }]}>{error}</Text>
          {admin && <Button size="sm" label="Réessayer" onPress={() => void load()} />}
        </View>
      ) : null}
      {notice ? (
        <View style={[styles.banner, styles.bannerOk]}>
          <Icon name="check" size={16} color={colors.positive} />
          <Text testID="company-notice" style={[styles.bannerText, { color: colors.positive }]}>{notice}</Text>
        </View>
      ) : null}

      {!admin ? (
        <Card style={styles.profileCard}>
          <View style={styles.profileHead}>
            <Avatar label={name || account.display_name} size={48} round />
            <View>
              <Text style={styles.profileName}>{account.display_name}</Text>
              <Text style={styles.memberMeta}>{account.is_admin ? "Administrateur" : "Membre"}</Text>
            </View>
          </View>
          <Text style={styles.label}>Nom d’affichage</Text>
          <TextInput
            testID="display-name-input"
            value={name}
            onChangeText={setName}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            style={[styles.input, nameFocused && styles.inputFocused, nameFocused && focusRing]}
            maxLength={100}
          />
          <Text style={styles.help}>Ce nom apparaît dans le calendrier des congés d’équipe.</Text>
          <Button testID="save-display-name" variant="primary" disabled={busy} label="Enregistrer" onPress={() => void submit()} />
        </Card>
      ) : (
        <>
          <View style={styles.tabs} accessibilityRole="tablist">
            {([["annual", "Droits annuels", undefined], ["members", "Membres & équipes", memberCount]] as const).map(([key, label, count]) => {
              const active = tab === key;
              return (
                <Pressable key={key} testID={`admin-tab-${key}`} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => selectTab(key)} style={[styles.tab, cursorPointer]}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
                  {count !== undefined ? <View style={styles.tabCount}><Text style={styles.tabCountText}>{count}</Text></View> : null}
                  {active ? <View style={styles.tabIndicator} /> : null}
                </Pressable>
              );
            })}
          </View>
          {/* Les deux onglets restent montés : l'année en cours de saisie n'est pas perdue. */}
          <View style={tab !== "annual" && styles.hidden}>
            <AnnualEntitlements demo={demo} query={query} />
          </View>
          <View style={tab !== "members" && styles.hidden}>
            {demo ? demoMembers : (
              <Teams members={filtered ?? null} allMembers={members ?? []} userId={userId} memberBusy={busy} memberError={!!error} onToggle={member => void toggle(member)} />
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.canvas },
  hidden: { display: "none" },
  centered: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
  page: { flexGrow: 1, width: "100%", maxWidth: 1600, alignSelf: "center", paddingVertical: 28, paddingHorizontal: 32, gap: 16 },
  pageMobile: { paddingVertical: 16, paddingHorizontal: 16, gap: 12 },
  head: { flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 4 },
  headText: { flex: 1, minWidth: 220 },
  title: { fontFamily: fonts.base, fontSize: 26, fontWeight: "700", letterSpacing: -0.4, color: colors.textPrimary },
  titleMobile: { fontSize: 22 },
  subtitle: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, width: 320, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: shape.control, paddingLeft: 12, backgroundColor: colors.panel },
  searchMobile: { width: "100%" },
  searchFocused: { borderColor: colors.primary },
  searchInput: { flex: 1, minHeight: 42, fontFamily: fonts.base, fontSize: 14, color: colors.textPrimary, paddingRight: 12, ...({ outlineStyle: "none" } as object) },
  banner: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: shape.row, borderWidth: 1 },
  bannerInfo: { backgroundColor: colors.ctaSoft, borderColor: "#F8D5BF" },
  bannerError: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder },
  bannerOk: { backgroundColor: colors.positiveSoft, borderColor: colors.positiveBorder },
  bannerText: { flex: 1, minWidth: 160, fontFamily: fonts.base, fontSize: 13.5, fontWeight: "600" },
  tabs: { flexDirection: "row", gap: 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, minHeight: 44, position: "relative" },
  tabText: { fontFamily: fonts.base, fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: colors.textPrimary },
  tabCount: { backgroundColor: colors.divider, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  tabCountText: { fontFamily: fonts.base, fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  tabIndicator: { position: "absolute", left: 10, right: 10, bottom: -1, height: 2, borderRadius: 2, backgroundColor: colors.cta },
  profileCard: { padding: 24, gap: 10, maxWidth: 640 },
  profileHead: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8 },
  profileName: { fontFamily: fonts.base, fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  label: { fontFamily: fonts.base, fontSize: 12.5, fontWeight: "600", color: colors.textSecondary },
  help: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary, marginBottom: 6 },
  input: { fontFamily: fonts.base, fontSize: 15, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: shape.control, paddingHorizontal: 12, backgroundColor: colors.panel, color: colors.textPrimary },
  inputFocused: { borderColor: colors.primary },
  membersCard: { padding: 18 },
  memberList: { marginTop: 8 },
  memberRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, paddingVertical: 10 },
  memberRowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  memberMain: { flex: 1, minWidth: 160 },
  memberName: { fontFamily: fonts.base, fontSize: 14.5, fontWeight: "600", color: colors.textPrimary },
  memberMeta: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary },
  empty: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingVertical: 20, borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderDashed, borderRadius: shape.row, marginTop: 8 },
  deniedCard: { padding: 28, gap: 10, alignItems: "center", maxWidth: 420, width: "100%" },
  deniedTitle: { fontFamily: fonts.base, fontSize: 18, fontWeight: "700", color: colors.danger },
  deniedText: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary, textAlign: "center" },
  centerButton: { alignSelf: "center", marginTop: 6 },
});
