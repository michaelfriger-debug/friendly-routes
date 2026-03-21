import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (username === "admin" && password === "1234") {
      localStorage.setItem("isLoggedIn", "true");
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
          <Input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            dir="rtl"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <Button className="w-full" onClick={handleLogin}>התחבר</Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
