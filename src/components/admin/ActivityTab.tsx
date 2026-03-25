import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";

interface ActivityRow {
  id: string;
  user_id: string | null;
  action_type: string;
  details: any;
  created_at: string;
}

interface UserInfo {
  id: string;
  name: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  login: "🔐 התחבר",
  add_delivery: "➕ הוסיף כתובת",
  complete_delivery: "✅ סיים משלוח",
  delete_delivery: "🗑️ מחק כתובת",
  quota_warning: "⚠️ חריגת מכסה (80%)",
  login_failed: "🚫 כישלון התחברות",
  error: "❌ שגיאה",
};

const ActivityTab = () => {
  const [logs, setLogs] = useState<ActivityRow[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetchData();

    // Realtime subscription for new activity
    const channel = supabase
      .channel("admin-activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => {
          const newRow = payload.new as ActivityRow;
          setLogs((prev) => [newRow, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: logData }, { data: userData }] = await Promise.all([
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("users").select("id, name"),
    ]);
    setLogs(logData || []);
    setUsers(userData || []);
    setLoading(false);
  };

  const userMap = useMemo(() => {
    const m: Record<string, string> = {};
    users.forEach((u) => { m[u.id] = u.name || "—"; });
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (selectedUser !== "all" && l.user_id !== selectedUser) return false;
      if (actionFilter === "logins" && l.action_type !== "login" && l.action_type !== "login_failed") return false;
      if (actionFilter === "deliveries" && !["add_delivery", "complete_delivery", "delete_delivery"].includes(l.action_type)) return false;
      if (actionFilter === "errors" && !["login_failed", "error", "quota_warning"].includes(l.action_type)) return false;
      if (dateFrom && l.created_at < dateFrom) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);
        if (l.created_at >= to.toISOString()) return false;
      }
      return true;
    });
  }, [logs, selectedUser, actionFilter, dateFrom, dateTo]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("he-IL", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const exportCSV = () => {
    const header = "תאריך,נהג,פעולה,כתובת,שם לקוח,פרטי שגיאה\n";
    const rows = filtered.map((l) => {
      const details = l.details || {};
      return [
        formatDate(l.created_at),
        l.user_id ? userMap[l.user_id] || "—" : "—",
        ACTION_LABELS[l.action_type] || l.action_type,
        details.address || "",
        details.customer_name || "",
        details.reason || details.error || "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    }).join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRowColor = (actionType: string) => {
    if (["login_failed", "error"].includes(actionType)) return "bg-destructive/10";
    if (actionType === "quota_warning") return "bg-orange-500/10";
    return "";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger><SelectValue placeholder="נהג" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הנהגים</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name || u.id.slice(0, 8)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger><SelectValue placeholder="סוג" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="logins">התחברויות</SelectItem>
            <SelectItem value="deliveries">משלוחים</SelectItem>
            <SelectItem value="errors">שגיאות</SelectItem>
          </SelectContent>
        </Select>

        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="מתאריך" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="עד תאריך" />

        <Button variant="outline" size="sm" onClick={exportCSV} className="h-10">
          <Download className="h-3 w-3 ml-1" /> ייצא CSV
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{filtered.length} רשומות</span>
        <span className="text-xs text-green-600 animate-pulse">● מתעדכן בזמן אמת</span>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">טוען...</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">תאריך ושעה</TableHead>
                <TableHead className="text-right">נהג</TableHead>
                <TableHead className="text-right">פעולה</TableHead>
                <TableHead className="text-right">פרטים</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id} className={getRowColor(l.action_type)}>
                  <TableCell className="text-sm">{formatDate(l.created_at)}</TableCell>
                  <TableCell className="text-sm">{l.user_id ? userMap[l.user_id] || "—" : "—"}</TableCell>
                  <TableCell className="text-sm">{ACTION_LABELS[l.action_type] || l.action_type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.details?.address || ""}
                    {l.details?.customer_name ? ` (${l.details.customer_name})` : ""}
                    {l.details?.reason ? ` — ${l.details.reason}` : ""}
                    {l.details?.email ? ` [${l.details.email}]` : ""}
                    {l.details?.error ? ` — ${l.details.error}` : ""}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    אין רשומות
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ActivityTab;
