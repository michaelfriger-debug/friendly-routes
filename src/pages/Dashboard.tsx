import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Phone, User, Package } from "lucide-react";

interface CourierData {
  full_name: string;
  phone: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courier, setCourier] = useState<CourierData | null>(null);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      const { data, error } = await supabase
        .from("couriers")
        .select("full_name, phone")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setCourier(data);
      }

      setLoading(false);
    };

    checkAuthAndFetch();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            <span className="inline-block" style={{ transform: "scaleX(-1)" }}>🚚</span>{" "}
            דשבורד שליח
          </h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 ml-2" />
            התנתק
          </Button>
        </div>

        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              ברוך הבא{courier?.full_name ? `, ${courier.full_name}` : ""}!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {courier ? (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium">שם מלא:</span>
                  <span>{courier.full_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="font-medium">טלפון:</span>
                  <span dir="ltr">{courier.phone}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">
                לא נמצאו פרטי שליח. פנה למנהל המערכת.
              </p>
            )}
          </CardContent>
        </Card>

        {/* My Deliveries Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-primary" />
              המשלוחים שלי
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              אין משלוחים להצגה כרגע.
              <br />
              <span className="text-sm">המשלוחים שלך יופיעו כאן בקרוב.</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
