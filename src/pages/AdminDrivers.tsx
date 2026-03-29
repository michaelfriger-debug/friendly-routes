import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle, XCircle, Key, RefreshCw } from "lucide-react";

interface DriverRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  approved_at: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  active: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  pending: "ממתין",
  active: "פעיל",
  rejected: "נדחה",
};

const AdminDrivers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login", { replace: true }); return; }
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
    if (!userData || userData.role !== "admin") { navigate("/login", { replace: true }); return; }
    setAuthorized(true);
    await fetchDrivers();
  };

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching drivers:", error);
    else setDrivers((data as DriverRow[]) || []);
    setLoading(false);
  };

  const pendingCount = drivers.filter(d => d.status === "pending").length;

  const updateStatus = async (driverId: string, newStatus: string) => {
    const updateData: Record<string, string | null> = { status: newStatus };
    if (newStatus === "active") {
      updateData.approved_at = new Date().toISOString();
    }
    const { error } = await supabase.from("drivers").update(updateData).eq("id", driverId);
    if (error) {
      toast({ title: "שגיאה", description: "לא ניתן לעדכן סטטוס", variant: "destructive" });
    } else {
      toast({ title: "עודכן", description: newStatus === "active" ? "השליח אושר" : "השליח נדחה" });
      fetchDrivers();
    }
  };

  const handleResetPassword = async (driver: DriverRow) => {
    setResetLink(null);
    const { data, error } = await supabase.functions.invoke("reset-password", {
      body: { user_id: driver.id },
    });
    if (error || !data?.link) {
      toast({ title: "שגיאה", description: "לא ניתן ליצור קישור איפוס", variant: "destructive" });
    } else {
      setResetLink(data.link);
      toast({ title: "קישור נוצר", description: "העתק את הקישור ושלח לשליח" });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("he-IL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-background" dir="rtl" style={{ fontFamily: "'Heebo', sans-serif" }}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">🚛 ניהול שליחים</h1>
            {pendingCount > 0 && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                ממתינים לאישור: {pendingCount}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchDrivers}>
              <RefreshCw className="h-4 w-4 ml-1" />רענן
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin")}>
              <ArrowRight className="h-4 w-4 ml-2" />חזור לפאנל ניהול
            </Button>
          </div>
        </div>

        {resetLink && (
          <div className="mb-4 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-sm font-medium mb-1">קישור איפוס סיסמה:</p>
            <div className="flex gap-2 items-center">
              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 overflow-x-auto block">{resetLink}</code>
              <Button size="sm" variant="outline" onClick={() => {
                navigator.clipboard.writeText(resetLink);
                toast({ title: "הועתק!" });
              }}>
                העתק
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">טוען...</div>
        ) : (
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">אימייל</TableHead>
                  <TableHead className="text-right">טלפון</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">תאריך הרשמה</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{d.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{d.phone}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[d.status] || "bg-muted text-muted-foreground"}>
                        {statusLabels[d.status] || d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(d.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {d.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline"
                              className="text-xs text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/10"
                              onClick={() => updateStatus(d.id, "active")}>
                              <CheckCircle className="h-3 w-3 ml-1" />אשר
                            </Button>
                            <Button size="sm" variant="outline"
                              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => updateStatus(d.id, "rejected")}>
                              <XCircle className="h-3 w-3 ml-1" />דחה
                            </Button>
                          </>
                        )}
                        {d.status === "active" && (
                          <Button size="sm" variant="outline" className="text-xs"
                            onClick={() => handleResetPassword(d)}>
                            <Key className="h-3 w-3 ml-1" />אפס סיסמה
                          </Button>
                        )}
                        {d.status === "rejected" && (
                          <Button size="sm" variant="outline"
                            className="text-xs text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/10"
                            onClick={() => updateStatus(d.id, "active")}>
                            <CheckCircle className="h-3 w-3 ml-1" />אשר בכל זאת
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {drivers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      אין שליחים רשומים
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDrivers;
