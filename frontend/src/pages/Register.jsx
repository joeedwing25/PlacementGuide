import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiError } from "@/lib/api";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Account created!");
      nav("/profile");
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10" data-testid="register-brand">
            <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-heading font-bold text-lg">InterviewIQ</span>
          </Link>

          <h1 className="text-4xl font-heading font-black tracking-tighter">Create your account</h1>
          <p className="mt-2 text-muted-foreground">Start prepping in seconds. Free forever for v1.</p>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)}
                     placeholder="Ada Lovelace" data-testid="register-name-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                     placeholder="you@example.com" data-testid="register-email-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (min 6 chars)</Label>
              <Input id="password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)}
                     placeholder="••••••••" data-testid="register-password-input" />
            </div>
            {err && <div className="text-sm text-destructive" data-testid="register-error">{err}</div>}
            <Button type="submit" className="w-full rounded-md font-semibold" disabled={loading} data-testid="register-submit-btn">
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline" data-testid="register-to-login">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex relative bg-foreground text-background overflow-hidden">
        <img src="https://images.unsplash.com/photo-1498262257252-c282316270bc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxNzV8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMGFyY2hpdGVjdHVyZXxlbnwwfHx8fDE3ODE4NzQ4MDl8MA&ixlib=rb-4.1.0&q=85"
             alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-bl from-black/80 via-black/40 to-transparent" />
        <div className="relative m-auto max-w-md p-10">
          <div className="text-xs uppercase tracking-[0.3em] opacity-70">Your prep, your pace</div>
          <div className="mt-4 text-4xl font-heading font-black tracking-tighter leading-tight">
            One score. One roadmap. Zero guesswork.
          </div>
        </div>
      </div>
    </div>
  );
}
