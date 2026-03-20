import { useState, useCallback, useEffect } from "react";
import type { DeliveryStop } from "@/types/delivery";
import MapPlaceholder from "@/components/delivery/MapPlaceholder";
import AddressInput from "@/components/delivery/AddressInput";
import ActiveDelivery from "@/components/delivery/ActiveDelivery";
import DeliveryList from "@/components/delivery/DeliveryList";
import CompletedList from "@/components/delivery/CompletedList";

const STORAGE_KEY = "michael-delivery-stops";

function loadStops(): DeliveryStop[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DeliveryStop[];
      // Restore nextId to avoid collisions
      const maxId = parsed.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0);
      nextId = maxId + 1;
      return parsed;
    }
  } catch {}
  return [];
}

let nextId = 1;

const Index = () => {
  const [stops, setStops] = useState<DeliveryStop[]>(loadStops);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stops));
  }, [stops]);

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

  const handleAdd = useCallback((address: string) => {
    setStops((prev) => {
      const newStop: DeliveryStop = {
        id: String(nextId++),
        address,
        lat: null,
        lng: null,
        status: "pending",
      };
      return activateNext([...prev, newStop]);
    });
  }, [activateNext]);

  const handleComplete = useCallback((id: string) => {
    setStops((prev) => {
      const updated = prev.map((s) =>
        s.id === id ? { ...s, status: "completed" as const } : s
      );
      return activateNext(updated);
    });
  }, [activateNext]);

  const handleEdit = useCallback((id: string, newAddress: string) => {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, address: newAddress } : s))
    );
  }, []);

  const handleReturn = useCallback((id: string) => {
    setStops((prev) => {
      // Move returned item to top, set pending, deactivate current active
      const item = prev.find((s) => s.id === id);
      if (!item) return prev;

      const rest = prev.filter((s) => s.id !== id).map((s) =>
        s.status === "active" ? { ...s, status: "pending" as const } : s
      );

      return [{ ...item, status: "active" as const }, ...rest];
    });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="bg-card shadow-sm sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-xl font-bold">🚚 Michael Delivery</h1>
        </div>
      </header>

      {/* Map */}
      <MapPlaceholder />

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
        {/* Route config label */}
        <p className="text-sm font-semibold text-muted-foreground">⚙️ הגדר מסלול</p>

        {/* Address Input */}
        <AddressInput onAdd={handleAdd} />

        {/* Active Delivery */}
        {activeStop && <ActiveDelivery stop={activeStop} />}

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
        {hasCompleted && <CompletedList stops={stops} onReturn={handleReturn} />}
      </div>
    </div>
  );
};

export default Index;
