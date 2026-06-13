// src/pages/MapPage.tsx

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import { AppHeader } from "./components/AppHeader";
import { BottomNav } from "./components/BottomNav";
import { colors } from "./theme/colors";

const METERS_PER_MILE = 1609.344;

type ConfidenceKey =
  | "food"
  | "football"
  | "guinness"
  | "outdoor_seating"
  | "tv";

export type NearbyBar = {
  address: string;
  confidence_scores: Record<ConfidenceKey, number | null>;
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

type MapPageProps = {
  nearbyBars: NearbyBar[];
  userLocation: Coordinates | null;
  isLocating: boolean;
  onLocatePress: () => void;
  onBackPress: () => void;
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
};

function formatDistance(distanceMeters: number | null | undefined) {
  if (distanceMeters == null) {
    return "Distance unavailable";
  }

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

export function MapPage({
  nearbyBars,
  userLocation,
  isLocating,
  onLocatePress,
  onBackPress,
  onSettingsPress,
  onProfilePress,
}: MapPageProps) {
  const [selectedBarIndex, setSelectedBarIndex] = useState(0);

  const selectedBar = nearbyBars[selectedBarIndex] ?? nearbyBars[0];

  const initialRegion = useMemo(() => {
    if (userLocation) {
      return {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
      };
    }

    const firstBar = nearbyBars[0];

    if (firstBar) {
      return {
        latitude: firstBar.lat,
        longitude: firstBar.lng,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
      };
    }

    // London fallback
    return {
      latitude: 51.5074,
      longitude: -0.1278,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [nearbyBars, userLocation]);

  const openDirections = () => {
    Linking.openURL("https://maps.app.goo.gl/thtET4HoGE11ZSSJ8?g_st=ic"); // TODO: Replace with selectedBar.google_maps_url when available
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.app}>
        <AppHeader
          title="OnTap"
          showBackButton
          onBackPress={onBackPress}
          onSettingsPress={onSettingsPress}
        />

        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {userLocation ? (
              <Marker
                coordinate={{
                  latitude: userLocation.lat,
                  longitude: userLocation.lng,
                }}
                title="You"
              >
                <View style={styles.userMarkerOuter}>
                  <View style={styles.userMarkerInner} />
                </View>
              </Marker>
            ) : null}

            {nearbyBars.map((bar, index) => {
              const isSelected = index === selectedBarIndex;

              return (
                <Marker
                  key={`${bar.name}-${bar.lat}-${bar.lng}`}
                  coordinate={{
                    latitude: bar.lat,
                    longitude: bar.lng,
                  }}
                  title={bar.name}
                  description={bar.address}
                  onPress={() => setSelectedBarIndex(index)}
                >
                  <View style={styles.markerWrap}>
                    {isSelected ? (
                      <View style={styles.ratingPill}>
                        <Ionicons name="star" size={13} color={colors.onPrimaryContainer} />
                        <Text style={styles.ratingPillText}>
                          {bar.rating?.toFixed(1) ?? "—"}
                        </Text>
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.pubMarker,
                        isSelected ? styles.pubMarkerSelected : styles.pubMarkerDefault,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="glass-mug-variant"
                        size={isSelected ? 27 : 22}
                        color={isSelected ? colors.onPrimary : colors.onPrimaryContainer}
                      />
                    </View>

                    <View
                      style={[
                        styles.markerPointer,
                        isSelected
                          ? styles.markerPointerSelected
                          : styles.markerPointerDefault,
                      ]}
                    />
                  </View>
                </Marker>
              );
            })}
          </MapView>

          <View style={styles.floatingActions}>
            <Pressable style={styles.floatingButton} onPress={onLocatePress}>
              <Ionicons name="locate" size={23} color={colors.onSurfaceVariant} />
            </Pressable>

            <Pressable style={styles.floatingButton}>
              <Ionicons name="layers-outline" size={23} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {selectedBar ? (
            <View style={styles.bottomSheet}>
              <View style={styles.sheetCard}>
                <View style={styles.handleWrap}>
                  <View style={styles.handle} />
                </View>

                <View style={styles.sheetContent}>
                  <View style={styles.sheetTopRow}>
                    <View style={styles.sheetTitleBlock}>
                      <Text style={styles.bestMatchPill}>Best Match</Text>

                      <Text style={styles.pubName} numberOfLines={2}>
                        {selectedBar.name}
                      </Text>

                      <View style={styles.distanceRow}>
                        <Ionicons
                          name="navigate"
                          size={14}
                          color={colors.onSurfaceVariant}
                        />
                        <Text style={styles.distanceText} numberOfLines={1}>
                          {formatDistance(selectedBar.straight_line_distance_m)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.ratingBlock}>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={18} color={colors.primary} />
                        <Text style={styles.ratingText}>
                          {selectedBar.rating?.toFixed(1) ?? "—"}
                        </Text>
                      </View>

                      <Text style={styles.reviewText}>
                        {selectedBar.user_rating_count ?? 0} reviews
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.addressText} numberOfLines={2}>
                    {selectedBar.address}
                  </Text>

                  <View style={styles.infoGrid}>
                    <View style={styles.infoCard}>
                      <Text style={styles.infoLabel}>Open now</Text>
                      <Text style={styles.infoValue}>
                        {selectedBar.is_open_now ? "Yes" : "No"}
                      </Text>
                    </View>

                    <View style={styles.infoCard}>
                      <Text style={styles.infoLabel}>Favourite drink</Text>
                      <Text style={styles.infoValue}>
                        {selectedBar.has_favourite_drink ? "Yes" : "No"}
                      </Text>
                    </View>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tagsRow}
                  >
                    <FeatureTag label="Food" value={selectedBar.confidence_scores.food} />
                    <FeatureTag label="Football" value={selectedBar.confidence_scores.football} />
                    <FeatureTag label="Guinness" value={selectedBar.confidence_scores.guinness} />
                    <FeatureTag
                      label="Outdoor seating"
                      value={selectedBar.confidence_scores.outdoor_seating}
                    />
                    <FeatureTag label="TV" value={selectedBar.confidence_scores.tv} />
                  </ScrollView>

                  <Pressable
                    style={[
                      styles.directionsButton,
                    ]}
                    disabled={false}
                    onPress={openDirections}
                  >
                    <Ionicons name="navigate" size={20} color={colors.onPrimary} />
                    <Text style={styles.directionsText}>Get Directions</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        <BottomNav
          isLocating={isLocating}
          onLocatePress={onLocatePress}
        />
      </View>
    </SafeAreaView>
  );
}

function FeatureTag({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  let displayValue = "No";

  if (value != null) {
    if (value >= 0.75) displayValue = "Yes";
    else if (value >= 0.5) displayValue = "Likely";
    else if (value >= 0.25) displayValue = "Unlikely";
  }

  return (
    <View style={styles.tag}>
      <Text style={styles.tagLabel}>{label}</Text>
      <Text style={styles.tagValue}>{displayValue}</Text>
    </View>
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
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  userMarkerOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(121, 89, 0, 0.18)",
  },
  userMarkerInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.white,
  },
  markerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ratingPill: {
    marginBottom: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: "rgba(121, 89, 0, 0.2)",
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingPillText: {
    color: colors.onPrimaryContainer,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  pubMarker: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 7,
  },
  pubMarkerSelected: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
  },
  pubMarkerDefault: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryContainer,
  },
  markerPointer: {
    transform: [{ rotate: "45deg" }],
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: colors.white,
  },
  markerPointerSelected: {
    width: 13,
    height: 13,
    marginTop: -7,
    backgroundColor: colors.primary,
  },
  markerPointerDefault: {
    width: 11,
    height: 11,
    marginTop: -6,
    backgroundColor: colors.primaryContainer,
  },
  floatingActions: {
    position: "absolute",
    top: 24,
    right: 20,
    gap: 12,
  },
  floatingButton: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 96,
    paddingHorizontal: 16,
  },
  sheetCard: {
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: colors.white,
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 12,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(130, 118, 96, 0.3)",
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 14,
  },
  sheetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  sheetTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  bestMatchPill: {
    alignSelf: "flex-start",
    marginBottom: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.primaryContainer,
    color: colors.onPrimaryContainer,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  pubName: {
    color: colors.onSurface,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "800",
  },
  distanceRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  distanceText: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  ratingBlock: {
    alignItems: "flex-end",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    color: colors.primary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
  },
  reviewText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  addressText: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 10,
  },
  infoCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceContainerLow,
  },
  infoLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  infoValue: {
    color: colors.onSurface,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900",
  },
  tagsRow: {
    gap: 8,
    paddingRight: 8,
  },
  tag: {
    minWidth: 110,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: "rgba(130, 118, 96, 0.16)",
  },
  tagLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
  tagValue: {
    marginTop: 2,
    color: colors.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
  },
  directionsButton: {
    minHeight: 56,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    shadowColor: "#3e2723",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  directionsText: {
    color: colors.onPrimary,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "900",
  },
});