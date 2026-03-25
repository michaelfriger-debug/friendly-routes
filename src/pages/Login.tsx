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

    console.log("LOGIN SUCCESS", data.user);

    const user = data.user;

    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    console.log("FETCH RESULT:", existingUser, fetchError);

    if (!existingUser) {
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          id: user.id,
          email: user.email,
          role: "courier"
        });
      console.log("INSERT RESULT:", insertError);
    }

    await supabase
      .from("users")
      .update({ last_login: new Date() })
      .eq("id", user.id);

    console.log("UPDATE DONE");

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
