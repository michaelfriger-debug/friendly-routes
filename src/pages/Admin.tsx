import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Shield, Truck, Ban, CheckCircle, Trash2, UserPlus, Settings, RotateCcw } from "lucide-react";
import QuotaDialog from "@/components/admin/QuotaDialog";
import ActivityTab from "@/components/admin/ActivityTab";

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
  last_login: string | null;
  created_at: string | null;
  points_limit: number | null;
  points_used_this_month: number | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("courier");
  const [creating, setCreating] = useState(false);

  const [quotaUser, setQuotaUser] = useState<UserRow | null>(null);

  useEffect(() => { checkAdminAndLoad(); }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login", { replace: true }); return; }
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
    if (!userData || userData.role !== "admin") { navigate("/login", { replace: true }); return; }
    setAuthorized(true);
    await fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    if (error) console.error("Error fetching users:", error);
    else setUsers(data || []);
    setLoading(false);
  };

  const toggleActive = async (user: UserRow) => {
    const newStatus = !user.is_active;
    const { error } = await supabase.from("users").update({ is_active: newStatus }).eq("id", user.id);
    if (error) toast({ title: "שגיאה", description: "לא ניתן לעדכן סטטוס", variant: "destructive" });
    else { toast({ title: "עודכן", description: newStatus ? "המשתמש שוחרר" : "המשתמש נחסם" }); fetchUsers(); }
  };

  const toggleRole = async (user: UserRow) => {
    const nr = user.role === "admin" ? "courier" : "admin";
    const { error } = await supabase.from("users").update({ role: nr }).eq("id", user.id);
    if (error) toast({ title: "שגיאה", description: "לא ניתן לעדכן תפקיד", variant: "destructive" });
    else { toast({ title: "עודכן", description: `התפקיד שונה ל-${nr === "admin" ? "אדמין" : "נהג"}` }); fetchUsers(); }
  };

  const resetQuota = async (user: UserRow) => {
    const { error } = await supabase.from("users").update({ points_used_this_month: 0 }).eq("id", user.id);
    if (error) toast({ title: "שגיאה", description: "לא ניתן לאפס", variant: "destructive" });
    else { toast({ title: "עודכן", description: "המכסה אופסה" }); fetchUsers(); }
  };

  const deleteUser = async (user: UserRow) => {
    const { error: dbError } = await supabase.from("users").delete().eq("id", user.id);
    if (dbError) { toast({ title: "שגיאה", description: "לא ניתן למחוק מהטבלה", variant: "destructive" }); return; }
    const { error: fnError } = await supabase.functions.invoke("delete-user", { body: { user_id: user.id } });
    if (fnError) toast({ title: "אזהרה", description: "המשתמש נמחק מהטבלה אך לא מהאימות", variant: "destructive" });
    else toast({ title: "נמחק", description: "המשתמש נמחק בהצלחה" });
    fetchUsers();
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword || !newName) {
      toast({ title: "שגיאה", description: "יש למלא את כל השדות", variant: "destructive" }); return;
    }
    setCreating(true);
    const { data: fnData, error: fnError } = await supabase.functions.invoke("create-user", {
      body: { email: newEmail, password: newPassword },
    });
    if (fnError || !fnData?.user) {
      toast({ title: "שגיאה", description: fnData?.error || fnError?.message || "שגיאה ביצירת משתמש", variant: "destructive" });
      setCreating(false); return;
    }
    const { error: insertError } = await supabase.from("users").insert({
      id: fnData.user.id, email: newEmail, name: newName, role: newRole,
    });
    if (insertError) toast({ title: "שגיאה", description: "המשתמש נוצר באימות אך לא נשמר בטבלה", variant: "destructive" });
    else {
      toast({ title: "הצלחה", description: "המשתמש נוצר בהצלחה! 🎉" });
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole("courier"); fetchUsers();
    }
    setCreating(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-background" dir="rtl" style={{ fontFamily: "'Heebo', sans-serif" }}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">🛡️ פאנל ניהול</h1>
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowRight className="h-4 w-4 ml-2" />חזור לדף הראשי
          </Button>
        </div>

        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="manage">ניהול משתמשים</TabsTrigger>
            <TabsTrigger value="add">הוספת משתמש</TabsTrigger>
            <TabsTrigger value="activity">פעילות נהגים</TabsTrigger>
          </TabsList>

          <TabsContent value="manage">
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">טוען...</div>
            ) : (
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">שם</TableHead>
                      <TableHead className="text-right">אימייל</TableHead>
                      <TableHead className="text-right">תפקיד</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">מכסה חודשית</TableHead>
                      <TableHead className="text-right">כניסה אחרונה</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => {
                      const used = u.points_used_this_month ?? 0;
                      const limit = u.points_limit ?? 20;
                      const pct = limit > 0 ? (used / limit) * 100 : 0;
                      const qColor = pct >= 100 ? "text-destructive" : pct >= 80 ? "text-orange-500" : "text-green-600";
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{u.email || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === "admin" ? "default" : "secondary"}
                              className={u.role === "admin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>
                              {u.role === "admin" ? "אדמין" : "נהג"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={u.is_active ? "bg-secondary text-secondary-foreground" : "bg-destructive text-destructive-foreground"}>
                              {u.is_active ? "פעיל" : "מושבת"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm font-medium ${qColor}`}>{used} / {limit}</span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(u.last_login)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => toggleActive(u)} className="text-xs">
                                {u.is_active ? <><Ban className="h-3 w-3 ml-1" />חסום</> : <><CheckCircle className="h-3 w-3 ml-1" />שחרר</>}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => toggleRole(u)} className="text-xs">
                                {u.role === "admin" ? <><Truck className="h-3 w-3 ml-1" />נהג</> : <><Shield className="h-3 w-3 ml-1" />אדמין</>}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setQuotaUser(u)} className="text-xs">
                                <Settings className="h-3 w-3 ml-1" />שנה מכסה
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => resetQuota(u)} className="text-xs">
                                <RotateCcw className="h-3 w-3 ml-1" />אפס חודש
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive" className="text-xs">
                                    <Trash2 className="h-3 w-3 ml-1" />מחק
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent dir="rtl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>מחיקת משתמש</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      האם אתה בטוח שברצונך למחוק את {u.name || u.email}? פעולה זו אינה ניתנת לביטול.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-row-reverse gap-2">
                                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteUser(u)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      מחק
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">לא נמצאו משתמשים</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="add">
            <div className="max-w-md mx-auto space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">יצירת משתמש חדש</h2>
              </div>
              <div className="space-y-3">
                <Input placeholder="שם מלא" value={newName} onChange={(e) => setNewName(e.target.value)} dir="rtl" />
                <Input placeholder="אימייל" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} dir="rtl" />
                <Input placeholder="סיסמה" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} dir="rtl" />
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger dir="rtl"><SelectValue placeholder="תפקיד" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="courier">נהג</SelectItem>
                    <SelectItem value="admin">אדמין</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreateUser} disabled={creating}>
                {creating ? "יוצר משתמש..." : "צור משתמש"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab />
          </TabsContent>
        </Tabs>

        {quotaUser && (
          <QuotaDialog
            open={!!quotaUser}
            onClose={() => setQuotaUser(null)}
            userId={quotaUser.id}
            userName={quotaUser.name}
            currentLimit={quotaUser.points_limit ?? 20}
            onUpdated={fetchUsers}
          />
        )}
      </div>
    </div>
  );
};

export default Admin;
