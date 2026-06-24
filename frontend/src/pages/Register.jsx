import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiError } from "@/lib/api";
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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background font-sans">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10" data-testid="register-brand">
            <span className="font-bold text-xl">PlacementGuide</span>
          </Link>

          <h1 className="text-4xl font-bold tracking-tight">Create Account</h1>
          <p className="mt-2 text-muted-foreground">Join PlacementGuide and start your preparation.</p>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)}
                     placeholder="John Doe" data-testid="register-name-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                     placeholder="you@college.edu" data-testid="register-email-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (min 6 characters)</Label>
              <Input id="password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)}
                     placeholder="••••••••" data-testid="register-password-input" />
            </div>
            {err && <div className="text-sm text-destructive" data-testid="register-error">{err}</div>}
            <Button type="submit" className="w-full font-semibold" disabled={loading} data-testid="register-submit-btn">
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline" data-testid="register-to-login">
              Login
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex relative bg-primary text-primary-foreground overflow-hidden">
        <div className="relative m-auto max-w-md p-10 text-center">
          <h2 className="text-4xl font-bold tracking-tight leading-tight">
            Built for students, by students.
          </h2>
          <p className="mt-6 opacity-90 text-lg">
            A simple platform focusing on core placement preparation needs.
          </p>
        </div>
      </div>
    </div>
  );
}
