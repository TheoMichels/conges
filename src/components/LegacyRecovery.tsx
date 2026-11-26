import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, shadows, shape, spacing } from "../theme/colors";
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
    <Pressable testID="legacy-recover-button" accessibilityRole="button" disabled={busy} onPress={() => void recover()} style={[styles.button, styles.primaryButton, busy && styles.disabled]}><Text style={styles.primaryButtonText}>Je comprends, récupérer les données</Text></Pressable>
    <Pressable testID="legacy-skip-button" accessibilityRole="button" disabled={busy} onPress={onDone} style={[styles.button, busy && styles.disabled]}><Text style={styles.buttonText}>Continuer sans récupérer</Text></Pressable>
  </View></View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: "center", alignItems: "center" },
  card: { borderRadius: shape.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, padding: 32, gap: spacing.lg, maxWidth: 560, width: "100%", ...shadows.md },
  title: { fontFamily: fonts.base, fontSize: 24, fontWeight: "700", letterSpacing: -0.3, color: colors.textPrimary },
  text: { fontFamily: fonts.base, fontSize: 15, color: colors.textBody, lineHeight: 23 },
  error: { fontFamily: fonts.base, fontSize: 14, fontWeight: "600", color: colors.danger },
  button: { minHeight: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  buttonText: { fontFamily: fonts.base, fontSize: 14, color: colors.textPrimary },
  primaryButton: { backgroundColor: colors.cta, borderColor: colors.cta },
  primaryButtonText: { fontFamily: fonts.base, fontSize: 14, fontWeight: "600", color: colors.textOnBrand },
  disabled: { opacity: 0.5 },
});
