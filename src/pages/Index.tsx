import { useState, useCallback, useEffect } from "react";
import type { DeliveryStop, PlaceDetails } from "@/types/delivery";
import AddressInput from "@/components/delivery/AddressInput";
import ActiveDelivery from "@/components/delivery/ActiveDelivery";
import DeliveryList from "@/components/delivery/DeliveryList";
import CompletedList from "@/components/delivery/CompletedList";
import RouteConfigModal, { type RouteConfig } from "@/components/delivery/RouteConfigModal";
import RouteSummary from "@/components/delivery/RouteSummary";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "michael-delivery-stops";
const ROUTE_CONFIG_KEY = "michael-route-config";

const DEFAULT_ROUTE_CONFIG: RouteConfig = {
  startType: "gps",
  startAddress: "",
  endAddress: "",
};

function loadStops(): DeliveryStop[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DeliveryStop[];
      const maxId = parsed.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0);
      nextId = maxId + 1;
      return parsed;
    }
  } catch {}
  return [];
}

function loadRouteConfig(): RouteConfig {
  try {
    const raw = localStorage.getItem(ROUTE_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_ROUTE_CONFIG;
}

let nextId = 1;

/** Haversine distance in km */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

async function getStartCoords(config: RouteConfig): Promise<{ lat: number; lng: number } | null> {
  if (config.startType === "manual" && config.startAddress.trim()) {
    return geocodeAddress(config.startAddress.trim());
  }
  // GPS
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 }
    );
  });
}

