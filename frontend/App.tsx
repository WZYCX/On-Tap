import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
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
const BACKEND_PORT = 5002;
const MAX_RADAR_DISTANCE_METERS = 500;
const MIN_RADAR_RADIUS = 42;
const MAX_RADAR_RADIUS = 124;

const confidenceLabels = {
  food: "Food",
  football: "Football",
  guinness: "Guinness",
  outdoor_seating: "Outdoor seating",
  tv: "TV",
} as const;

type ConfidenceKey = keyof typeof confidenceLabels;

type NearbyBar = {
  address: string;
  confidence_scores: Record<ConfidenceKey, number | null>;
  google_maps_url: string;
  has_favourite_drink: boolean;
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

async function callLocateApi(location: Coordinates) {
  const params = new URLSearchParams({
    lat: String(location.lat),
    lng: String(location.lng),
  });
  const response = await fetch(`${getApiBaseUrl()}/find-pub?${params.toString()}`);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : "Unable to fetch nearby bars";

    throw new Error(message);
  }

  return (await response.json()) as NearbyBar[];
}

function getApiBaseUrl() {
  const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
  const host = expoHost || "localhost";

  return `http://${host}:${BACKEND_PORT}`;
}

function formatDistance(distanceMeters: number) {
  const miles = distanceMeters / METERS_PER_MILE;
  const formattedMiles = miles < 0.1 ? miles.toFixed(2) : miles.toFixed(1);

  return `${formattedMiles} miles away`;
}

function formatRating(rating: number | null | undefined, count: number | null | undefined) {
  if (rating == null) {
    return "No rating yet";
  }

  return `${rating.toFixed(1)} (${count ?? 0} reviews)`;
}

