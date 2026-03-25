import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface QuotaInfo {
  pointsLimit: number;
  pointsUsed: number;
  quotaResetDate: string | null;
  loading: boolean;
}

export function useQuota() {
  const [quota, setQuota] = useState<QuotaInfo>({
    pointsLimit: 20,
    pointsUsed: 0,
    quotaResetDate: null,
    loading: true,
  });

  const fetchQuota = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("users")
      .select("points_limit, points_used_this_month, quota_reset_date")
      .eq("id", user.id)
      .maybeSingle();

    if (!data) {
      setQuota((q) => ({ ...q, loading: false }));
      return;
    }

    // Check if we need to reset the month
    const now = new Date();
    const resetDate = data.quota_reset_date ? new Date(data.quota_reset_date) : new Date();
    const nextReset = new Date(resetDate.getFullYear(), resetDate.getMonth() + 1, 1);

    if (now >= nextReset) {
      // Reset quota
      const newResetDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      await supabase
        .from("users")
        .update({ points_used_this_month: 0, quota_reset_date: newResetDate })
        .eq("id", user.id);

      setQuota({
        pointsLimit: data.points_limit ?? 20,
        pointsUsed: 0,
        quotaResetDate: newResetDate,
        loading: false,
      });
    } else {
      setQuota({
        pointsLimit: data.points_limit ?? 20,
        pointsUsed: data.points_used_this_month ?? 0,
        quotaResetDate: data.quota_reset_date,
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  const checkAndIncrement = useCallback(async (): Promise<{ allowed: boolean; message?: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: false, message: "לא מחובר" };

    // Re-fetch fresh data
    const { data } = await supabase
      .from("users")
      .select("points_limit, points_used_this_month, quota_reset_date")
      .eq("id", user.id)
      .maybeSingle();

    if (!data) return { allowed: true };

    const limit = data.points_limit ?? 20;
    const used = data.points_used_this_month ?? 0;

    // Check monthly reset
    const now = new Date();
    const resetDate = data.quota_reset_date ? new Date(data.quota_reset_date) : new Date();
    const nextReset = new Date(resetDate.getFullYear(), resetDate.getMonth() + 1, 1);

    let currentUsed = used;
    if (now >= nextReset) {
      const newResetDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      await supabase
        .from("users")
        .update({ points_used_this_month: 0, quota_reset_date: newResetDate })
        .eq("id", user.id);
      currentUsed = 0;
    }

    if (currentUsed >= limit) {
      const resetStr = nextReset.toLocaleDateString("he-IL");
      return {
        allowed: false,
        message: `הגעת למגבלת הנקודות החודשית שלך (${currentUsed}/${limit} נקודות).\nהמכסה מתאפסת ב-${resetStr}. לשדרוג פנה למנהל.`,
      };
    }

    // Increment
    const newUsed = currentUsed + 1;
    await supabase
      .from("users")
      .update({ points_used_this_month: newUsed })
      .eq("id", user.id);

    // Notify admins when driver reaches 80% quota
    const pct = (newUsed / limit) * 100;
    if (pct >= 80 && ((currentUsed / limit) * 100) < 80) {
      // Just crossed the 80% threshold
      const { data: userData } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      const driverName = userData?.name || user.email || "נהג";
      await supabase.from("activity_log").insert({
        user_id: user.id,
        action_type: "quota_warning",
        details: { driver_name: driverName, used: newUsed, limit, percent: Math.round(pct) },
      });
    }

    setQuota((q) => ({ ...q, pointsUsed: newUsed }));
    return { allowed: true };
  }, []);

  const getNextResetDate = useCallback(() => {
    if (!quota.quotaResetDate) return null;
    const d = new Date(quota.quotaResetDate);
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }, [quota.quotaResetDate]);

  const usagePercent = quota.pointsLimit > 0 ? (quota.pointsUsed / quota.pointsLimit) * 100 : 0;
  const color = usagePercent >= 100 ? "text-destructive" : usagePercent >= 80 ? "text-orange-500" : "text-green-600";

  return { ...quota, checkAndIncrement, refresh: fetchQuota, usagePercent, color, getNextResetDate };
}
