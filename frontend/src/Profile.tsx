import { Image, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "./components/AppHeader";
import { BottomNav, type Page } from "./components/BottomNav";
import { colors } from "./theme/colors";

const PROFILE_IMAGE_URL = "https://media.licdn.com/dms/image/v2/D4E03AQEYKEFB2axjnQ/profile-displayphoto-scale_200_200/B4EZx7al_uKoAY-/0/1771597095775?e=2147483647&v=beta&t=LjgWANWqlFWO34k5pzGK0UFXEr6b9dhPxiITWZUzUGU";
const PROFILE_NAME = "Will Chen";
const PROFILE_FAVOURITE_BEER = "Guinness";
const PROFILE_LOCAL_PUB = "Famous Three Kings";
const PROFILE_LOCATION = "Earls Court, London";

type ProfilePageProps = {
  isLocating: boolean;
  onLocatePress: () => void;
  onPageChange: (page: Page) => void;
};

export function ProfilePage({
  isLocating,
  onLocatePress,
  onPageChange,
}: ProfilePageProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.app}>
        <AppHeader title="Profile" showBackButton={false} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <Image
              source={{ uri: PROFILE_IMAGE_URL }}
              style={styles.avatar}
              resizeMode="cover"
            />
            <Text style={styles.name}>{PROFILE_NAME}</Text>
            <Text style={styles.subtitle}>love me guinness</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Favourite Beer</Text>
            <Text style={styles.sectionValue}>{PROFILE_FAVOURITE_BEER}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Local Pub</Text>
            <Text style={styles.sectionValue}>{PROFILE_LOCAL_PUB}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.sectionValue}>{PROFILE_LOCATION}</Text>
          </View>
        </ScrollView>

        <BottomNav
          currentPage="profile"
          isLocating={isLocating}
          onLocatePress={onLocatePress}
          onPageChange={onPageChange}
        />
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 16,
  },
  heroCard: {
    alignItems: "center",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 28,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: "rgba(121, 89, 0, 0.14)",
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    marginBottom: 16,
    backgroundColor: colors.surfaceContainer,
  },
  name: {
    color: colors.onSurface,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    color: colors.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    textAlign: "center",
  },
  infoCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: colors.surfaceContainer,
  },
  sectionTitle: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionValue: {
    marginTop: 8,
    color: colors.onSurface,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
});
