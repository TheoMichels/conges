import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
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
import { Header } from "./src/components/Header";
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
import { colors, fonts, gradient, pearlBackground, radius, shadows, spacing } from "./src/theme/colors";
import { cursorPointer } from "./src/theme/webCursor";
import {
  calculatePlanRemaining,
  calculatePlanTaken,
  calculatePlanHolidays,
  calculatePlanBudget,
  findPreviousYearPlan,
} from "./src/utils/yearPlanUtils";

// Matches Sidebar's own width (220) + marginRight (20).
const SIDEBAR_TOTAL_WIDTH = 240;

interface MainAppProps {
  user?: User | null;
  onSignOut?: () => void;
  onProfile?: () => void;
  onAdmin?: () => void;
}

function MainApp({ user, onSignOut, onProfile, onAdmin }: MainAppProps) {
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

  useEffect(() => {
    if (!selectedId && plans.length > 0) {
      const currentYear = new Date().getFullYear().toString();
      const currentPlan = plans.find((p) => p.year === currentYear);
      setSelectedId(currentPlan ? currentPlan.id : plans[0].id);
    }
  }, [plans, selectedId]);

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

  const previousPlan = selectedPlan ? findPreviousYearPlan(plans, selectedPlan) : undefined;
  const totalPlanned = selectedPlan ? calculatePlanTaken(selectedPlan) : 0;
  const remaining = selectedPlan ? calculatePlanRemaining(selectedPlan) : 0;
  const totalEntitlement = selectedPlan ? calculatePlanBudget(selectedPlan) : 0;

  return (
    <LinearGradient
      colors={gradient.colors}
      locations={gradient.locations}
      start={gradient.start}
      end={gradient.end}
      style={styles.root}
    >
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.pageContent, isMobile && styles.pageContentMobile]}>
            <Header
              isMobile={isMobile}
              user={user}
              onSignOut={onSignOut}
              onProfile={onProfile}
              onAdmin={onAdmin}
            />

            {isMobile && (
              <YearSelectorMobile
                plans={plans}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAdd={handleAddYear}
              />
            )}

            <View style={styles.layout}>
              {!isMobile && (
                <View style={styles.sidebarWrapper}>
                  <Sidebar
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
                    >
                      <Text style={styles.errorBannerClose}>✕</Text>
                    </Pressable>
                  </View>
                )}

                {error ? (
                  <View testID="error-state" style={styles.stateContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.retryButton, cursorPointer]}
                      onPress={retry}
                    >
                      <Text style={styles.retryText}>Réessayer</Text>
                    </Pressable>
                  </View>
                ) : loading ? (
                  <View testID="loading-state" style={styles.stateContainer}>
                    <LoadingSkeleton />
                  </View>
                ) : !selectedPlan || plans.length === 0 ? (
                  <View testID="empty-state" style={styles.stateContainer}>
                    <Text style={styles.empty}>Aucune année de congés enregistrée.</Text>
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.retryButton, cursorPointer]}
                      onPress={() => handleAddYear(new Date().getFullYear().toString())}
                    >
                      <Text style={styles.retryText}>+ Créer une année</Text>
                    </Pressable>
                  </View>
                ) : (
                  <ScrollView
                    style={[styles.content, isMobile && styles.contentMobile]}
                    showsVerticalScrollIndicator={false}
                  >
                    {!isMobile && <Text style={styles.header}>Mes congés <Text style={styles.headerYear}>{selectedPlan.year}</Text></Text>}

                    <KpiCards
                      remaining={remaining}
                      taken={totalPlanned}
                      total={totalEntitlement}
                    />

                    {isMobile ? (
                      <MobileDashboard
                        year={selectedPlan.year}
                        workPercentage={selectedPlan.workPercentage}
                        onChangeWorkPercentage={(value) => handleUpdate({ workPercentage: value })}
                        initialLeave={selectedPlan.initialLeave}
                        carriedOver={selectedPlan.carriedOver}
                        csupp={selectedPlan.csupp}
                        publicHolidays={calculatePlanHolidays(selectedPlan)}
                        onChangeInitialLeave={(value) => handleUpdate({ initialLeave: value })}
                        onChangeCarriedOver={(value) => handleUpdate({ carriedOver: value })}
                        onChangeCsupp={(value) => handleUpdate({ csupp: value })}
                      />
                    ) : (
                      <SummaryFields
                        year={selectedPlan.year}
                        workPercentage={selectedPlan.workPercentage}
                        onChangeWorkPercentage={(value) => handleUpdate({ workPercentage: value })}
                        initialLeave={selectedPlan.initialLeave}
                        carriedOver={selectedPlan.carriedOver}
                        csupp={selectedPlan.csupp}
                        publicHolidays={calculatePlanHolidays(selectedPlan)}
                        taken={totalPlanned}
                        remaining={remaining}
                        previousYear={previousPlan?.year}
                        onChangeInitialLeave={(value) => handleUpdate({ initialLeave: value })}
                        onChangeCarriedOver={(value) => handleUpdate({ carriedOver: value })}
                        onChangeCsupp={(value) => handleUpdate({ csupp: value })}
                      />
                    )}

                    <LeaveEntries
                      year={selectedPlan.year}
                      entries={selectedPlan.entries}
                      onAdd={handleAddEntry}
                      onUpdate={handleUpdateEntry}
                      onRemove={handleRemoveEntry}
                    />
                  </ScrollView>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <StatusBar style="dark" />
    </LinearGradient>
  );
}

