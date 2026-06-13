import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { confidenceLabels, type ConfidenceKey, type NearbyBar } from "../types/nearbyBar";
import { colors } from "../theme/colors";

type NearbyBarCardProps = {
  bar: NearbyBar;
  distanceText: string;
  label?: string;
  onDirectionsPress?: () => void;
};

function getConfidenceLabel(score: number | null) {
  if (score == null) {
    return "No";
  }

  if (score >= 0.75) {
    return "Yes";
  }

  if (score >= 0.5) {
    return "Likely";
  }

  if (score >= 0.25) {
    return "Unlikely";
  }

  return "No";
}

function formatRating(rating: number | null | undefined) {
  if (rating == null) {
    return "No rating yet";
  }

  return rating.toFixed(1);
}

function formatReviewCount(userRatingCount: number | null | undefined) {
  if (userRatingCount == null) {
    return "No reviews";
  }

  return `${userRatingCount} reviews`;
}

export function NearbyBarCard({
  bar,
  distanceText,
  label = "Nearby Bar",
  onDirectionsPress,
}: NearbyBarCardProps) {
  return (
    <View style={styles.content}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.name} numberOfLines={2}>
            {bar.name}
          </Text>
          <View style={styles.distanceRow}>
            <Ionicons name="navigate" size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.distanceText} numberOfLines={1}>
              {distanceText}
            </Text>
          </View>
        </View>

        <View style={styles.ratingBlock}>
          <Ionicons name="star" size={18} color={colors.primary} />
          <Text style={styles.ratingText}>{formatRating(bar.rating)}</Text>
          <Text style={styles.reviewText}>{formatReviewCount(bar.user_rating_count)}</Text>
        </View>
      </View>

      <Text style={styles.addressText} numberOfLines={2}>
        {bar.address}
      </Text>

      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Website</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {bar.website_url || "Not listed"}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagsRow}
      >
        {(Object.keys(confidenceLabels) as ConfidenceKey[])
          .filter((key) => key !== "guinness")
          .map((key) => (
          <FeatureTag
            key={key}
            label={confidenceLabels[key]}
            value={bar.confidence_scores[key]}
          />
          ))}
      </ScrollView>

      {onDirectionsPress ? (
        <Pressable style={styles.directionsButton} onPress={onDirectionsPress}>
          <Ionicons name="navigate" size={20} color={colors.onPrimary} />
          <Text style={styles.directionsText}>Get Directions</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FeatureTag({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagLabel}>{label}</Text>
      <Text style={styles.tagValue}>{getConfidenceLabel(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  label: {
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
  name: {
    color: colors.onSurface,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "900",
  },
  distanceRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  distanceText: {
    flex: 1,
    color: colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  ratingBlock: {
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
  },
  ratingText: {
    color: colors.onSurface,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },
  reviewText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  addressText: {
    color: colors.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 10,
  },
  infoCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainerLow,
  },
  infoLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    marginTop: 6,
    color: colors.onSurface,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  tagsRow: {
    gap: 10,
    paddingRight: 8,
  },
  tag: {
    minWidth: 96,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainer,
  },
  tagLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  tagValue: {
    marginTop: 6,
    color: colors.onSurface,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  directionsButton: {
    height: 52,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.primary,
  },
  directionsText: {
    color: colors.onPrimary,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
  },
});
