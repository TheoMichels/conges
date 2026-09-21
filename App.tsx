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
} from "react-native";
import { useYearPlans } from "./src/hooks/useYearPlans";
import { Sidebar } from "./src/components/Sidebar";
import { SummaryFields } from "./src/components/SummaryFields";
import { LeaveEntries } from "./src/components/LeaveEntries";
import { Logo } from "./src/components/Logo";
import { colors, fonts, gradient } from "./src/theme/colors";
import { cursorPointer } from "./src/theme/webCursor";
import {
  calculatePlanRemaining,
  calculatePlanTaken,
  findPreviousYearPlan,
} from "./src/utils/yearPlanUtils";

// Matches Sidebar's own width (220) + marginRight (20).
const SIDEBAR_TOTAL_WIDTH = 240;

export default function App() {
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
      setSelectedId(plans[0].id);
    }
  }, [plans, selectedId]);

  const [sidebarVisible, setSidebarVisible] = useState(true);
  const sidebarAnim = useRef(new Animated.Value(1)).current;

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
        const remaining = plans.filter((p) => p.id !== id);
        setSelectedId(remaining[0]?.id);
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
          <View style={styles.pageContent}>
            <View style={styles.topBar}>
              <Pressable
                style={[styles.sidebarToggle, cursorPointer]}
                onPress={() => setSidebarVisible((v) => !v)}
                hitSlop={8}
              >
                <Text style={styles.sidebarToggleIcon}>☰</Text>
              </Pressable>

              <View style={styles.brand}>
                <Logo size={44} />
                <Text style={styles.brandTitle}>Mes congés</Text>
              </View>

              <View style={styles.topBarSpacer} />
            </View>

            <View style={styles.layout}>
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

              <View style={styles.mainArea}>
                {actionError && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{actionError}</Text>
                    <Pressable onPress={() => setActionError(null)} hitSlop={8}>
                      <Text style={styles.errorBannerClose}>✕</Text>
                    </Pressable>
                  </View>
                )}

                {error ? (
                  <View style={styles.content}>
                    <Text style={styles.empty}>{error}</Text>
                    <Pressable style={[styles.retryButton, cursorPointer]} onPress={retry}>
                      <Text style={styles.retryText}>Réessayer</Text>
                    </Pressable>
                  </View>
                ) : loading || !selectedPlan ? (
                  <View style={styles.content}>
                    <Text style={styles.empty}>Chargement...</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={styles.header}>{selectedPlan.year}</Text>

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
    padding: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  brand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  brandTitle: {
    fontFamily: fonts.base,
    fontSize: 26,
    fontWeight: "700",
    color: colors.brand,
    letterSpacing: 0.2,
  },
  topBarSpacer: {
    width: 36,
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
    borderRadius: 14,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  sidebarToggle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarToggleIcon: {
    fontFamily: fonts.base,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    fontFamily: fonts.base,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    color: colors.brand,
  },
  empty: {
    fontFamily: fonts.base,
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 40,
  },
  retryButton: {
    alignSelf: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  retryText: {
    fontFamily: fonts.base,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FBEDEB",
    borderWidth: 1,
    borderColor: "#E9C4BF",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    fontFamily: fonts.base,
    color: colors.danger,
    flex: 1,
  },
  errorBannerClose: {
    fontFamily: fonts.base,
    color: colors.danger,
    fontWeight: "700",
    marginLeft: 12,
  },
});
