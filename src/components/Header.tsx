import { Pressable, StyleSheet, Text, View } from "react-native";
import type { User } from "@supabase/supabase-js";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";
import { Icon, IconName } from "./ui/Icon";
import { Button } from "./ui/Button";
import { colors, fonts, shape } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";

export type AppSection = "home" | "calendar" | "admin" | "profile";

export type NavProps = {
  active: AppSection;
  onHome?: () => void;
  onSharedCalendar?: () => void;
  onProfile?: () => void;
  onAdmin?: () => void;
};

type Props = NavProps & {
  isMobile: boolean;
  storageModeLabel?: string;
  user?: User | null;
  displayName?: string;
  onSignOut?: () => void;
};

type NavItem = { key: AppSection; label: string; shortLabel: string; icon: IconName; testID: string; onPress: () => void };

// Liens de navigation communs à l'en-tête desktop et à la barre d'onglets mobile.
export function navItems({ onHome, onSharedCalendar, onProfile, onAdmin }: NavProps, includeProfile: boolean): NavItem[] {
  const items: NavItem[] = [];
  items.push({ key: "home", label: "Mes congés", shortLabel: "Mes congés", icon: "home", testID: "home-button", onPress: onHome ?? (() => undefined) });
  if (onSharedCalendar) items.push({ key: "calendar", label: "Congés d’équipe", shortLabel: "Équipe", icon: "users", testID: "shared-calendar-button", onPress: onSharedCalendar });
  if (onAdmin) items.push({ key: "admin", label: "Administration", shortLabel: "Admin", icon: "shield", testID: "admin-button", onPress: onAdmin });
  if (includeProfile && onProfile) items.push({ key: "profile", label: "Profil", shortLabel: "Profil", icon: "user", testID: "profile-button", onPress: onProfile });
  return items;
}

export function Header({ isMobile, storageModeLabel = "Stockage local", user, displayName, onSignOut, ...nav }: Props) {
  const items = navItems(nav, false);
  const showNav = !isMobile && items.length > 1;
  const name = displayName && displayName.trim() ? displayName : user?.email ?? "";

  const userBlock = user ? (
    <View testID="user-badge" accessibilityLabel={user.email ?? undefined} style={[styles.userCard, isMobile && styles.userCardMobile]}>
      <Avatar label={name || "?"} size={isMobile ? 32 : 34} round />
      {!isMobile && (
        <View style={styles.userText}>
          {name !== user.email ? <Text style={styles.userName} numberOfLines={1}>{name}</Text> : null}
          <Text style={name !== user.email ? styles.userMail : styles.userName} numberOfLines={1}>{user.email}</Text>
        </View>
      )}
    </View>
  ) : null;

  return (
    <View testID="app-header" style={[styles.container, isMobile && styles.containerMobile]}>
      <View style={styles.brand}>
        <Logo size={isMobile ? 26 : 28} />
        <Text style={[styles.brandTitle, isMobile && styles.brandTitleMobile]}>Holy</Text>
      </View>

      {showNav && (
        <View style={styles.nav}>
          {items.map((item) => {
            const active = item.key === nav.active;
            return (
              <Pressable
                key={item.key}
                testID={item.testID}
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                onPress={item.onPress}
                style={[styles.navLink, cursorPointer]}
              >
                <Icon name={item.icon} size={16} color={active ? colors.textPrimary : colors.textSecondary} />
                <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
                {active ? <View style={styles.navIndicator} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.spacer} />

      <View style={styles.right}>
        {user ? (
          <>
            {!isMobile && nav.onProfile ? (
              <Pressable
                testID="profile-button"
                accessibilityRole="link"
                accessibilityLabel="Mon profil"
                accessibilityState={{ selected: nav.active === "profile" }}
                onPress={nav.onProfile}
                style={[styles.profileLink, nav.active === "profile" && styles.profileLinkActive, cursorPointer]}
              >
                {userBlock}
              </Pressable>
            ) : userBlock}
            {onSignOut && (
              <Button
                testID="sign-out-button"
                accessibilityLabel="Se déconnecter"
                variant="ghost"
                icon="logout"
                label={isMobile ? undefined : "Se déconnecter"}
                onPress={onSignOut}
              />
            )}
          </>
        ) : (
          <View testID="local-badge" style={[styles.localBadge, isMobile && styles.localBadgeMobile]}>
            <Icon name="device" size={14} color={colors.textSecondary} />
            <Text style={[styles.localBadgeText, isMobile && styles.localBadgeTextMobile]}>{storageModeLabel}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Barre d'onglets mobile (standard iOS / Android).
export function TabBar(props: NavProps) {
  const items = navItems(props, true);
  if (items.length < 2) return null;
  return (
    <View testID="tab-bar" style={styles.tabBar}>
      {items.map((item) => {
        const active = item.key === props.active;
        return (
          <Pressable
            key={item.key}
            testID={item.testID}
            accessibilityRole="link"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={item.onPress}
            style={[styles.tab, cursorPointer]}
          >
            <Icon name={item.icon} size={20} color={active ? colors.cta : colors.textSecondary} />
            <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>{item.shortLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 28,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 32,
    minHeight: 64,
    width: "100%",
  },
  containerMobile: { paddingHorizontal: 16, minHeight: 56, columnGap: 10 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandTitle: { fontFamily: fonts.base, fontSize: 19, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.3 },
  brandTitleMobile: { fontSize: 18 },
  nav: { flexDirection: "row", alignItems: "stretch", alignSelf: "stretch", gap: 4 },
  navLink: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, minHeight: 44, position: "relative" },
  navText: { fontFamily: fonts.base, fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  navTextActive: { color: colors.textPrimary },
  navIndicator: { position: "absolute", left: 12, right: 12, bottom: -1, height: 2, borderRadius: 2, backgroundColor: colors.cta },
  spacer: { flex: 1 },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  profileLink: { borderRadius: 12, borderWidth: 1, borderColor: "transparent" },
  profileLinkActive: { borderColor: colors.border, backgroundColor: colors.canvas },
  userCard: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5, paddingLeft: 5, paddingRight: 10, minHeight: 44 },
  userCardMobile: { padding: 0, paddingRight: 0 },
  userText: { maxWidth: 220 },
  userName: { fontFamily: fonts.base, fontSize: 13.5, fontWeight: "600", color: colors.textPrimary },
  userMail: { fontFamily: fonts.base, fontSize: 12, color: colors.textSecondary },
  localBadge: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, minHeight: 32, borderRadius: shape.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  localBadgeMobile: { paddingHorizontal: 10, minHeight: 30 },
  localBadgeText: { fontFamily: fonts.base, fontSize: 12.5, fontWeight: "600", color: colors.textSecondary },
  localBadgeTextMobile: { fontSize: 12 },
  tabBar: { flexDirection: "row", backgroundColor: colors.panel, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, paddingBottom: 8, paddingHorizontal: 6 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 50 },
  tabText: { fontFamily: fonts.base, fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: colors.cta },
});
