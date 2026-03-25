import { supabase } from "@/integrations/supabase/client";

type ActivityAction =
  | "login"
  | "add_delivery"
  | "complete_delivery"
  | "delete_delivery"
  | "login_failed"
  | "error";

export async function logActivity(
  actionType: ActivityAction,
  details?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("activity_log").insert({
      user_id: user?.id || null,
      action_type: actionType,
      details: details || null,
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
