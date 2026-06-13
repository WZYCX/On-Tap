import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const colors = {
  background: "#fcfae4",
  primary: "#795900",
  primaryContainer: "#ffbf00",
  onPrimary: "#ffffff",
  onPrimaryContainer: "#6d5000",
  onSurface: "#1c1c0f",
  onSurfaceVariant: "#504532",
};

const navItems = [
  { label: "Home", icon: "⌂", active: true },
  { label: "Compass", icon: "⌖", active: false },
  { label: "Map", icon: "▣", active: false },
  { label: "Profile", icon: "○", active: false },
];

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.app}>
        <View style={styles.header}>
          <Pressable style={styles.headerButton} accessibilityLabel="Go back">
            <Text style={styles.headerIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>FindMyBeer</Text>
          <Pressable style={styles.headerButton} accessibilityLabel="Settings">
            <Text style={styles.headerIcon}>⚙</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.locateWrap}>
              <View style={styles.locatePulse} />
              <Pressable style={styles.locateButton}>
                <Text style={styles.locateIcon}>●</Text>
                <Text style={styles.locateText}>Locate</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          {navItems.map((item) => (
            <Pressable
              key={item.label}
              style={[styles.navItem, item.active && styles.navItemActive]}
            >
              <Text style={[styles.navIcon, item.active && styles.navTextActive]}>
                {item.icon}
              </Text>
              <Text style={[styles.navLabel, item.active && styles.navTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  app: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  headerIcon: {
    color: colors.primary,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "600",
  },
  headerTitle: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800",
  },
  content: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 128,
    gap: 24,
  },
  hero: {
    alignItems: "center",
    paddingTop: 12,
    gap: 16,
  },
  locateWrap: {
    width: 194,
    height: 194,
    alignItems: "center",
    justifyContent: "center",
  },
  locatePulse: {
    position: "absolute",
    width: 194,
    height: 194,
    borderRadius: 97,
    backgroundColor: "rgba(121, 89, 0, 0.16)",
  },
  locateButton: {
    width: 176,
    height: 176,
    borderRadius: 88,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  locateIcon: {
    color: colors.onPrimary,
    fontSize: 34,
    lineHeight: 38,
    marginBottom: 8,
  },
  locateText: {
    color: colors.onPrimary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800",
  },
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
  navIcon: {
    color: colors.onSurfaceVariant,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "700",
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
