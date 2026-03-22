export interface DeliveryStop {
  id: string;
  address: string;
  formattedAddress?: string;
  lat: number | null;
  lng: number | null;
  status: "pending" | "active" | "completed";
  completedAt?: string;
}

export interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

export interface PlaceDetails {
  formattedAddress: string;
  lat: number;
  lng: number;
  displayName?: string;
}
