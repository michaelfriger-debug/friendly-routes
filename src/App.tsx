import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Admin from "./pages/Admin.tsx";
import AdminDrivers from "./pages/AdminDrivers.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const syncUserOnLoad = async () => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log("APP LOAD - getUser:", user, userError);

  if (!user) {
    console.log("APP LOAD - No user logged in");
    return;
  }

  const { data: existingUser, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  console.log("APP LOAD - FETCH RESULT:", existingUser, fetchError);

  if (!existingUser) {
    const { error: insertError } = await supabase
      .from("users")
      .insert({
        id: user.id,
        email: user.email,
        role: "courier"
      });
    console.log("APP LOAD - INSERT RESULT:", insertError);
  }

  await supabase
    .from("users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", user.id);

  console.log("APP LOAD - UPDATE DONE");
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [driverBlocked, setDriverBlocked] = useState(false);

  useEffect(() => {
    const checkAuth = async (userId: string | undefined) => {
      if (!userId) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      // Check driver status - block pending/rejected
      const { data: driverData } = await supabase
        .from("drivers")
        .select("status")
        .eq("id", userId)
        .maybeSingle();

      if (driverData && (driverData.status === "pending" || driverData.status === "rejected")) {
        await supabase.auth.signOut();
        setDriverBlocked(true);
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      setAuthenticated(true);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthenticated(false);
        setLoading(false);
      }
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      checkAuth(user?.id);
      if (user) syncUserOnLoad();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (driverBlocked || !authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/drivers" element={<ProtectedRoute><AdminDrivers /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
