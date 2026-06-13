// src/components/BottomNav.tsx

import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

const navItems = [
  { label: "Map", icon: "map" },
  { label: "Profile", icon: "person" },
] as const;

export type Page = "compass" | "maps" | "profile";

type BottomNavProps = {
  currentPage: Page;
  isLocating: boolean;
  onLocatePress: () => void;
  onPageChange?: (page: Page) => void;
};

export function BottomNav({
  currentPage,
  isLocating,
  onLocatePress,
  onPageChange,
}: BottomNavProps) {
  const handleMapPress = () => {
    onPageChange?.("maps");
  };

  const handleProfilePress = () => {
    onPageChange?.("profile");
  };

  const handleLocatePress = () => {
    onPageChange?.("compass");
    onLocatePress();
  };

  return (
    <View style={styles.bottomNav}>
      <Pressable
        style={[styles.navItem, currentPage === "maps" && styles.navItemActive]}
        onPress={handleMapPress}
      >
        <Ionicons
          name={navItems[0].icon}
          size={22}
          color={
            currentPage === "maps"
              ? colors.onPrimaryContainer
              : colors.onSurfaceVariant
          }
        />
        <Text
          style={[
            styles.navLabel,
            currentPage === "maps" && styles.navTextActive,
          ]}
        >
          {navItems[0].label}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Locate nearby bars"
        disabled={isLocating}
        onPress={handleLocatePress}
        style={({ pressed }) => [
          styles.centerNavButton,
          pressed && styles.centerNavButtonPressed,
        ]}
      >
        <Ionicons name="location-sharp" size={34} color={colors.onPrimary} />
      </Pressable>

      <Pressable
        style={[
          styles.navItem,
          currentPage === "profile" && styles.navItemActive,
        ]}
        onPress={handleProfilePress}
      >
        <Ionicons
          name={navItems[1].icon}
          size={22}
          color={
            currentPage === "profile"
              ? colors.onPrimaryContainer
              : colors.onSurfaceVariant
          }
        />
        <Text
          style={[
            styles.navLabel,
            currentPage === "profile" && styles.navTextActive,
          ]}
        >
          {navItems[1].label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 86,
    paddingTop: 8,
    paddingBottom: 22,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: "rgba(252, 250, 228, 0.95)",
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  navItem: {
    minWidth: 66,
    minHeight: 52,
    borderRadius: 24,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  navItemActive: {
    backgroundColor: colors.primaryContainer,
  },
  centerNavButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  centerNavButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  navLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  navTextActive: {
    color: colors.onPrimaryContainer,
  },
});
