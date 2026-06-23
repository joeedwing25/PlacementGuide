import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiError } from "@/lib/api";
import { Sparkles } from "lucide-react";
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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10" data-testid="login-brand">
            <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-heading font-bold text-lg">InterviewIQ</span>
          </Link>

          <h1 className="text-4xl font-heading font-black tracking-tighter">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">Log in to continue your interview prep.</p>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                     placeholder="you@example.com" data-testid="login-email-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                     placeholder="••••••••" data-testid="login-password-input" />
            </div>
            {err && <div className="text-sm text-destructive" data-testid="login-error">{err}</div>}
            <Button type="submit" className="w-full rounded-md font-semibold" disabled={loading} data-testid="login-submit-btn">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline" data-testid="login-to-register">
              Create an account
            </Link>
          </div>
        </div>
      </div>

      {/* Right hero */}
      <div className="hidden lg:flex relative bg-foreground text-background overflow-hidden">
        <img src="https://images.pexels.com/photos/3137072/pexels-photo-3137072.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
             alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/40 to-transparent" />
        <div className="relative m-auto max-w-md p-10">
          <div className="text-xs uppercase tracking-[0.3em] opacity-70">Backed by AI</div>
          <div className="mt-4 text-4xl font-heading font-black tracking-tighter leading-tight">
            "InterviewIQ shipped my offer letter. 73 ATS to 91 in a weekend."
          </div>
          <div className="mt-6 text-sm opacity-80">— A real-ish student review</div>
        </div>
      </div>
    </div>
  );
}
