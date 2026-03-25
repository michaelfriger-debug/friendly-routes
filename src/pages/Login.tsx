import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const VALID_USERS = [
  { username: "Shlomi", password: "Shlomi" },
  { username: "Admin", password: "Admin" },
];

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("savedCredentials");
    if (saved) {
      const { username: u, password: p } = JSON.parse(saved);
      setUsername(u);
      setPassword(p);
      setRememberMe(true);
    }
  }, []);

  const syncUserToDb = async (name: string) => {
    try {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("name", name)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("users")
          .update({ last_login: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("users").insert({
          id: crypto.randomUUID(),
          name,
          email: `${name.toLowerCase()}@michael.delivery`,
          role: "courier",
          last_login: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Failed to sync user:", err);
    }
  };

  const handleLogin = async () => {
    const valid = VALID_USERS.some(
      (u) => u.username === username && u.password === password
    );
    if (valid) {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("currentUser", username);
      if (rememberMe) {
        localStorage.setItem("savedCredentials", JSON.stringify({ username, password }));
      } else {
        localStorage.removeItem("savedCredentials");
      }
      await syncUserToDb(username);
      navigate("/");
    } else {
      setError("שם משתמש או סיסמה שגויים");
    }
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
            placeholder="שם משתמש"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
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
          <Button className="w-full" onClick={handleLogin}>התחבר</Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
