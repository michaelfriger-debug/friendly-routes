import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  users: UserRow[];
  onTransferred: () => void;
}

const TransferDataDialog = ({ open, onClose, users, onTransferred }: Props) => {
  const [fromUser, setFromUser] = useState("");
  const [toUser, setToUser] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleTransfer = async () => {
    if (!fromUser || !toUser || fromUser === toUser) {
      toast({ title: "שגיאה", description: "יש לבחור שני משתמשים שונים", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Transfer only active (non-completed) deliveries
    const { data: deliveries, error: fetchErr } = await supabase
      .from("deliveries")
      .select("id")
      .eq("user_id", fromUser)
      .neq("status", "completed");

    if (fetchErr) {
      toast({ title: "שגיאה", description: "לא ניתן לשלוף משלוחים", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!deliveries || deliveries.length === 0) {
      toast({ title: "אין נתונים", description: "אין משלוחים פעילים להעברה" });
      setLoading(false);
      return;
    }

    const ids = deliveries.map((d) => d.id);
    const { error: updateErr } = await supabase
      .from("deliveries")
      .update({ user_id: toUser })
      .in("id", ids);

    if (updateErr) {
      toast({ title: "שגיאה", description: "שגיאה בהעברת משלוחים", variant: "destructive" });
    } else {
      const fromName = users.find((u) => u.id === fromUser)?.name || "משתמש";
      const toName = users.find((u) => u.id === toUser)?.name || "משתמש";
      toast({ title: "הצלחה", description: `${deliveries.length} משלוחים הועברו מ-${fromName} ל-${toName}` });
      onTransferred();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>העברת משלוחים פעילים</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">מהמשתמש:</label>
            <Select value={fromUser} onValueChange={setFromUser}>
              <SelectTrigger><SelectValue placeholder="בחר משתמש מקור" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name || u.email || u.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">למשתמש:</label>
            <Select value={toUser} onValueChange={setToUser}>
              <SelectTrigger><SelectValue placeholder="בחר משתמש יעד" /></SelectTrigger>
              <SelectContent>
                {users.filter((u) => u.id !== fromUser).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name || u.email || u.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex-row-reverse gap-2">
          <Button onClick={handleTransfer} disabled={loading}>
            {loading ? "מעביר..." : "העבר משלוחים"}
          </Button>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferDataDialog;
