import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      nav("/dashboard");
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background font-sans">
      {/* Left form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10" data-testid="login-brand">
            <span className="font-bold text-xl">PlacementGuide</span>
          </Link>

          <h1 className="text-4xl font-bold tracking-tight">Login</h1>
          <p className="mt-2 text-muted-foreground">Welcome back! Continue your preparation.</p>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                     placeholder="you@college.edu" data-testid="login-email-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                     placeholder="••••••••" data-testid="login-password-input" />
            </div>
            {err && <div className="text-sm text-destructive" data-testid="login-error">{err}</div>}
            <Button type="submit" className="w-full font-semibold" disabled={loading} data-testid="login-submit-btn">
              {loading ? "Signing in..." : "Login"}
            </Button>
          </form>

          <div className="mt-6 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline" data-testid="login-to-register">
              Sign up
            </Link>
          </div>
        </div>
      </div>

      {/* Right hero */}
      <div className="hidden lg:flex relative bg-primary text-primary-foreground overflow-hidden">
        <div className="relative m-auto max-w-md p-10 text-center">
          <h2 className="text-4xl font-bold tracking-tight leading-tight">
            The best way to prepare for your campus placements.
          </h2>
          <p className="mt-6 opacity-90 text-lg">
            Join thousands of students using PlacementGuide to land their dream jobs.
          </p>
        </div>
      </div>
    </div>
  );
}
