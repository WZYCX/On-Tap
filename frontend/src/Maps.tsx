// src/pages/MapPage.tsx

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import { AppHeader } from "./components/AppHeader";
import { BottomNav, type Page } from "./components/BottomNav";
import { NearbyBarCard } from "./components/NearbyBarCard";
import { colors } from "./theme/colors";
import { type NearbyBar } from "./types/nearbyBar";

const METERS_PER_MILE = 1609.344;
const SHEET_HIDDEN_OFFSET = 220;
const SHEET_DISMISS_DISTANCE = 120;

type Coordinates = {
  lat: number;
  lng: number;
};

type MapPageProps = {
  nearbyBars: NearbyBar[];
  userLocation: Coordinates | null;
  isLocating: boolean;
  onLocatePress: () => void;
  onPageChange: (page: Page) => void;
};

function formatDistance(distanceMeters: number | null | undefined) {
  if (distanceMeters == null) {
    return "Distance unavailable";
  }

  const miles = distanceMeters / METERS_PER_MILE;
  const formattedMiles = miles < 0.1 ? miles.toFixed(2) : miles.toFixed(1);

  return `${formattedMiles} miles away`;
}

export function MapPage({
  nearbyBars,
  userLocation,
  isLocating,
  onLocatePress,
  onPageChange,
}: MapPageProps) {
  const mapRef = useRef<MapView | null>(null);
  const sheetTouchStart = useRef({ x: 0, y: 0 });
  const [selectedBarIndex, setSelectedBarIndex] = useState(0);
  const [isSheetVisible, setIsSheetVisible] = useState(true);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const selectedBar = nearbyBars[selectedBarIndex] ?? nearbyBars[0];

  const animateSheetTo = (toValue: number, onComplete?: () => void) => {
    Animated.spring(sheetTranslateY, {
      toValue,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
    }).start(({ finished }) => {
      if (finished) {
        onComplete?.();
      }
    });
  };

  const showSheet = () => {
    setIsSheetVisible(true);
    sheetTranslateY.stopAnimation();
    sheetTranslateY.setValue(SHEET_HIDDEN_OFFSET);
    animateSheetTo(0);
  };

  const hideSheet = () => {
    animateSheetTo(SHEET_HIDDEN_OFFSET, () => {
      setIsSheetVisible(false);
      sheetTranslateY.setValue(0);
    });
  };

  useEffect(() => {
    setSelectedBarIndex(0);
    setIsSheetVisible(true);
    sheetTranslateY.setValue(0);
  }, [nearbyBars, sheetTranslateY]);

  useEffect(() => {
    if (selectedBar) {
      showSheet();
    }
  }, [selectedBarIndex]);

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

  const resetMapCenter = () => {
    mapRef.current?.animateToRegion(initialRegion, 250);
  };

  const openDirections = () => {
    Linking.openURL("https://maps.app.goo.gl/thtET4HoGE11ZSSJ8?g_st=ic"); // TODO: Replace with selectedBar.google_maps_url when available
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.app}>
        <AppHeader
          title="OnTap"
          showBackButton={false}
        />

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
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
                  onPress={() => {
                    setSelectedBarIndex(index);
                  }}
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
            <Pressable style={styles.floatingButton} onPress={resetMapCenter}>
              <Ionicons name="locate" size={23} color={colors.onSurfaceVariant} />
            </Pressable>

            <Pressable style={styles.floatingButton}>
              <Ionicons name="layers-outline" size={23} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {selectedBar && isSheetVisible ? (
            <Animated.View
              style={[
                styles.bottomSheet,
                { transform: [{ translateY: sheetTranslateY }] },
              ]}
            >
              <View
                style={styles.sheetCard}
                onTouchStart={(event) => {
                  sheetTouchStart.current = {
                    x: event.nativeEvent.pageX,
                    y: event.nativeEvent.pageY,
                  };
                }}
                onMoveShouldSetResponder={(event) => {
                  const dx = Math.abs(event.nativeEvent.pageX - sheetTouchStart.current.x);
                  const dy = event.nativeEvent.pageY - sheetTouchStart.current.y;

                  return dy > 8 && dy > dx;
                }}
                onResponderGrant={() => {
                  sheetTranslateY.stopAnimation();
                }}
                onResponderMove={(event) => {
                  const dy = event.nativeEvent.pageY - sheetTouchStart.current.y;
                  sheetTranslateY.setValue(Math.max(0, dy));
                }}
                onResponderRelease={(event) => {
                  const dy = event.nativeEvent.pageY - sheetTouchStart.current.y;

                  if (dy > SHEET_DISMISS_DISTANCE) {
                    hideSheet();
                    return;
                  }

                  animateSheetTo(0);
                }}
                onResponderTerminate={() => {
                  animateSheetTo(0);
                }}
              >
                <View style={styles.handleWrap}>
                  <View style={styles.handle} />
                </View>

                <View style={styles.sheetContent}>
                  <NearbyBarCard
                    bar={selectedBar}
                    distanceText={formatDistance(selectedBar.straight_line_distance_m)}
                    label="Best Match"
                    onDirectionsPress={openDirections}
                  />
                </View>
              </View>
            </Animated.View>
          ) : null}
        </View>

        <BottomNav
          currentPage="maps"
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
  },
});
