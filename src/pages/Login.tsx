import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/", { replace: true });
    });
  }, [navigate]);

  const syncUserToDb = async (user: { id: string; email: string | undefined }) => {
    console.log("USER LOGGED IN - id:", user.id, "email:", user.email);

    try {
      // Check if user exists
      const { data: existing, error: selectError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      console.log("Fetch user result:", { existing, selectError });

      if (!existing) {
        // Insert new user
        const { data: insertData, error: insertError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email ?? null,
          role: "courier",
          last_login: new Date().toISOString(),
        });
        console.log("Insert user result:", { insertData, insertError });
        if (insertError) console.error("Insert error:", insertError);
      } else {
        // Update last_login
        const { error: updateError } = await supabase
          .from("users")
          .update({ last_login: new Date().toISOString() })
          .eq("id", user.id);
        console.log("Update last_login result:", { updateError });
        if (updateError) console.error("Update error:", updateError);
      }
    } catch (err) {
      console.error("Failed to sync user:", err);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      console.error("Auth error:", authError);
      setError("אימייל או סיסמה שגויים");
      setLoading(false);
      return;
    }

    console.log("AUTH SUCCESS - user:", data.user.id);

    // Wait for session to be fully available
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log("SESSION DATA:", { session: sessionData.session, sessionError });

    if (!sessionData.session) {
      console.error("No session available after login");
      setError("שגיאה בהתחברות - אין סשן");
      setLoading(false);
      return;
    }

    // Sync user to users table using authenticated session
    await syncUserToDb({ id: data.user.id, email: data.user.email });

    if (rememberMe) {
      localStorage.setItem("savedCredentials", JSON.stringify({ email, password }));
    } else {
      localStorage.removeItem("savedCredentials");
    }

    setLoading(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">🚚 Michael Delivery</h1>
          <p className="text-muted-foreground mt-1">התחבר כדי להמשיך</p>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="אימייל"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            dir="rtl"
          />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="סיסמה"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              dir="rtl"
              className="pr-10"
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
          <div className="flex items-center gap-2 justify-end" dir="rtl">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
              זכור אותי
            </label>
          </div>
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? "מתחבר..." : "התחבר"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
