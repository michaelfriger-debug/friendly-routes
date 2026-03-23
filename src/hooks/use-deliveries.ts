import { useState, useEffect, useCallback } from "react";
import type { DeliveryStop } from "@/types/delivery";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function rowToStop(row: any): DeliveryStop {
  return {
    id: row.id,
    address: row.address || "",
    formattedAddress: row.formatted_address || undefined,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    status: row.status as DeliveryStop["status"],
    completedAt: row.completed_at || undefined,
  };
}

function stopToRow(stop: DeliveryStop) {
  return {
    id: stop.id,
    address: stop.address,
    formatted_address: stop.formattedAddress || "",
    lat: stop.lat,
    lng: stop.lng,
    status: stop.status,
    completed_at: stop.completedAt || null,
    customer_name: "",
    phone: "",
  };
}

export function useDeliveries() {
  const [stops, setStops] = useState<DeliveryStop[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Initial fetch
  useEffect(() => {
    const fetchStops = async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load deliveries:", error);
        toast.error("שגיאה בטעינת משלוחים");
      } else {
        setStops((data || []).map(rowToStop));
      }
      setLoaded(true);
    };
    fetchStops();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("deliveries-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newStop = rowToStop(payload.new);
            setStops((prev) => {
              if (prev.some((s) => s.id === newStop.id)) return prev;
              return [...prev, newStop];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToStop(payload.new);
            setStops((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any).id;
            setStops((prev) => prev.filter((s) => s.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addStop = useCallback(async (stop: DeliveryStop) => {
    // Optimistic update
    setStops((prev) => [...prev, stop]);

    const { error } = await supabase.from("deliveries").insert(stopToRow(stop));
    if (error) {
      console.error("Insert error:", error);
      toast.error("שגיאה בשמירת משלוח");
      setStops((prev) => prev.filter((s) => s.id !== stop.id));
    }
  }, []);

  const updateStop = useCallback(async (id: string, updates: Partial<DeliveryStop>) => {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );

    const dbUpdates: any = {};
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.formattedAddress !== undefined) dbUpdates.formatted_address = updates.formattedAddress;
    if (updates.lat !== undefined) dbUpdates.lat = updates.lat;
    if (updates.lng !== undefined) dbUpdates.lng = updates.lng;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;

    const { error } = await supabase.from("deliveries").update(dbUpdates).eq("id", id);
    if (error) {
      console.error("Update error:", error);
      toast.error("שגיאה בעדכון משלוח");
    }
  }, []);

  const replaceAll = useCallback(async (newStops: DeliveryStop[]) => {
    setStops(newStops);

    // Batch upsert all stops
    const rows = newStops.map(stopToRow);
    const { error } = await supabase.from("deliveries").upsert(rows, { onConflict: "id" });
    if (error) {
      console.error("Upsert error:", error);
      toast.error("שגיאה בעדכון משלוחים");
    }
  }, []);

  const deleteCompleted = useCallback(async () => {
    const completedIds = stops.filter((s) => s.status === "completed").map((s) => s.id);
    setStops((prev) => prev.filter((s) => s.status !== "completed"));

    if (completedIds.length > 0) {
      const { error } = await supabase.from("deliveries").delete().in("id", completedIds);
      if (error) {
        console.error("Delete error:", error);
        toast.error("שגיאה במחיקת משלוחים");
      }
    }
  }, [stops]);

  const restoreStops = useCallback(async (restored: DeliveryStop[]) => {
    setStops((prev) => [...prev, ...restored]);

    const rows = restored.map(stopToRow);
    const { error } = await supabase.from("deliveries").insert(rows);
    if (error) {
      console.error("Restore error:", error);
      toast.error("שגיאה בשחזור משלוחים");
    }
  }, []);

  return { stops, setStops, loaded, addStop, updateStop, replaceAll, deleteCompleted, restoreStops };
}
