import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import {
  Animated,
  Easing,
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
import { useYearPlans } from "./src/hooks/useYearPlans";
import { Header } from "./src/components/Header";
import { KpiCards } from "./src/components/KpiCards";
import { Sidebar } from "./src/components/Sidebar";
import { SummaryFields } from "./src/components/SummaryFields";
import { LeaveEntries } from "./src/components/LeaveEntries";
import { MobileDashboard } from "./src/components/MobileDashboard";
import { YearSelectorMobile } from "./src/components/YearSelectorMobile";
import { colors, fonts, gradient, radius, shadows, spacing } from "./src/theme/colors";
import { cursorPointer } from "./src/theme/webCursor";
import {
  calculatePlanRemaining,
  calculatePlanTaken,
  findPreviousYearPlan,
} from "./src/utils/yearPlanUtils";

// Matches Sidebar's own width (220) + marginRight (20).
const SIDEBAR_TOTAL_WIDTH = 240;

export default function App() {
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

  const [sidebarVisible, setSidebarVisible] = useState(!isMobile);
  const sidebarAnim = useRef(new Animated.Value(!isMobile ? 1 : 0)).current;

  useEffect(() => {
    setSidebarVisible(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    Animated.timing(sidebarAnim, {
      toValue: sidebarVisible ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [sidebarVisible, sidebarAnim]);

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
  const totalEntitlement = selectedPlan
    ? selectedPlan.initialLeave +
      selectedPlan.carriedOver +
      selectedPlan.csupp +
      selectedPlan.publicHolidays
    : 0;

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
              sidebarOpen={sidebarVisible}
              onToggleSidebar={() => setSidebarVisible((v) => !v)}
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
                <Animated.View
                  style={[
                    styles.sidebarWrapper,
                    {
                      width: sidebarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, SIDEBAR_TOTAL_WIDTH],
                      }),
                      opacity: sidebarAnim,
                    },
                  ]}
                >
                  <Sidebar
                    plans={plans}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onAdd={handleAddYear}
                    onRename={handleRenameYear}
                    onDelete={handleRemoveYear}
                  />
                </Animated.View>
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
                    <Text style={styles.empty}>Chargement...</Text>
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
                    {!isMobile && <Text style={styles.header}>{selectedPlan.year}</Text>}

                    <KpiCards
                      remaining={remaining}
                      taken={totalPlanned}
                      total={totalEntitlement}
                    />

                    {isMobile ? (
                      <MobileDashboard
                        year={selectedPlan.year}
                        initialLeave={selectedPlan.initialLeave}
                        carriedOver={selectedPlan.carriedOver}
                        csupp={selectedPlan.csupp}
                        publicHolidays={selectedPlan.publicHolidays}
                        taken={totalPlanned}
                        remaining={remaining}
                        onChangeInitialLeave={(value) => handleUpdate({ initialLeave: value })}
                        onChangeCarriedOver={(value) => handleUpdate({ carriedOver: value })}
                        onChangeCsupp={(value) => handleUpdate({ csupp: value })}
                      />
                    ) : (
                      <SummaryFields
                        year={selectedPlan.year}
                        initialLeave={selectedPlan.initialLeave}
                        carriedOver={selectedPlan.carriedOver}
                        csupp={selectedPlan.csupp}
                        publicHolidays={selectedPlan.publicHolidays}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
    padding: spacing.xl,
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
    overflow: "hidden",
  },
  content: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...shadows.sm,
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
    fontSize: 26,
    fontWeight: "800",
    marginBottom: spacing.lg,
    color: colors.brand,
    letterSpacing: -0.5,
  },
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
    fontWeight: "600",
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
    fontWeight: "700",
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
    fontWeight: "600",
  },
  errorBannerClose: {
    fontFamily: fonts.base,
    color: colors.danger,
    fontWeight: "700",
    marginLeft: 12,
    padding: 4,
  },
});
