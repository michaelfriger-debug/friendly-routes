import { useState, useCallback, useEffect } from "react";
import type { DeliveryStop, PlaceDetails } from "@/types/delivery";
import AddressInput from "@/components/delivery/AddressInput";
import ActiveDelivery from "@/components/delivery/ActiveDelivery";
import DeliveryList from "@/components/delivery/DeliveryList";
import CompletedList from "@/components/delivery/CompletedList";
import RouteConfigModal, { type RouteConfig } from "@/components/delivery/RouteConfigModal";
import RouteSummary from "@/components/delivery/RouteSummary";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDeliveries } from "@/hooks/use-deliveries";
import { useQuota } from "@/hooks/use-quota";
import { logActivity } from "@/lib/activity-log";

const ROUTE_CONFIG_KEY = "michael-route-config";

const DEFAULT_ROUTE_CONFIG: RouteConfig = {
  startType: "gps",
  startAddress: "",
  endAddress: "",
};

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
    const { data: cacheData } = await supabase
      .from("geocode_cache")
      .select("lat, lng")
      .eq("address", address)
      .single();

    if (cacheData?.lat && cacheData?.lng) {
      return { lat: cacheData.lat, lng: cacheData.lng };
    }

    const { data, error } = await supabase.functions.invoke("google-places", {
      body: { action: "geocode", input: address },
    });
    if (error || !data?.lat || !data?.lng) return null;

    await supabase.from("geocode_cache").insert({
      address,
      lat: data.lat,
      lng: data.lng,
    });

    return { lat: data.lat, lng: data.lng };
  } catch {
    return null;
  }
}

async function getStartCoords(config: RouteConfig): Promise<{ lat: number; lng: number } | null> {
  if (config.startType === "manual" && config.startAddress.trim()) {
    return geocodeAddress(config.startAddress.trim());
  }
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
  const { stops, loaded, addStop, updateStop, replaceAll, deleteCompleted, restoreStops } = useDeliveries();
  const [routeConfig, setRouteConfig] = useState<RouteConfig>(loadRouteConfig);
  const [sorting, setSorting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const quota = useQuota();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("users").select("role").eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data?.role === "admin") setIsAdmin(true);
      });
    });
  }, []);

  // Persist route config to localStorage
  const handleRouteConfigSave = useCallback((config: RouteConfig) => {
    setRouteConfig(config);
    localStorage.setItem(ROUTE_CONFIG_KEY, JSON.stringify(config));
  }, []);

  const activeStop = stops.find((s) => s.status === "active");
  const hasPending = stops.some((s) => s.status === "pending");
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

  const handleAdd = useCallback(async (address: string, details?: PlaceDetails) => {
    // Check quota
    const { allowed, message } = await quota.checkAndIncrement();
    if (!allowed) {
      toast.error(message || "חריגה ממכסה");
      return;
    }

    const stopId = crypto.randomUUID();
    const newStop: DeliveryStop = {
      id: stopId,
      address,
      formattedAddress: details?.formattedAddress,
      lat: details?.lat ?? null,
      lng: details?.lng ?? null,
      status: stops.some((s) => s.status === "active" || s.status === "pending") ? "pending" : "active",
    };

    addStop(newStop);
    logActivity("add_delivery", { address });

    // Auto-geocode if no coordinates
    if (newStop.lat == null || newStop.lng == null) {
      geocodeAddress(newStop.address).then((coords) => {
        if (coords) {
          updateStop(stopId, { lat: coords.lat, lng: coords.lng });
        }
      });
    }
  }, [stops, addStop, updateStop]);

  const handleComplete = useCallback((id: string) => {
    const completedAt = new Date().toISOString();
    const stop = stops.find((s) => s.id === id);
    if (stop) logActivity("complete_delivery", { address: stop.address });
    updateStop(id, { status: "completed", completedAt });

    // Activate next pending
    const remaining = stops.filter((s) => s.id !== id && s.status === "pending");
    if (remaining.length > 0 && !stops.some((s) => s.id !== id && s.status === "active")) {
      updateStop(remaining[0].id, { status: "active" });
    }
  }, [stops, updateStop]);

  const handleEdit = useCallback((id: string, newAddress: string) => {
    updateStop(id, { address: newAddress });
  }, [updateStop]);

  const handleCoordsResolved = useCallback((id: string, coords: { lat: number; lng: number }) => {
    updateStop(id, { lat: coords.lat, lng: coords.lng });
  }, [updateStop]);

  const handleReturn = useCallback((id: string) => {
    // Set all active to pending, then set this one to active
    const newStops = stops.map((s) => {
      if (s.id === id) return { ...s, status: "active" as const, completedAt: undefined };
      if (s.status === "active") return { ...s, status: "pending" as const };
      return s;
    });
    // Move the returned item to the front
    const returned = newStops.find((s) => s.id === id)!;
    const rest = newStops.filter((s) => s.id !== id);
    replaceAll([returned, ...rest]);
  }, [stops, replaceAll]);

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

      const sorted = activateNext([...withDist.map((w) => w.stop), ...completed]);
      replaceAll(sorted);
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
  }, [stops, routeConfig, activateNext, replaceAll]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">⏳ טוען משלוחים...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-card shadow-sm sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">🚚 Michael Delivery</h1>
            {!quota.loading && (
              <span className={`text-xs font-medium ${quota.color}`}>
                נקודות: {quota.pointsUsed}/{quota.pointsLimit}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <a
                href="/admin"
                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
              >
                ניהול
              </a>
            )}
            <button
              onClick={() => { localStorage.removeItem("isLoggedIn"); window.location.href = "/login"; }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              התנתק
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
        <RouteConfigModal config={routeConfig} onSave={handleRouteConfigSave} />
        <RouteSummary config={routeConfig} />

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

        <AddressInput onAdd={handleAdd} />

        {activeStop && (
          <ActiveDelivery stop={activeStop} onComplete={handleComplete} onCoordsResolved={handleCoordsResolved} />
        )}

        {allDone && (
          <div className="delivery-card text-center py-8 animate-fade-in">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-lg font-bold">כל המשלוחים הושלמו</p>
          </div>
        )}

        <DeliveryList
          stops={stops}
          onComplete={handleComplete}
          onEdit={handleEdit}
          onCoordsResolved={handleCoordsResolved}
        />

        <CompletedList
          stops={stops}
          onReturn={handleReturn}
          onDeleteCompleted={deleteCompleted}
          onRestoreCompleted={restoreStops}
        />
        <ThemeToggle />
      </div>
    </div>
  );
};

export default Index;
