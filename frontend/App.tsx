import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  SafeAreaView,
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
  outline: "#827660",
  surfaceContainer: "#f1efd9",
  surfaceContainerHigh: "#ebe9d4",
  surfaceContainerLow: "#f6f5df",
  white: "#ffffff",
};

const navItems = [
  { label: "Map", icon: "map", active: false },
  { label: "Profile", icon: "person", active: false },
] as const;

const METERS_PER_MILE = 1609.344;
const METERS_PER_DEGREE_LATITUDE = 111_320;

type NearbyBar = {
  address: string;
  google_maps_url: string;
  is_open_now: boolean;
  lat: number;
  lng: number;
  name: string;
  rating: number;
  straight_line_distance_m: number;
  user_rating_count: number;
  website_url: string;
};

type Coordinates = {
  lat: number;
  lng: number;
};

type LocatedBar = NearbyBar & {
  bearingDegrees: number;
  distanceMeters: number;
};

const DUMMY_NEARBY_BARS: NearbyBar[] = [
  {
    address: "Unit 11, Nichols Court, 127 Hackney Rd, London",
    google_maps_url:
      "https://maps.google.com/?cid=1802662397012828942&g_mp=Cilnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaE5lYXJieRACGAQgAA",
    is_open_now: true,
    lat: 51.5301085,
    lng: -0.074373,
    name: "Hexmoor: Wizarding Prison",
    rating: 4.9,
    straight_line_distance_m: 72,
    user_rating_count: 172,
    website_url:
      "https://hexmoor.co.uk/?utm_source=google&utm_medium=gmb&utm_campaign=yext",
  },
  {
    address: "Unit 3B, Nichols Court, 127 Hackney Rd, London",
    google_maps_url:
      "https://maps.google.com/?cid=6046645043948328481&g_mp=Cilnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaE5lYXJieRACGAQgAA",
    is_open_now: true,
    lat: 51.5301085,
    lng: -0.074373,
    name: "Alcotraz London: Cell Block Two-One-Two",
    rating: 4.8,
    straight_line_distance_m: 72,
    user_rating_count: 2758,
    website_url:
      "https://www.alcotraz.co.uk/locations/london/?utm_source=google&utm_medium=gmb&utm_campaign=yext",
  },
];

async function callLocateApi() {
  return new Promise<NearbyBar[]>((resolve) => {
    setTimeout(() => resolve(DUMMY_NEARBY_BARS), 500);
  });
}

function formatDistance(distanceMeters: number) {
  const miles = distanceMeters / METERS_PER_MILE;
  const formattedMiles = miles < 0.1 ? miles.toFixed(2) : miles.toFixed(1);

  return `${formattedMiles} miles away`;
}

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function getLocatedBar(bar: NearbyBar, userLocation: Coordinates): LocatedBar {
  const userLatRadians = (userLocation.lat * Math.PI) / 180;
  const metersPerDegreeLongitude =
    METERS_PER_DEGREE_LATITUDE * Math.cos(userLatRadians);
  const dx = (bar.lng - userLocation.lng) * metersPerDegreeLongitude;
  const dy = (bar.lat - userLocation.lat) * METERS_PER_DEGREE_LATITUDE;
  const distanceMeters = Math.sqrt(dx * dx + dy * dy);
  const bearingDegrees = normalizeDegrees((Math.atan2(dx, dy) * 180) / Math.PI);

  return {
    ...bar,
    bearingDegrees,
    distanceMeters,
  };
}

function getRadarTargetPosition(
  bearingDegrees: number,
  headingDegrees: number,
  radius: number,
  bubbleRadius: number,
) {
  const relativeRadians =
    (normalizeDegrees(bearingDegrees - headingDegrees) * Math.PI) / 180;
  const x = Math.sin(relativeRadians) * radius;
  const y = -Math.cos(relativeRadians) * radius;

  return {
    transform: [
      { translateX: x },
      { translateY: y - bubbleRadius },
    ],
  };
}

