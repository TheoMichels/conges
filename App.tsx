import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import type { User } from "@supabase/supabase-js";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { isLocalMode } from "./src/config/storageMode";
import { useAuth } from "./src/hooks/useAuth";
import { pullFromCloud } from "./src/services/syncService";
import { useYearPlans } from "./src/hooks/useYearPlans";
import { AuthScreen } from "./src/components/AuthScreen";
import { LoadingScreen, LoadingSkeleton } from "./src/components/LoadingScreen";
import { AppSection, Header, NavProps, TabBar } from "./src/components/Header";
import { SharedCalendar } from "./src/components/SharedCalendar";
import { CompanyScreen } from "./src/components/CompanyScreen";
import { LegacyRecovery } from "./src/components/LegacyRecovery";
import { getLegacyQuarantine, migrateLegacyStorage } from "./src/storage/legacyQuarantine";
import { Account, registerMember } from "./src/storage/memberRepository";
import { KpiCards } from "./src/components/KpiCards";
import { Sidebar } from "./src/components/Sidebar";
import { SummaryFields } from "./src/components/SummaryFields";
import { LeaveEntries } from "./src/components/LeaveEntries";
import { MobileDashboard } from "./src/components/MobileDashboard";
import { YearSelectorMobile } from "./src/components/YearSelectorMobile";
import { Button } from "./src/components/ui/Button";
import { Icon } from "./src/components/ui/Icon";
import { colors, fonts, shadows, shape, spacing, webOnly } from "./src/theme/colors";
import { cursorPointer } from "./src/theme/webCursor";
import {
  calculatePlanRemaining,
  calculatePlanTaken,
  calculatePlanHolidays,
  calculatePlanBudget,
  findPreviousYearPlan,
} from "./src/utils/yearPlanUtils";
import { monthlyDays, plannedDays } from "./src/utils/leaveStats";

const SIDEBAR_WIDTH = 240;

type ShellProps = NavProps & {
  user?: User | null;
  displayName?: string;
  onSignOut?: () => void;
  children: ReactNode;
};

// Coquille commune : en-tête persistant sur toutes les pages, barre d'onglets en mobile.
function AppShell({ user, displayName, onSignOut, children, ...nav }: ShellProps) {
  const isMobile = useWindowDimensions().width < 768;
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Header isMobile={isMobile} user={user} displayName={displayName} onSignOut={onSignOut} {...nav} />
          <View style={styles.flex}>{children}</View>
          {isMobile && <TabBar {...nav} />}
        </KeyboardAvoidingView>
      </SafeAreaView>
      <StatusBar style="dark" />
    </View>
  );
}

