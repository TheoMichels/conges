import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, glassStyle, radius, spacing } from "../theme/colors";
import { restoreLegacyStorage } from "../storage/legacyQuarantine";

type Props = { onDone: () => void };
export function LegacyRecovery({ onDone }: Props) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const recover = async () => {
    try { setBusy(true); setError(""); await restoreLegacyStorage(); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : "Impossible de récupérer les données."); }
    finally { setBusy(false); }
  };
  return <View style={styles.page} testID="legacy-recovery-screen"><View style={styles.card}>
    <Text style={styles.title}>Données anciennes conservées</Text>
    <Text style={styles.text}>Des données existent sur cet appareil. Leur provenance est inconnue : elles peuvent appartenir à un ancien compte connecté.</Text>
    <Text style={styles.text}>Ne les récupérez que si vous êtes autorisé à les consulter. Elles seront visibles dans cet espace local, sans être associées à un compte.</Text>
    {error ? <Text testID="legacy-recovery-error" style={styles.error}>{error}</Text> : null}
    <Pressable testID="legacy-recover-button" accessibilityRole="button" disabled={busy} onPress={() => void recover()} style={styles.button}><Text>Je comprends, récupérer les données</Text></Pressable>
    <Pressable testID="legacy-skip-button" accessibilityRole="button" disabled={busy} onPress={onDone} style={styles.button}><Text>Continuer sans récupérer</Text></Pressable>
  </View></View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: "center", alignItems: "center" },
  card: { ...glassStyle, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg, maxWidth: 560, width: "100%" },
  title: { fontFamily: fonts.base, fontSize: 24, color: colors.brand },
  text: { color: colors.textPrimary, lineHeight: 22 },
  error: { color: colors.danger },
  button: { minHeight: 44, justifyContent: "center", alignItems: "center", padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surfaceActive },
});
