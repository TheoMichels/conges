import { Pressable, StyleSheet, Text, View } from "react-native";
import type { User } from "@supabase/supabase-js";
import { Logo } from "./Logo";
import { colors, fonts, glassStyle, radius, shadows, spacing } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";

type Props = {
  isMobile: boolean;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  storageModeLabel?: string;
  user?: User | null;
  onSignOut?: () => void;
};

export function Header({
  isMobile,
  sidebarOpen = true,
  onToggleSidebar,
  storageModeLabel = "Stockage local",
  user,
  onSignOut,
}: Props) {
  return (
    <View
      testID="app-header"
      style={[styles.container, isMobile && styles.containerMobile]}
    >
      <View style={styles.left}>
        {!isMobile && onToggleSidebar && (
          <Pressable
            testID="sidebar-toggle"
            accessibilityLabel={sidebarOpen ? "Masquer le menu" : "Afficher le menu"}
            accessibilityRole="button"
            style={[styles.sidebarToggle, cursorPointer]}
            onPress={onToggleSidebar}
            hitSlop={4}
          >
            <Text style={styles.sidebarToggleIcon}>☰</Text>
          </Pressable>
        )}
        <View style={styles.brand}>
          <Logo size={isMobile ? 28 : 34} />
          <Text style={[styles.brandTitle, isMobile && styles.brandTitleMobile]}>
            Holy
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        {user ? (
          <View style={styles.authArea}>
            <View testID="user-badge" style={styles.badge}>
              <Text style={styles.badgeText}>🟢 {user.email}</Text>
            </View>
            {onSignOut && (
              <Pressable
                testID="sign-out-button"
                accessibilityLabel="Se déconnecter"
                accessibilityRole="button"
                style={[styles.signOutButton, cursorPointer]}
                onPress={onSignOut}
              >
                <Text style={styles.signOutText}>
                  {isMobile ? "Quitter" : "Se déconnecter"}
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View testID="local-badge" style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{storageModeLabel}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
    ...glassStyle,
    ...shadows.sm,
  },
  containerMobile: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.md,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
  authArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sidebarToggle: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceActive,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarToggleIcon: {
    fontFamily: fonts.base,
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandTitle: {
    fontFamily: fonts.base,
    fontSize: 22,
    fontWeight: "700",
    color: colors.brand,
    letterSpacing: 0.2,
  },
  brandTitleMobile: {
    fontSize: 18,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    minHeight: 28,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.positive,
    marginRight: 6,
  },
  badgeText: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceActive,
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  signOutText: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "600",
    color: colors.brand,
  },
});