function getConfidenceLabel(score: number | null) {
  if (score == null) {
    return "no";
  }

  if (score >= 0.75) {
    return "yes";
  }

  if (score >= 0.5) {
    return "likely";
  }

  if (score >= 0.25) {
    return "not likely";
  }

  return "no";
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

function getRadarRadius(distanceMeters: number) {
  const normalizedDistance = Math.min(distanceMeters, MAX_RADAR_DISTANCE_METERS) /
    MAX_RADAR_DISTANCE_METERS;

  return MIN_RADAR_RADIUS +
    normalizedDistance * (MAX_RADAR_RADIUS - MIN_RADAR_RADIUS);
}

export default function App() {
  const [isLocating, setIsLocating] = useState(false);
  const [locateMessage, setLocateMessage] = useState("Tap to find nearby bars");
  const [nearbyBars, setNearbyBars] = useState<NearbyBar[] | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [headingDegrees, setHeadingDegrees] = useState(0);
  const [selectedBarIndex, setSelectedBarIndex] = useState(0);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const headingSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );

  useEffect(() => {
    return () => {
      headingSubscriptionRef.current?.remove();
      locationSubscriptionRef.current?.remove();
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

  const startLocationWatch = async () => {
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 2,
        timeInterval: 1000,
      },
      (location) => {
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
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
      const result = await callLocateApi(nextUserLocation);
      await startHeadingWatch();
      await startLocationWatch();
      setUserLocation(nextUserLocation);
      setNearbyBars(result);
      setSelectedBarIndex(0);
      setIsDetailOpen(false);
      setLocateMessage(`Found ${result.length} nearby bars`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not locate bars right now";
      setLocateMessage(message);
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
  const selectedBar = locatedBars[selectedBarIndex] ?? primaryBar;

  const resetLocatedState = () => {
    headingSubscriptionRef.current?.remove();
    locationSubscriptionRef.current?.remove();
    headingSubscriptionRef.current = null;
    locationSubscriptionRef.current = null;
    setNearbyBars(null);
    setUserLocation(null);
    setHeadingDegrees(0);
    setSelectedBarIndex(0);
    setIsDetailOpen(false);
    setLocateMessage("Tap to find nearby bars");
    setIsLocating(false);
  };

  const selectBar = (index: number) => {
    setSelectedBarIndex(index);
    setIsDetailOpen(false);
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

                <Pressable
                  onPress={() => selectBar(0)}
                  style={[
                    styles.targetGroup,
                    styles.primaryTarget,
                    getRadarTargetPosition(
                      primaryBar.bearingDegrees,
                      headingDegrees,
                      getRadarRadius(primaryBar.distanceMeters),
                      32,
                    ),
                  ]}
                >
                  <View
                    style={[
                      styles.primaryTargetBubble,
                      selectedBarIndex === 0 && styles.selectedTargetBubble,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="glass-mug-variant"
                      size={30}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.primaryTargetLabel} numberOfLines={1}>
                    {primaryBar.name} • {formatDistance(primaryBar.distanceMeters)}
                  </Text>
                </Pressable>

                {secondaryBar ? (
                  <Pressable
                    onPress={() => selectBar(1)}
                    style={[
                      styles.targetGroup,
                      styles.secondaryTarget,
                      getRadarTargetPosition(
                        secondaryBar.bearingDegrees,
                        headingDegrees,
                        getRadarRadius(secondaryBar.distanceMeters),
                        25,
                      ),
                    ]}
                  >
                    <View
                      style={[
                        styles.secondaryTargetBubble,
                        selectedBarIndex === 1 && styles.selectedTargetBubble,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="glass-mug"
                        size={24}
                        color={colors.outline}
                      />
                    </View>
                    <Text style={styles.secondaryTargetLabel} numberOfLines={1}>
                      {secondaryBar.name} • {formatDistance(secondaryBar.distanceMeters)}
                    </Text>
                  </Pressable>
                ) : null}

                <View style={styles.userMarkerPulse} />
                <View style={styles.userMarker}>
                  <Ionicons name="person" size={16} color={colors.onPrimary} />
                </View>
              </View>

              <Pressable
                onPress={() => setIsDetailOpen((isOpen) => !isOpen)}
                style={[styles.routeCard, isDetailOpen && styles.routeCardExpanded]}
              >
                <View style={styles.walkIconBox}>
                  <MaterialCommunityIcons
                    name="walk"
                    size={32}
                    color={colors.onPrimaryContainer}
                  />
                </View>
                <View style={styles.routeText}>
                  <Text style={styles.routeTitle}>
                    {formatDistance(selectedBar.distanceMeters)}
                  </Text>
                  <Text style={styles.routeSubtitle} numberOfLines={1}>
                    {selectedBar.name}
                  </Text>
                </View>
                <View style={styles.cardChevron}>
                  <Ionicons
                    name={isDetailOpen ? "chevron-down" : "chevron-up"}
                    size={22}
                    color={colors.onPrimary}
                  />
                </View>

                {isDetailOpen ? (
                  <View style={styles.detailContent}>
                    <View style={styles.detailGrid}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Open</Text>
                        <Text style={styles.detailValue}>
                          {selectedBar.is_open_now ? "Yes" : "No"}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Rating</Text>
                        <Text style={styles.detailValue}>
                          {formatRating(selectedBar.rating, selectedBar.user_rating_count)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.detailAddress} numberOfLines={2}>
                      {selectedBar.address}
                    </Text>

                    <View style={styles.confidenceGrid}>
                      {(Object.keys(confidenceLabels) as ConfidenceKey[]).map((key) => (
                        <View key={key} style={styles.confidenceItem}>
                          <Text style={styles.confidenceLabel}>
                            {confidenceLabels[key]}
                          </Text>
                          <Text style={styles.confidenceValue}>
                            {getConfidenceLabel(selectedBar.confidence_scores[key])}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.detailMeta} numberOfLines={1}>
                      Favourite drink: {selectedBar.has_favourite_drink ? "yes" : "no"}
                    </Text>
                    <Text style={styles.detailMeta} numberOfLines={1}>
                      Website: {selectedBar.website_url || "Not listed"}
                    </Text>
                    <Text style={styles.detailMeta} numberOfLines={1}>
                      Google Maps: {selectedBar.google_maps_url || "Not listed"}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
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
                    name="glass-mug-variant"
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
  selectedTargetBubble: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
    transform: [{ scale: 1.08 }],
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    minHeight: 86,
    borderRadius: 24,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
  routeCardExpanded: {
    alignItems: "flex-start",
    minHeight: 270,
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
  cardChevron: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  detailContent: {
    width: "100%",
    gap: 10,
  },
  detailGrid: {
    flexDirection: "row",
    gap: 10,
  },
  detailItem: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainerLow,
  },
  detailLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  detailValue: {
    color: colors.onSurface,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  detailAddress: {
    color: colors.onSurface,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  confidenceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  confidenceItem: {
    minWidth: "30%",
    flexGrow: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainerHigh,
  },
  confidenceLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
  },
  confidenceValue: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  detailMeta: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
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
