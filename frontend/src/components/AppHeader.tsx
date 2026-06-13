// src/components/AppHeader.tsx

import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type AppHeaderProps = {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onSettingsPress?: () => void;
};

export function AppHeader({
  title = "OnTap",
  showBackButton = false,
  onBackPress,
  onSettingsPress,
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      {showBackButton ? (
        <Pressable
          style={styles.headerButton}
          accessibilityLabel="Go back"
          onPress={onBackPress}
        >
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
      ) : (
        <View style={styles.headerButton} />
      )}

      <Text style={styles.headerTitle}>{title}</Text>

      <Pressable
        style={styles.headerButton}
        accessibilityLabel="Settings"
        onPress={onSettingsPress}
      >
        <Ionicons name="settings-outline" size={24} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(252, 250, 228, 0.92)",
    borderBottomColor: "rgba(130, 118, 96, 0.12)",
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800",
  },
});