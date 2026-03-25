import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string | null;
}

const ResetPasswordDialog = ({ open, onClose, userId, userName }: Props) => {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "שגיאה", description: "הסיסמה חייבת להכיל לפחות 6 תווים", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("reset-password", {
      body: { user_id: userId, new_password: newPassword },
    });
    if (error || data?.error) {
      toast({ title: "שגיאה", description: data?.error || error?.message || "שגיאה באיפוס סיסמה", variant: "destructive" });
    } else {
      toast({ title: "הצלחה", description: `הסיסמה אופסה בהצלחה עבור ${userName || "המשתמש"}` });
      setNewPassword("");
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => { setNewPassword(""); onClose(); }}>
      <DialogContent dir="rtl" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>איפוס סיסמה - {userName || "משתמש"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            type="password"
            placeholder="סיסמה חדשה (מינימום 6 תווים)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            dir="rtl"
          />
        </div>
        <DialogFooter className="flex-row-reverse gap-2">
          <Button onClick={handleReset} disabled={loading}>
            {loading ? "מאפס..." : "אפס סיסמה"}
          </Button>
          <Button variant="outline" onClick={() => { setNewPassword(""); onClose(); }}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;
