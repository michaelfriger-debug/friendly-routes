import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuotaDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string | null;
  currentLimit: number;
  onUpdated: () => void;
}

const QuotaDialog = ({ open, onClose, userId, userName, currentLimit, onUpdated }: QuotaDialogProps) => {
  const [limit, setLimit] = useState(currentLimit);
  const { toast } = useToast();

  const handleSave = async () => {
    const { error } = await supabase
      .from("users")
      .update({ points_limit: limit })
      .eq("id", userId);

    if (error) {
      toast({ title: "שגיאה", description: "לא ניתן לעדכן מכסה", variant: "destructive" });
    } else {
      toast({ title: "עודכן", description: `המכסה עודכנה ל-${limit}` });
      onUpdated();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>שנה מכסה - {userName || "משתמש"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <label className="text-sm text-muted-foreground">מכסת נקודות חודשית</label>
          <Input
            type="number"
            min={0}
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
          />
        </div>
        <DialogFooter className="flex-row-reverse gap-2">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={handleSave}>שמור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuotaDialog;
