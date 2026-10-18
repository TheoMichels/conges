import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, gradient, spacing } from "../theme/colors";

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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Chargement en cours...</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  text: {
    fontFamily: fonts.base,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
