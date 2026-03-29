import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    setError("");

    if (!fullName.trim() || !email.trim() || !phone.trim() || !password || !confirmPassword) {
      setError("יש למלא את כל השדות");
      return;
    }

    if (password.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }

    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message || "שגיאה בהרשמה");
      setLoading(false);
      return;
    }

    // Insert driver record with pending status
    const { error: insertError } = await supabase.from("drivers").insert({
      id: data.user.id,
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      status: "pending",
    });

    if (insertError) {
      console.error("Driver insert error:", insertError);
      setError("ההרשמה נוצרה אך אירעה שגיאה בשמירת הפרטים");
      setLoading(false);
      return;
    }

    // Sign out immediately - they need admin approval
    await supabase.auth.signOut();

    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-bold text-foreground">ההרשמה התקבלה!</h1>
          <p className="text-muted-foreground">המתן לאישור מנהל לפני הכניסה.</p>
          <Link to="/login">
            <Button variant="outline" className="w-full mt-4">חזור לדף ההתחברות</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            <span className="inline-block" style={{ transform: "scaleX(-1)" }}>🚚</span> Droppy
          </h1>
          <p className="text-muted-foreground mt-1">הרשמה כשליח חדש</p>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="שם מלא"
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); setError(""); }}
          />
          <Input
            placeholder="אימייל"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
          />
          <Input
            placeholder="מספר טלפון"
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(""); }}
          />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="סיסמה (מינימום 8 תווים)"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="pl-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="אימות סיסמה"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
            className="pl-10"
          />

          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          <Button className="w-full" onClick={handleRegister} disabled={loading}>
            <UserPlus className="h-4 w-4 ml-2" />
            {loading ? "נרשם..." : "הירשם כשליח"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            כבר יש לך חשבון?{" "}
            <Link to="/login" className="text-primary hover:underline">התחבר</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
