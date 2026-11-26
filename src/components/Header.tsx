import { Pressable, StyleSheet, Text, View } from "react-native";
import type { User } from "@supabase/supabase-js";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";
import { colors, fonts, shape } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";

type Props = {
  isMobile: boolean;
  storageModeLabel?: string;
  user?: User | null;
  onSignOut?: () => void;
  onProfile?: () => void;
  onAdmin?: () => void;
  onSharedCalendar?: () => void;
};

export function Header({
  isMobile,
  storageModeLabel = "Stockage local",
  user,
  onSignOut,
  onProfile,
  onAdmin,
  onSharedCalendar,
}: Props) {
  // Desktop : Profil / Administration deviennent des liens de navigation, « Mes congés » actif.
  const showNav = !isMobile && (!!onProfile || !!onAdmin);
  const linkStyle = isMobile ? [styles.ghostButton, styles.ghostButtonMobile] : styles.navLink;
  const linkTextStyle = isMobile ? [styles.ghostText, styles.ghostTextMobile] : styles.navText;

  const calendarLink = onSharedCalendar && <Pressable testID="shared-calendar-button" accessibilityRole="button" onPress={onSharedCalendar} style={[linkStyle, cursorPointer]}><Text style={linkTextStyle}>Congés d’équipe</Text></Pressable>;
  const profileLink = onProfile && (
    <Pressable testID="profile-button" accessibilityRole="button" onPress={onProfile} style={[linkStyle, cursorPointer]}>
      <Text style={linkTextStyle}>Profil</Text>
    </Pressable>
  );
  const adminLink = onAdmin && (
    <Pressable testID="admin-button" accessibilityRole="button" onPress={onAdmin} style={[linkStyle, cursorPointer]}>
      <Text style={linkTextStyle}>Administration</Text>
    </Pressable>
  );

  return (
    <View
      testID="app-header"
      style={[styles.container, isMobile && styles.containerMobile]}
    >
      <View style={styles.brand}>
        <Logo size={isMobile ? 28 : 34} />
        <Text style={[styles.brandTitle, isMobile && styles.brandTitleMobile]}>
          Holy
        </Text>
      </View>

      {showNav && (
        <View style={styles.nav}>
          <View style={styles.navLink}>
            <Text style={[styles.navText, styles.navTextActive]}>Mes congés</Text>
          </View>
          {calendarLink}
          {profileLink}
          {adminLink}
        </View>
      )}

      <View style={[styles.right, isMobile && styles.rightMobile]}>
        {user ? (
          <>
            <View
              testID="user-badge"
              accessibilityLabel={user.email ?? undefined}
              style={[styles.userCard, isMobile && styles.userCardMobile]}
            >
              <Avatar label={user.email ?? "?"} size={isMobile ? 34 : 40} />
              {!isMobile && <Text style={styles.userName}>{user.email}</Text>}
            </View>
            {isMobile && calendarLink}
            {isMobile && profileLink}
            {isMobile && adminLink}
            {onSignOut && (
              <Pressable
                testID="sign-out-button"
                accessibilityLabel="Se déconnecter"
                accessibilityRole="button"
                style={[styles.ghostButton, isMobile && styles.ghostButtonMobile, cursorPointer]}
                onPress={onSignOut}
              >
                <Text style={[styles.ghostText, isMobile && styles.ghostTextMobile]}>
                  {isMobile ? "Quitter" : "Se déconnecter"}
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <View testID="local-badge" style={[styles.localBadge, isMobile && styles.localBadgeMobile]}>
              <View style={styles.badgeDot} />
              <Text style={[styles.localBadgeText, isMobile && styles.localBadgeTextMobile]}>{storageModeLabel}</Text>
            </View>
            {isMobile && adminLink}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    rowGap: 10,
    columnGap: 24,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 40,
    paddingVertical: 18,
    width: "100%",
  },
  containerMobile: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    columnGap: 12,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandTitle: {
    fontFamily: fonts.base,
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  brandTitleMobile: {
    fontSize: 20,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 40,
  },
  navLink: {
    minHeight: 44,
    justifyContent: "center",
  },
  navText: {
    fontFamily: fonts.base,
    fontSize: 17,
    color: colors.textPrimary,
  },
  navTextActive: {
    color: colors.cta,
  },
  right: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  rightMobile: {
    gap: 8,
    flexShrink: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: shape.row,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 16,
  },
  userCardMobile: {
    borderWidth: 0,
    padding: 0,
  },
  userName: {
    fontFamily: fonts.base,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  localBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: shape.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    minHeight: 36,
  },
  localBadgeMobile: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
  },
  localBadgeTextMobile: {
    fontSize: 12,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
    marginRight: 8,
  },
  localBadgeText: {
    fontFamily: fonts.base,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  ghostButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  ghostButtonMobile: {
    paddingHorizontal: 10,
  },
  ghostTextMobile: {
    fontSize: 13,
  },
  ghostText: {
    fontFamily: fonts.base,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
