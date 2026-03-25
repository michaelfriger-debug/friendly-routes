import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const CacheStatsCard = () => {
  const [count, setCount] = useState<number | null>(null);
  const [latest, setLatest] = useState<{ address: string; created_at: string } | null>(null);
  const [clearing, setClearing] = useState(false);

  const fetchStats = async () => {
    const [{ count: total }, { data: latestRow }] = await Promise.all([
      supabase.from("geocode_cache").select("*", { count: "exact", head: true }),
      supabase.from("geocode_cache").select("address, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setCount(total ?? 0);
    setLatest(latestRow ?? null);
  };

  useEffect(() => { fetchStats(); }, []);

  const handleClear = async () => {
    setClearing(true);
    const { error } = await supabase.from("geocode_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast.error("שגיאה במחיקת הקאש");
    } else {
      toast.success("הקאש נוקה בהצלחה");
      setCount(0);
      setLatest(null);
    }
    setClearing(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-lg border border-border bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">סטטיסטיקות קאש</h3>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" className="text-xs" disabled={clearing || count === 0}>
              <Trash2 className="h-3 w-3 ml-1" />נקה קאש
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>ניקוי קאש</AlertDialogTitle>
              <AlertDialogDescription>האם למחוק את כל הקאש?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                מחק הכל
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">סה"כ כתובות בקאש</p>
          <p className="text-lg font-bold text-foreground">{count ?? "..."}</p>
        </div>
        <div>
          <p className="text-muted-foreground">הכתובת האחרונה שנשמרה</p>
          {latest ? (
            <>
              <p className="font-medium text-foreground truncate">{latest.address}</p>
              <p className="text-xs text-muted-foreground">{formatDate(latest.created_at)}</p>
            </>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CacheStatsCard;
