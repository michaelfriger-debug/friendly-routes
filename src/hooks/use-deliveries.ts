import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const DELIVERIES_KEY = ["deliveries"];

async function fetchDeliveries(): Promise<DeliveryStop[]> {
  const { data, error } = await supabase
    .from("deliveries")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load deliveries:", error);
    throw error;
  }
  return (data || []).map(rowToStop);
}

export function useDeliveries() {
  const queryClient = useQueryClient();

  const { data: stops = [], isLoading } = useQuery({
    queryKey: DELIVERIES_KEY,
    queryFn: fetchDeliveries,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const loaded = !isLoading;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: DELIVERIES_KEY });
  }, [queryClient]);

  const addStop = useCallback(async (stop: DeliveryStop) => {
    // Optimistic update
    queryClient.setQueryData<DeliveryStop[]>(DELIVERIES_KEY, (old = []) => [...old, stop]);

    const { error } = await supabase.from("deliveries").insert(stopToRow(stop));
    if (error) {
      console.error("Insert error:", error);
      toast.error("שגיאה בשמירת משלוח");
    }
    invalidate();
  }, [queryClient, invalidate]);

  const updateStop = useCallback(async (id: string, updates: Partial<DeliveryStop>) => {
    // Optimistic update
    queryClient.setQueryData<DeliveryStop[]>(DELIVERIES_KEY, (old = []) =>
      old.map((s) => (s.id === id ? { ...s, ...updates } : s))
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
    invalidate();
  }, [queryClient, invalidate]);

  const replaceAll = useCallback(async (newStops: DeliveryStop[]) => {
    queryClient.setQueryData<DeliveryStop[]>(DELIVERIES_KEY, newStops);

    const rows = newStops.map(stopToRow);
    const { error } = await supabase.from("deliveries").upsert(rows, { onConflict: "id" });
    if (error) {
      console.error("Upsert error:", error);
      toast.error("שגיאה בעדכון משלוחים");
    }
    invalidate();
  }, [queryClient, invalidate]);

  const deleteCompleted = useCallback(async () => {
    const completedIds = stops.filter((s) => s.status === "completed").map((s) => s.id);
    queryClient.setQueryData<DeliveryStop[]>(DELIVERIES_KEY, (old = []) =>
      old.filter((s) => s.status !== "completed")
    );

    if (completedIds.length > 0) {
      const { error } = await supabase.from("deliveries").delete().in("id", completedIds);
      if (error) {
        console.error("Delete error:", error);
        toast.error("שגיאה במחיקת משלוחים");
      }
    }
    invalidate();
  }, [stops, queryClient, invalidate]);

  const restoreStops = useCallback(async (restored: DeliveryStop[]) => {
    queryClient.setQueryData<DeliveryStop[]>(DELIVERIES_KEY, (old = []) => [...old, ...restored]);

    const rows = restored.map(stopToRow);
    const { error } = await supabase.from("deliveries").insert(rows);
    if (error) {
      console.error("Restore error:", error);
      toast.error("שגיאה בשחזור משלוחים");
    }
    invalidate();
  }, [queryClient, invalidate]);

  return { stops, loaded, addStop, updateStop, replaceAll, deleteCompleted, restoreStops };
}