export default function App() {
  const [isLocating, setIsLocating] = useState(false);
  const [locateMessage, setLocateMessage] = useState("Tap to find nearby bars");
  const [nearbyBars, setNearbyBars] = useState<NearbyBar[] | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [headingDegrees, setHeadingDegrees] = useState(0);
  const headingSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );

  useEffect(() => {
    return () => {
      headingSubscriptionRef.current?.remove();
    };
  }, []);

  const startHeadingWatch = async () => {
    if (headingSubscriptionRef.current) {
      return;
    }

    headingSubscriptionRef.current = await Location.watchHeadingAsync(
      (heading) => {
        const nextHeading =
          heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;

        if (nextHeading >= 0) {
          setHeadingDegrees(normalizeDegrees(nextHeading));
        }
      },
    );
  };

  const handleLocatePress = async () => {
    if (isLocating) {
      return;
    }

    setIsLocating(true);
    setLocateMessage("Locating nearby bars...");

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setLocateMessage("Location permission is required");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const nextUserLocation = {
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
      };
      const result = await callLocateApi();
      await startHeadingWatch();
      setUserLocation(nextUserLocation);
      setNearbyBars(result);
      setLocateMessage(`Found ${result.length} nearby bars`);
    } catch {
      setLocateMessage("Could not locate bars right now");
    } finally {
      setIsLocating(false);
    }
  };

  const locatedBars =
    nearbyBars && userLocation
      ? nearbyBars.map((bar) => getLocatedBar(bar, userLocation))
      : [];
  const primaryBar = locatedBars[0];
  const secondaryBar = locatedBars[1];

  const resetLocatedState = () => {
    headingSubscriptionRef.current?.remove();
    headingSubscriptionRef.current = null;
    setNearbyBars(null);
    setUserLocation(null);
    setHeadingDegrees(0);
    setLocateMessage("Tap to find nearby bars");
    setIsLocating(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.app}>
        <View style={styles.header}>
          {nearbyBars ? (
            <Pressable
              style={styles.headerButton}
              accessibilityLabel="Go back"
              onPress={resetLocatedState}
            >
              <Ionicons name="chevron-back" size={28} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={styles.headerButton} />
          )}
          <Text style={styles.headerTitle}>OnTap</Text>
          <Pressable style={styles.headerButton} accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={24} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {primaryBar ? (
            <View style={styles.compassScreen}>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>
                  Facing {Math.round(headingDegrees)}° • Tracking nearby bars
                </Text>
              </View>

              <View style={styles.radar}>
                <View style={[styles.radarRing, styles.radarRingOuter]} />
                <View style={[styles.radarRing, styles.radarRingMiddle]} />
                <View style={[styles.radarRing, styles.radarRingInner]} />
                <View style={styles.radarCrossHorizontal} />
                <View style={styles.radarCrossVertical} />

                <View
                  style={[
                    styles.targetGroup,
                    styles.primaryTarget,
                    getRadarTargetPosition(
                      primaryBar.bearingDegrees,
                      headingDegrees,
                      118,
                      32,
                    ),
                  ]}
                >
                  <View style={styles.primaryTargetBubble}>
                    <MaterialCommunityIcons
                      name="glass-mug-variant"
                      size={30}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.primaryTargetLabel} numberOfLines={1}>
                    {primaryBar.name} • {formatDistance(primaryBar.distanceMeters)}
                  </Text>
                  <View style={styles.primaryTargetLine} />
                </View>

                {secondaryBar ? (
                  <View
                    style={[
                      styles.targetGroup,
                      styles.secondaryTarget,
                      getRadarTargetPosition(
                        secondaryBar.bearingDegrees,
                        headingDegrees,
                        88,
                        25,
                      ),
                    ]}
                  >
                    <View style={styles.secondaryTargetBubble}>
                      <MaterialCommunityIcons
                        name="glass-mug"
                        size={24}
                        color={colors.outline}
                      />
                    </View>
                    <Text style={styles.secondaryTargetLabel} numberOfLines={1}>
                      {secondaryBar.name} • {formatDistance(secondaryBar.distanceMeters)}
                    </Text>
                    <View style={styles.secondaryTargetLine} />
                  </View>
                ) : null}

                <View style={styles.userMarkerPulse} />
                <View style={styles.userMarker}>
                  <Ionicons name="person" size={16} color={colors.onPrimary} />
                </View>
              </View>

              <View style={styles.routeCard}>
                <View style={styles.walkIconBox}>
                  <MaterialCommunityIcons
                    name="walk"
                    size={32}
                    color={colors.onPrimaryContainer}
                  />
                </View>
                <View style={styles.routeText}>
                  <Text style={styles.routeTitle}>
                    {formatDistance(primaryBar.distanceMeters)}
                  </Text>
                  <Text style={styles.routeSubtitle} numberOfLines={1}>
                    To {primaryBar.name}
                  </Text>
                </View>
                <Pressable style={styles.startButton}>
                  <Text style={styles.startButtonText}>Start Go</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.hero}>
              <View style={styles.locateWrap}>
                <View style={styles.locatePulse} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Locate nearby bars"
                  disabled={isLocating}
                  onPress={handleLocatePress}
                  style={({ pressed }) => [
                    styles.locateButton,
                    pressed && styles.locateButtonPressed,
                    isLocating && styles.locateButtonDisabled,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="bottle-soda-classic"
                    size={64}
                    color={colors.onPrimary}
                    style={styles.locateIcon}
                  />
                  <Text style={styles.locateText}>
                    {isLocating ? "Locating" : "Locate"}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.locateMessage}>{locateMessage}</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomNav}>
          <Pressable style={styles.navItem}>
            <Ionicons name={navItems[0].icon} size={22} color={colors.onSurfaceVariant} />
            <Text style={styles.navLabel}>{navItems[0].label}</Text>
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

          <Pressable style={styles.navItem}>
            <Ionicons name={navItems[1].icon} size={22} color={colors.onSurfaceVariant} />
            <Text style={styles.navLabel}>{navItems[1].label}</Text>
          </Pressable>
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
  headerTitle: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  compassScreen: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  statusBadge: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(121, 89, 0, 0.12)",
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statusText: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  radar: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  radarRing: {
    position: "absolute",
    borderRadius: 999,
    borderColor: "rgba(121, 89, 0, 0.18)",
    borderWidth: 1,
  },
  radarRingOuter: {
    width: "88%",
    height: "88%",
  },
  radarRingMiddle: {
    width: "62%",
    height: "62%",
    borderColor: "rgba(121, 89, 0, 0.24)",
  },
  radarRingInner: {
    width: "36%",
    height: "36%",
    borderColor: "rgba(121, 89, 0, 0.32)",
  },
  radarCrossHorizontal: {
    position: "absolute",
    width: "88%",
    height: 1,
    backgroundColor: "rgba(121, 89, 0, 0.14)",
  },
  radarCrossVertical: {
    position: "absolute",
    width: 1,
    height: "88%",
    backgroundColor: "rgba(121, 89, 0, 0.14)",
  },
  targetGroup: {
    position: "absolute",
    alignItems: "center",
    left: "50%",
    top: "50%",
  },
  primaryTarget: {
    width: 220,
    marginLeft: -110,
  },
  secondaryTarget: {
    width: 180,
    marginLeft: -90,
  },
  primaryTargetBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 6,
  },
  secondaryTargetBubble: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    borderWidth: 2,
    borderColor: "rgba(130, 118, 96, 0.35)",
  },
  primaryTargetLabel: {
    maxWidth: 210,
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    color: colors.onPrimaryContainer,
    backgroundColor: colors.primaryContainer,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    overflow: "hidden",
  },
  secondaryTargetLabel: {
    maxWidth: 180,
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerHigh,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    overflow: "hidden",
  },
  primaryTargetLine: {
    width: 4,
    height: 74,
    marginTop: 6,
    borderRadius: 2,
    backgroundColor: "rgba(121, 89, 0, 0.42)",
  },
  secondaryTargetLine: {
    width: 3,
    height: 48,
    marginTop: 6,
    borderRadius: 2,
    backgroundColor: "rgba(130, 118, 96, 0.28)",
  },
  userMarkerPulse: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(121, 89, 0, 0.18)",
  },
  userMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.background,
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  routeCard: {
    width: "100%",
    minHeight: 86,
    borderRadius: 24,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
  walkIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryContainer,
  },
  routeText: {
    flex: 1,
    minWidth: 0,
  },
  routeTitle: {
    color: colors.onSurface,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  routeSubtitle: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  startButton: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  startButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  locateWrap: {
    width: 258,
    height: 258,
    alignItems: "center",
    justifyContent: "center",
  },
  locatePulse: {
    position: "absolute",
    width: 258,
    height: 258,
    borderRadius: 129,
    backgroundColor: "rgba(121, 89, 0, 0.16)",
  },
  locateButton: {
    width: 230,
    height: 230,
    borderRadius: 115,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  locateButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  locateButtonDisabled: {
    opacity: 0.82,
  },
  locateIcon: {
    color: colors.onPrimary,
    marginBottom: 10,
  },
  locateText: {
    color: colors.onPrimary,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
  },
  locateMessage: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
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
