import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, gradient, pearlBackground, shadows, shape, spacing } from "../theme/colors";

export function LoadingSkeleton() {
  return <View testID="loading-skeleton" style={styles.skeletonGroup}>
    <View style={styles.skeletonTitle} />
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonCard} /><View style={styles.skeletonCard} /><View style={styles.skeletonCard} />
    </View>
    <View style={styles.skeletonPanel} />
  </View>;
}

export function LoadingScreen() {
  return (
    <LinearGradient
      colors={gradient.colors}
      locations={gradient.locations}
      start={gradient.start}
      end={gradient.end}
      style={styles.container}
      testID="loading-screen"
    >
      <View style={styles.card}>
        <LoadingSkeleton />
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.text}>Chargement en cours...</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    ...pearlBackground,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  skeletonGroup: { width: "100%", maxWidth: 520, gap: spacing.lg },
  skeletonTitle: { width: "45%", height: 22, borderRadius: 8, backgroundColor: colors.divider },
  skeletonRow: { flexDirection: "row", gap: spacing.md },
  skeletonCard: { flex: 1, height: 90, borderRadius: shape.card, backgroundColor: colors.panelSubtle, borderWidth: 1, borderColor: colors.border },
  skeletonPanel: { height: 120, borderRadius: shape.card, backgroundColor: colors.panelSubtle, borderWidth: 1, borderColor: colors.border },
  card: {
    width: "100%",
    maxWidth: 580,
    padding: 28,
    backgroundColor: colors.panel,
    borderRadius: shape.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  text: {
    fontFamily: fonts.base,
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
