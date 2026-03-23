import { supabase } from "@/integrations/supabase/client";

async function geocodeWithCache(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Step 1: Check cache
    const { data: cacheData } = await supabase
      .from("geocode_cache")
      .select("lat, lng")
      .eq("address", address)
      .single();

    if (cacheData?.lat && cacheData?.lng) {
      console.log("Loaded from cache ✅");
      return { lat: cacheData.lat, lng: cacheData.lng };
    }

    // Step 2: Fetch from edge function
    console.log("Fetching from edge function...");
    const { data, error } = await supabase.functions.invoke("google-places", {
      body: { action: "geocode", input: address },
    });

    if (error || !data?.lat || !data?.lng) return null;

    // Step 3: Save to cache
    await supabase.from("geocode_cache").insert({
      address,
      lat: data.lat,
      lng: data.lng,
    });
    console.log("Saved to cache 💾");

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

    if (targetLat == null || targetLng == null) {
      const coords = await geocodeWithCache(address);

      if (coords) {
        targetLat = coords.lat;
        targetLng = coords.lng;
        onCoordsResolved?.(coords);
      } else {
        window.open(
          `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`,
          "_blank"
        );
        return;
      }
    }

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