export default function App() {
  useEffect(() => {
    if (Platform.OS === "web") {
      document.documentElement.style.colorScheme = "only light";
      document.documentElement.style.backgroundColor = colors.background;
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
  const [screen, setScreen] = useState<"home" | "admin" | "profile">(() =>
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
  const navigate = (next: "home" | "admin" | "profile") => {
    setScreen(next);
    if (Platform.OS === "web") window.history.pushState({}, "", next === "admin" ? "/administration" : "/");
  };
  if (storageError) return <View style={styles.stateContainer} testID="storage-error"><Text>{storageError}</Text><Pressable onPress={() => setStorageAttempt(n => n + 1)} style={styles.retryButton}><Text>Réessayer</Text></Pressable></View>;
  if (!storageReady) return <LoadingScreen />;
  if (recoveryPending) return <LegacyRecovery onDone={() => setRecoveryPending(false)} />;
  if (!isLocalMode && (isLoading || isPulling || (user && !account && !accountError))) return <LoadingScreen />;
  if (!isLocalMode && !isAuthenticated) return <AuthScreen />;
  if (!isLocalMode && accountError) return <View style={styles.stateContainer} testID="account-error"><Text>{accountError}</Text><Pressable onPress={() => setAttempt(n => n + 1)} style={styles.retryButton}><Text>Réessayer</Text></Pressable><Pressable onPress={signOut} style={styles.retryButton}><Text>Se déconnecter</Text></Pressable></View>;
  if (!isLocalMode && user && account && screen !== "home") return <CompanyScreen account={account} userId={user.id} admin={screen === "admin"} onClose={() => navigate("home")} onName={name => setAccount({ ...account, display_name: name })} />;
  return <MainApp key={user?.id ?? "local"} user={user} onSignOut={signOut} onProfile={account ? () => navigate("profile") : undefined} onAdmin={account?.is_admin ? () => navigate("admin") : undefined} />;
}

const styles = StyleSheet.create({
  root: {
    ...pearlBackground,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
    padding: spacing.xl,
    width: "100%",
    alignSelf: "center",
  },
  pageContentMobile: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  layout: {
    flex: 1,
    flexDirection: "row",
  },
  mainArea: {
    flex: 1,
    flexDirection: "column",
  },
  sidebarWrapper: {
    width: SIDEBAR_TOTAL_WIDTH,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    padding: spacing.xl,
  },
  contentMobile: {
    padding: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  stateContainer: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
    ...shadows.sm,
  },
  header: {
    fontFamily: fonts.base,
    fontSize: 29,
    fontWeight: "400",
    marginBottom: spacing.lg,
    color: colors.brand,
    letterSpacing: -0.5,
  },
  headerYear: { color: colors.textSecondary, fontWeight: "400" },
  empty: {
    fontFamily: fonts.base,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 15,
  },
  errorText: {
    fontFamily: fonts.base,
    textAlign: "center",
    color: colors.danger,
    fontSize: 16,
    fontWeight: "500",
  },
  retryButton: {
    alignSelf: "center",
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceActive,
  },
  retryText: {
    fontFamily: fonts.base,
    color: colors.brand,
    fontWeight: "500",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    marginBottom: 16,
  },
  errorBannerText: {
    fontFamily: fonts.base,
    color: colors.danger,
    flex: 1,
    fontWeight: "500",
  },
  errorBannerClose: {
    fontFamily: fonts.base,
    color: colors.danger,
    fontWeight: "500",
    marginLeft: 12,
    padding: 4,
  },
});
