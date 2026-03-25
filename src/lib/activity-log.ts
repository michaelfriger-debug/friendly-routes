import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  actionType: "login" | "add_delivery" | "complete_delivery" | "delete_delivery",
  details?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("activity_log").insert({
      user_id: user.id,
      action_type: actionType,
      details: details || null,
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
