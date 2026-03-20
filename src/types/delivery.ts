export interface DeliveryStop {
  id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  status: "pending" | "active" | "completed";
}