function MainApp() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const {
    plans,
    loading,
    error,
    retry,
    addYear,
    renameYear,
    removeYear,
    updatePlan,
    addEntry,
    updateEntry,
    removeEntry,
  } = useYearPlans();
  const [selectedId, setSelectedId] = useState<string>();
  const [isAdding, setIsAdding] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const listY = useRef(0);

  useEffect(() => {
    if (!selectedId && plans.length > 0) {
      const currentYear = new Date().getFullYear().toString();
      const currentPlan = plans.find((p) => p.year === currentYear);
      setSelectedId(currentPlan ? currentPlan.id : plans[0].id);
    }
  }, [plans, selectedId]);

  useEffect(() => { setIsAdding(false); }, [selectedId]);

  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = useCallback(async (action: () => void | Promise<void>) => {
    try {
      setActionError(null);
      await action();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Une erreur est survenue.");
    }
  }, []);

  const handleAddYear = (year: string) =>
    runAction(async () => {
      const plan = await addYear(year);
      if (plan) setSelectedId(plan.id);
    });

  const handleRenameYear = (id: string, year: string) =>
    runAction(() => renameYear(id, year));

  const handleRemoveYear = (id: string) =>
    runAction(async () => {
      if (plans.length <= 1) {
        throw new Error("Vous devez conserver au moins une année.");
      }
      removeYear(id);
      if (id === selectedId) {
        const remainingPlans = plans.filter((p) => p.id !== id);
        setSelectedId(remainingPlans[0]?.id);
      }
    });

  const selectedPlan = plans.find((p) => p.id === selectedId);

  const handleUpdate = (patch: Parameters<typeof updatePlan>[1]) => {
    if (!selectedPlan) return;
    runAction(() => updatePlan(selectedPlan.id, patch));
  };

  const handleAddEntry = (draft: Parameters<typeof addEntry>[1]) => {
    if (!selectedPlan) return;
    runAction(() => addEntry(selectedPlan.id, draft));
  };

  const handleUpdateEntry = (entryId: string, draft: Parameters<typeof addEntry>[1]) => {
    if (!selectedPlan) return;
    runAction(() => updateEntry(selectedPlan.id, entryId, draft));
  };

  const handleRemoveEntry = (entryId: string) => {
    if (!selectedPlan) return;
    runAction(() => removeEntry(selectedPlan.id, entryId));
  };

  const startAdding = () => {
    setIsAdding(true);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, listY.current - 12), animated: true }));
  };

  const previousPlan = selectedPlan ? findPreviousYearPlan(plans, selectedPlan) : undefined;
  const totalPlanned = selectedPlan ? calculatePlanTaken(selectedPlan) : 0;
  const remaining = selectedPlan ? calculatePlanRemaining(selectedPlan) : 0;
  const totalEntitlement = selectedPlan ? calculatePlanBudget(selectedPlan) : 0;
  const upcoming = selectedPlan ? plannedDays(selectedPlan.entries, selectedPlan.year) : 0;
  const isCurrentYear = selectedPlan?.year === String(new Date().getFullYear());

  const addButton = (
    <Button
      testID="add-leave-button"
      variant="primary"
      icon="plus"
      label={isMobile ? "Ajouter" : "Ajouter un congé"}
      onPress={startAdding}
      style={isMobile ? [styles.fab, webOnly({ boxShadow: "0 8px 20px rgba(238, 106, 36, 0.35)" })] : undefined}
    />
  );

  return (
    <View style={styles.flex}>
      {isMobile && (
        <YearSelectorMobile
          readOnly={!isLocalMode}
          plans={plans}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={handleAddYear}
        />
      )}

      <View style={[styles.pageContent, isMobile && styles.pageContentMobile]}>
        <View style={styles.layout}>
          {!isMobile && (
            <View style={styles.sidebarWrapper}>
              <Sidebar
                readOnly={!isLocalMode}
                plans={plans}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAdd={handleAddYear}
                onRename={handleRenameYear}
                onDelete={handleRemoveYear}
              />
            </View>
          )}

          <View style={styles.mainArea}>
            {actionError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{actionError}</Text>
                <Pressable
                  accessibilityLabel="Fermer l'alerte"
                  accessibilityRole="button"
                  onPress={() => setActionError(null)}
                  hitSlop={8}
                  style={[styles.errorBannerClose, cursorPointer]}
                >
                  <Icon name="x" size={16} color={colors.danger} />
                </Pressable>
              </View>
            )}

            {error ? (
              <View testID="error-state" style={styles.stateContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Button label="Réessayer" onPress={retry} style={styles.stateButton} />
              </View>
            ) : loading ? (
              <View testID="loading-state" style={styles.stateContainer}>
                <LoadingSkeleton />
              </View>
            ) : !selectedPlan || plans.length === 0 ? (
              <View testID="empty-state" style={styles.stateContainer}>
                <Text style={styles.empty}>{isLocalMode ? "Aucune année de congés enregistrée." : "Aucune année de congés activée"}</Text>
                {!isLocalMode && <Text style={styles.emptyHint}>Votre administrateur doit activer l’année avant que vous puissiez poser des congés.</Text>}
                {isLocalMode && (
                  <Button
                    variant="primary"
                    label="+ Créer une année"
                    onPress={() => handleAddYear(new Date().getFullYear().toString())}
                    style={styles.stateButton}
                  />
                )}
              </View>
            ) : (
              <>
                <ScrollView
                  ref={scrollRef}
                  style={styles.content}
                  contentContainerStyle={[styles.contentInner, isMobile && styles.contentInnerMobile]}
                  showsVerticalScrollIndicator={false}
                >
                  {!isMobile && (
                    <View style={styles.titleRow}>
                      <View style={styles.titleBlock}>
                        <View style={styles.titleLine}>
                          <Text style={styles.header}>Mes congés</Text>
                          <Text style={styles.headerYear}>{selectedPlan.year}</Text>
                        </View>
                        <Text style={styles.subtitle}>
                          {isLocalMode ? "Données enregistrées sur cet appareil" : "Droits définis par l’administration"}
                        </Text>
                      </View>
                      {!isAdding && addButton}
                    </View>
                  )}

                  <View style={[styles.overview, isMobile && styles.overviewMobile]}>
                    <View style={!isMobile && styles.overviewMain}>
                      <KpiCards
                        remaining={remaining}
                        taken={totalPlanned}
                        total={totalEntitlement}
                        upcoming={upcoming}
                        months={isMobile ? undefined : monthlyDays(selectedPlan.entries, selectedPlan.year)}
                        currentMonth={isCurrentYear ? new Date().getMonth() : undefined}
                      />
                    </View>
                    {isMobile ? (
                      <MobileDashboard
                        readOnly={!isLocalMode}
                        year={selectedPlan.year}
                        initialLeave={selectedPlan.initialLeave}
                        carriedOver={selectedPlan.carriedOver}
                        csupp={selectedPlan.csupp}
                        holidayIsManual={selectedPlan.holidayOverride !== null}
                        publicHolidays={calculatePlanHolidays(selectedPlan)}
                        total={totalEntitlement}
                        previousYear={previousPlan?.year}
                        onChangeInitialLeave={(value) => handleUpdate({ initialLeave: value })}
                        onChangeCarriedOver={(value) => handleUpdate({ carriedOver: value })}
                        onChangeCsupp={(value) => handleUpdate({ csupp: value })}
                      />
                    ) : (
                      <View style={styles.overviewSide}>
                        <SummaryFields
                          readOnly={!isLocalMode}
                          year={selectedPlan.year}
                          initialLeave={selectedPlan.initialLeave}
                          carriedOver={selectedPlan.carriedOver}
                          csupp={selectedPlan.csupp}
                          holidayIsManual={selectedPlan.holidayOverride !== null}
                          publicHolidays={calculatePlanHolidays(selectedPlan)}
                          total={totalEntitlement}
                          previousYear={previousPlan?.year}
                          onChangeInitialLeave={(value) => handleUpdate({ initialLeave: value })}
                          onChangeCarriedOver={(value) => handleUpdate({ carriedOver: value })}
                          onChangeCsupp={(value) => handleUpdate({ csupp: value })}
                        />
                      </View>
                    )}
                  </View>

                  <View onLayout={(event) => { listY.current = event.nativeEvent.layout.y; }}>
                    <LeaveEntries
                      year={selectedPlan.year}
                      entries={selectedPlan.entries}
                      remaining={remaining}
                      isAdding={isAdding}
                      onCloseAdd={() => setIsAdding(false)}
                      onAdd={handleAddEntry}
                      onUpdate={handleUpdateEntry}
                      onRemove={handleRemoveEntry}
                    />
                  </View>
                </ScrollView>
                {isMobile && !isAdding && addButton}
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function App() {
  useEffect(() => {
    if (Platform.OS === "web") {
      document.documentElement.style.colorScheme = "only light";
      document.documentElement.style.backgroundColor = colors.canvas;
    }
  }, []);
  const { isAuthenticated, isLoading, user, signOut } = useAuth();
  const [storageReady, setStorageReady] = useState(false);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [storageAttempt, setStorageAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setStorageError("");
    void (async () => {
      try {
        await migrateLegacyStorage();
        const legacy = await getLegacyQuarantine();
        if (!cancelled) { setRecoveryPending(isLocalMode && !!legacy && !legacy.restored); setStorageReady(true); }
      } catch { if (!cancelled) setStorageError("Impossible de protéger les données anciennes. Réessayez."); }
    })();
    return () => { cancelled = true; };
  }, [storageAttempt]);
  const [account, setAccount] = useState<Account | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [screen, setScreen] = useState<AppSection>(() =>
    Platform.OS === "web" && window.location.pathname === "/administration" ? "admin" : "home"
  );
  useEffect(() => {
    if (!storageReady || isLocalMode || !user) { setAccount(null); setIsPulling(false); return; }
    let cancelled = false;
    setIsPulling(true);
    setAccount(null);
    setAccountError("");
    void (async () => {
      try {
        const current = await registerMember();
        if (!current.active) throw new Error("Votre compte Holy est désactivé.");
        await pullFromCloud(user.id);
        if (!cancelled) setAccount(current);
      } catch (e) {
        if (!cancelled) setAccountError(e instanceof Error ? e.message : "Impossible de vérifier votre compte.");
      } finally { if (!cancelled) setIsPulling(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.id, attempt, storageReady]);
  const navigate = (next: AppSection) => {
    setScreen(next);
    if (Platform.OS === "web") window.history.pushState({}, "", next === "admin" ? "/administration" : "/");
  };
  if (storageError) return <View style={styles.screenState}><View style={[styles.stateContainer, styles.stateCard]} testID="storage-error"><Text style={styles.errorText}>{storageError}</Text><Button label="Réessayer" onPress={() => setStorageAttempt(n => n + 1)} style={styles.stateButton} /></View></View>;
  if (!storageReady) return <LoadingScreen />;
  if (recoveryPending) return <LegacyRecovery onDone={() => setRecoveryPending(false)} />;
  if (!isLocalMode && (isLoading || isPulling || (user && !account && !accountError))) return <LoadingScreen />;
  if (!isLocalMode && !isAuthenticated) return <AuthScreen />;
  if (!isLocalMode && accountError) return <View style={styles.screenState}><View style={[styles.stateContainer, styles.stateCard]} testID="account-error"><Text style={styles.errorText}>{accountError}</Text><Button label="Réessayer" onPress={() => setAttempt(n => n + 1)} style={styles.stateButton} /><Button label="Se déconnecter" variant="ghost" onPress={signOut} style={styles.stateButton} /></View></View>;

  const nav: NavProps = {
    active: screen,
    onHome: () => navigate("home"),
    onSharedCalendar: account ? () => navigate("calendar") : undefined,
    onProfile: account ? () => navigate("profile") : undefined,
    onAdmin: isLocalMode || account?.is_admin ? () => navigate("admin") : undefined,
  };
  let content: ReactNode;
  if (isLocalMode && screen === "admin") content = <CompanyScreen account={{ active: true, is_admin: true, display_name: "Démonstration" }} userId="demo-admin" admin demo onClose={() => navigate("home")} />;
  else if (!isLocalMode && account && screen === "calendar") content = <SharedCalendar />;
  else if (!isLocalMode && user && account && screen !== "home") content = <CompanyScreen account={account} userId={user.id} admin={screen === "admin"} onClose={() => navigate("home")} onName={name => setAccount({ ...account, display_name: name })} />;
  else content = <MainApp key={user?.id ?? "local"} />;
  return (
    <AppShell {...nav} user={user} displayName={account?.display_name} onSignOut={isLocalMode ? undefined : signOut}>
      {content}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  pageContent: { flex: 1, paddingTop: 28, paddingHorizontal: 32, width: "100%", alignSelf: "center" },
  pageContentMobile: { paddingHorizontal: 16, paddingTop: 14 },
  layout: { flex: 1, flexDirection: "row" },
  mainArea: { flex: 1, flexDirection: "column", minWidth: 0 },
  sidebarWrapper: { width: SIDEBAR_WIDTH, marginRight: 32 },
  content: { flex: 1, backgroundColor: "transparent" },
  contentInner: { paddingBottom: 44 },
  contentInnerMobile: { paddingBottom: 96 },
  screenState: { flex: 1, padding: spacing.xl, justifyContent: "center", backgroundColor: colors.canvas },
  stateContainer: {
    flex: 1,
    borderRadius: shape.card,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
    gap: 8,
  },
  stateCard: { flex: 0, width: "100%", maxWidth: 560, alignSelf: "center", ...shadows.md },
  stateButton: { alignSelf: "center", marginTop: 8 },
  titleRow: { flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 22 },
  titleBlock: { flex: 1, minWidth: 240 },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  header: { fontFamily: fonts.base, fontSize: 26, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.4 },
  headerYear: {
    fontFamily: fonts.base,
    fontSize: 13,
    fontWeight: "700",
    color: colors.ctaText,
    backgroundColor: colors.ctaSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: shape.pill,
    overflow: "hidden",
  },
  subtitle: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  overview: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 20, marginBottom: 20 },
  overviewMobile: { flexDirection: "column", alignItems: "stretch", gap: 12, marginBottom: 12 },
  overviewMain: { flexGrow: 1.35, flexBasis: 420, minWidth: 0 },
  overviewSide: { flexGrow: 1, flexBasis: 320, minWidth: 0 },
  empty: { fontFamily: fonts.base, textAlign: "center", color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  emptyHint: { fontFamily: fonts.base, textAlign: "center", color: colors.textSecondary, fontSize: 14, maxWidth: 360 },
  errorText: { fontFamily: fonts.base, textAlign: "center", color: colors.danger, fontSize: 16, fontWeight: "600" },
  fab: { position: "absolute", right: 0, bottom: 16, minHeight: 50, borderRadius: 16, paddingHorizontal: 18, alignSelf: "auto" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: shape.row,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    marginBottom: 16,
  },
  errorBannerText: { fontFamily: fonts.base, color: colors.danger, flex: 1, fontWeight: "600" },
  errorBannerClose: { marginLeft: 12, padding: 4 },
});
