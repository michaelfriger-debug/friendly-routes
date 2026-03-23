import { supabase } from "@/integrations/supabase/client";

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("google-places", {
      body: { action: "geocode", input: address },
    });
    if (error || !data?.lat || !data?.lng) return null;
    return { lat: data.lat, lng: data.lng };
  } catch {
    return null;
  }
}

export const handleNavigation = async (
  address: string,
  lat: number | null,
  lng: number | null,
  onCoordsResolved?: (coords: { lat: number; lng: number }) => void
) => {
  try {
    let targetLat = lat;
    let targetLng = lng;

    // אם אין קואורדינטות - מביאים מגוגל דרך Edge Function
    if (targetLat == null || targetLng == null) {
      const coords = await geocodeAddress(address);

      if (coords) {
        targetLat = coords.lat;
        targetLng = coords.lng;
        onCoordsResolved?.(coords);
      } else {
        // fallback לפי כתובת בלבד
        window.open(
          `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`,
          "_blank"
        );
        return;
      }
    }

    // פתיחה ב-Waze עם קואורדינטות
    const appUrl = `waze://?ll=${targetLat},${targetLng}&navigate=yes`;
    const webUrl = `https://www.waze.com/ul?ll=${targetLat},${targetLng}&navigate=yes`;

    window.location.href = appUrl;

    setTimeout(() => {
      if (!document.hidden) {
        window.open(webUrl, "_blank");
      }
    }, 600);
  } catch (err) {
    console.error("Navigation error:", err);
    window.open(
      `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`,
      "_blank"
    );
  }
};
