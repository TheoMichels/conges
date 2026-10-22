import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { isSupabaseConfigured } from "../config/supabase";
import { useAuth } from "../hooks/useAuth";
import { credentialsSchema } from "../services/authService";
import { colors, fonts, gradient, pearlBackground, radius, shadows, spacing } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { Logo } from "./Logo";

type AuthMode = "signin" | "signup";

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isConfigured = isSupabaseConfigured;

  const handleSubmit = async () => {
    if (!isConfigured) return;
    setClientError(null);
    setSuccessMessage(null);

    // Validation client Zod immédiate sans appel réseau
    const validation = credentialsSchema.safeParse({ email, password });
    if (!validation.success) {
      setClientError(validation.error.issues[0]?.message ?? "Identifiants invalides.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signin") {
        const res = await signIn({ email, password });
        if (res.error) {
          setClientError(res.error.message);
        }
      } else {
        const res = await signUp({ email, password });
        if (res.error) {
          setClientError(res.error.message);
        } else if (!res.session && res.user) {
          setSuccessMessage(
            "Compte créé avec succès ! Veuillez vérifier vos e-mails pour confirmer votre inscription.",
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "signin" ? "signup" : "signin"));
    setClientError(null);
    setSuccessMessage(null);
  };

  return (
    <LinearGradient
      colors={gradient.colors}
      locations={gradient.locations}
      start={gradient.start}
      end={gradient.end}
      style={styles.root}
      testID="auth-screen"
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card} testID="auth-card">
          <View style={styles.header}>
            <Logo size={48} />
            <Text style={styles.brandTitle}>Holy</Text>
            <Text style={styles.subtitle} testID="auth-title">
              {mode === "signin" ? "Connexion à votre espace" : "Créer un nouveau compte"}
            </Text>
          </View>

          {!isConfigured && (
            <View style={styles.warningBanner} testID="auth-unconfigured-banner">
              <Text style={styles.warningBannerTitle}>Configuration Supabase requise</Text>
              <Text style={styles.warningBannerText}>
                {"Les clés de connexion Supabase sont manquantes ou incomplètes dans l'environnement."}
              </Text>
            </View>
          )}

          {clientError && (
            <View style={styles.errorBanner} testID="auth-error-banner">
              <Text style={styles.errorBannerText}>{clientError}</Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.successBanner} testID="auth-success-banner">
              <Text style={styles.successBannerText}>{successMessage}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Adresse e-mail</Text>
              <TextInput
                testID="auth-email-input"
                style={[styles.input, !isConfigured && styles.inputDisabled]}
                placeholder="nom@exemple.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                editable={isConfigured && !isSubmitting}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                testID="auth-password-input"
                style={[styles.input, !isConfigured && styles.inputDisabled]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                editable={isConfigured && !isSubmitting}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <Pressable
              testID="auth-submit-button"
              accessibilityRole="button"
              accessibilityLabel={mode === "signin" ? "Se connecter" : "S'inscrire"}
              disabled={!isConfigured || isSubmitting}
              style={[
                styles.submitButton,
                (!isConfigured || isSubmitting) && styles.submitButtonDisabled,
                isConfigured && !isSubmitting && cursorPointer,
              ]}
              onPress={handleSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textOnBrand} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === "signin" ? "Se connecter" : "Créer mon compte"}
                </Text>
              )}
            </Pressable>

            <Pressable
              testID="auth-mode-toggle"
              accessibilityRole="button"
              disabled={isSubmitting}
              style={[styles.toggleButton, cursorPointer]}
              onPress={toggleMode}
            >
              <Text style={styles.toggleButtonText}>
                {mode === "signin"
                  ? "Pas encore de compte ? S'inscrire"
                  : "Déjà un compte ? Se connecter"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    ...pearlBackground,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  keyboardContainer: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  card: {
    width: "100%",
    backgroundColor: colors.panel,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...shadows.md,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  brandTitle: {
    fontFamily: fonts.base,
    fontSize: 24,
    fontWeight: "400",
    color: colors.brand,
    marginTop: spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.base,
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontWeight: "500",
  },
  warningBanner: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  warningBannerTitle: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "500",
    color: colors.brand,
    marginBottom: spacing.xs,
  },
  warningBannerText: {
    fontFamily: fonts.base,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorBannerText: {
    fontFamily: fonts.base,
    fontSize: 14,
    color: colors.danger,
    fontWeight: "500",
  },
  successBanner: {
    backgroundColor: colors.positiveSoft,
    borderWidth: 1,
    borderColor: colors.positive,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  successBannerText: {
    fontFamily: fonts.base,
    fontSize: 14,
    color: colors.positive,
    fontWeight: "500",
  },
  form: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.base,
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  input: {
    fontFamily: fonts.base,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceActive,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  inputDisabled: {
    backgroundColor: colors.surface,
    color: colors.textMuted,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
    ...shadows.sm,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: fonts.base,
    fontSize: 15,
    fontWeight: "500",
    color: colors.textOnBrand,
  },
  toggleButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  toggleButtonText: {
    fontFamily: fonts.base,
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
});
