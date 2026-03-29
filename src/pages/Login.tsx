import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity-log";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("savedCredentials");
    if (saved) {
      const { email: e, password: p } = JSON.parse(saved);
      setEmail(e);
      setPassword(p);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/", { replace: true });
    });
  }, [navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    const fullEmail = email.includes("@") ? email : `${email}@local.delivery`;
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: fullEmail,
      password,
    });

    if (authError || !data.user) {
      console.error("Auth error:", authError);
      setError("אימייל או סיסמה שגויים");
      logActivity("login_failed", { email: fullEmail, reason: authError?.message || "unknown" });
      setLoading(false);
      return;
    }

    const user = data.user;

    // Check driver status
    const { data: driverData } = await supabase
      .from("drivers")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();

    if (driverData) {
      if (driverData.status === "pending") {
        await supabase.auth.signOut();
        setError("הפרופיל שלך ממתין לאישור מנהל.");
        setLoading(false);
        return;
      }
      if (driverData.status === "rejected") {
        await supabase.auth.signOut();
        setError("הבקשה שלך נדחתה. צור קשר עם המנהל.");
        setLoading(false);
        return;
      }
    }

    // Sync to users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingUser) {
      await supabase.from("users").insert({
        id: user.id,
        email: user.email,
        role: "courier",
      });
    }

    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    if (rememberMe) {
      localStorage.setItem("savedCredentials", JSON.stringify({ email, password }));
    } else {
      localStorage.removeItem("savedCredentials");
    }

    logActivity("login");
    setLoading(false);
    navigate("/");
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) return;
    const fullEmail = resetEmail.includes("@") ? resetEmail : `${resetEmail}@local.delivery`;
    await supabase.auth.resetPasswordForEmail(fullEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSent(true);
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">שחזור סיסמה</h1>
            <p className="text-muted-foreground mt-1">הזן את האימייל שלך</p>
          </div>
          {resetSent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">אם החשבון קיים, נשלח קישור לאיפוס סיסמה.</p>
              <Button variant="outline" className="w-full" onClick={() => { setShowForgotPassword(false); setResetSent(false); }}>
                חזור להתחברות
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="אימייל או שם משתמש"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
              <Button className="w-full" onClick={handleForgotPassword}>שלח קישור איפוס</Button>
              <Button variant="ghost" className="w-full" onClick={() => setShowForgotPassword(false)}>
                חזור
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold"><span className="inline-block" style={{ transform: "scaleX(-1)" }}>🚚</span> Droppy</h1>
          <p className="text-muted-foreground mt-1">התחבר כדי להמשיך</p>
        </div>

        <div className="space-y-4" dir="rtl">
          <Input
            placeholder="שם משתמש"
            type="text"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
          />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="סיסמה"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="pl-10"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setShowForgotPassword(true)}
            >
              שכחתי סיסמה
            </button>
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                זכור אותי
              </label>
            </div>
          </div>
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? "מתחבר..." : "התחבר"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            שליח חדש?{" "}
            <Link to="/register" className="text-primary hover:underline">הירשם כאן</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