const Index = () => {
  const [stops, setStops] = useState<DeliveryStop[]>(loadStops);
  const [routeConfig, setRouteConfig] = useState<RouteConfig>(loadRouteConfig);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stops));
  }, [stops]);

  useEffect(() => {
    localStorage.setItem(ROUTE_CONFIG_KEY, JSON.stringify(routeConfig));
  }, [routeConfig]);

  const activeStop = stops.find((s) => s.status === "active");
  const hasPending = stops.some((s) => s.status === "pending");
  const hasCompleted = stops.some((s) => s.status === "completed");
  const allDone = stops.length > 0 && !activeStop && !hasPending;

  const activateNext = useCallback((currentStops: DeliveryStop[]): DeliveryStop[] => {
    const hasActive = currentStops.some((s) => s.status === "active");
    if (hasActive) return currentStops;

    const firstPending = currentStops.findIndex((s) => s.status === "pending");
    if (firstPending === -1) return currentStops;

    return currentStops.map((s, i) =>
      i === firstPending ? { ...s, status: "active" as const } : s
    );
  }, []);

  const handleAdd = useCallback((address: string, details?: PlaceDetails) => {
    const stopId = String(nextId++);
    const newStop: DeliveryStop = {
      id: stopId,
      address: details?.formattedAddress || address,
      formattedAddress: details?.formattedAddress,
      lat: details?.lat ?? null,
      lng: details?.lng ?? null,
      status: "pending",
    };

    setStops((prev) => activateNext([...prev, newStop]));

    // Auto-geocode if no coordinates
    if (newStop.lat == null || newStop.lng == null) {
      geocodeAddress(newStop.address).then((coords) => {
        if (coords) {
          setStops((prev) =>
            prev.map((s) =>
              s.id === stopId ? { ...s, lat: coords.lat, lng: coords.lng } : s
            )
          );
        }
      });
    }
  }, [activateNext]);

  const handleComplete = useCallback((id: string) => {
    setStops((prev) => {
      const updated = prev.map((s) =>
        s.id === id ? { ...s, status: "completed" as const } : s
      );
      return activateNext(updated);
    });
  }, [activateNext]);

  const [sorting, setSorting] = useState(false);

  const handleEdit = useCallback((id: string, newAddress: string) => {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, address: newAddress } : s))
    );
  }, []);

  const handleReturn = useCallback((id: string) => {
    setStops((prev) => {
      const item = prev.find((s) => s.id === id);
      if (!item) return prev;

      const rest = prev.filter((s) => s.id !== id).map((s) =>
        s.status === "active" ? { ...s, status: "pending" as const } : s
      );

      return [{ ...item, status: "active" as const }, ...rest];
    });
  }, []);

  const handleSortRoute = useCallback(async (direction: "far-first" | "near-first") => {
    const pendingStops = stops.filter((s) => s.status === "pending" || s.status === "active");
    if (pendingStops.length < 2) {
      toast.info("צריך לפחות 2 עצירות כדי לסדר מסלול");
      return;
    }

    setSorting(true);
    try {
      const start = await getStartCoords(routeConfig);
      if (!start) {
        toast.error("לא ניתן לקבוע נקודת התחלה – בדוק GPS או כתובת ידנית");
        setSorting(false);
        return;
      }

      const enriched = await Promise.all(
        stops.map(async (s) => {
          if (s.status === "completed") return s;
          if (s.lat != null && s.lng != null) return s;
          const coords = await geocodeAddress(s.address);
          if (coords) return { ...s, lat: coords.lat, lng: coords.lng };
          return s;
        })
      );

      const completed = enriched.filter((s) => s.status === "completed");
      const active = enriched.filter((s) => s.status === "pending" || s.status === "active").map(
        (s) => ({ ...s, status: "pending" as const })
      );

      const withDist = active.map((s) => ({
        stop: s,
        dist: s.lat != null && s.lng != null ? haversine(start.lat, start.lng, s.lat, s.lng) : -1,
      }));

      withDist.sort((a, b) => {
        if (a.dist === -1 && b.dist === -1) return 0;
        if (a.dist === -1) return 1;
        if (b.dist === -1) return -1;
        return direction === "far-first" ? b.dist - a.dist : a.dist - b.dist;
      });

      const sorted = [...withDist.map((w) => w.stop), ...completed];
      setStops(activateNext(sorted));
      toast.success(
        direction === "far-first"
          ? "המסלול סודר – מהרחוק לקרוב 🚚"
          : "המסלול סודר – מהקרוב לרחוק 🚚"
      );
    } catch {
      toast.error("שגיאה בסידור המסלול");
    } finally {
      setSorting(false);
    }
  }, [stops, routeConfig, activateNext]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card shadow-sm sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">🚚 Michael Delivery</h1>
          <button
            onClick={() => { localStorage.removeItem("isLoggedIn"); window.location.href = "/login"; }}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            התנתק
          </button>
        </div>
      </header>


      {/* Content */}
      <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
        {/* Route config */}
        <RouteConfigModal config={routeConfig} onSave={setRouteConfig} />
        <RouteSummary config={routeConfig} />

        {/* Sort route button */}
        {hasPending && (
          <div className="flex gap-2">
            <button
              onClick={() => handleSortRoute("far-first")}
              disabled={sorting}
              className="btn-outline flex-1 text-sm"
            >
              {sorting ? "⏳..." : "🗺️ רחוק → קרוב"}
            </button>
            <button
              onClick={() => handleSortRoute("near-first")}
              disabled={sorting}
              className="btn-outline flex-1 text-sm"
            >
              {sorting ? "⏳..." : "📍 קרוב → רחוק"}
            </button>
          </div>
        )}

        {/* Address Input */}
        <AddressInput onAdd={handleAdd} />

        {/* Active Delivery Hero */}
        {activeStop && (
          <ActiveDelivery stop={activeStop} onComplete={handleComplete} />
        )}

        {/* All done */}
        {allDone && (
          <div className="delivery-card text-center py-8 animate-fade-in">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-lg font-bold">כל המשלוחים הושלמו</p>
          </div>
        )}

        {/* Pending list */}
        <DeliveryList
          stops={stops}
          onComplete={handleComplete}
          onEdit={handleEdit}
        />

        {/* Completed */}
        <CompletedList
          stops={stops}
          onReturn={handleReturn}
          onDeleteCompleted={() => setStops((prev) => prev.filter((s) => s.status !== "completed"))}
          onRestoreCompleted={(restored) => setStops((prev) => [...prev, ...restored])}
        />
      </div>
    </div>
  );
};

export default Index;
