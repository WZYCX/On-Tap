export const confidenceLabels = {
  food: "Food",
  football: "Football",
  guinness: "Guinness",
  outdoor_seating: "Outdoor seating",
  tv: "TV",
} as const;

export type ConfidenceKey = keyof typeof confidenceLabels;

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
