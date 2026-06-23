import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, FileText, Mic, MessageSquare, BarChart3, Map, Sparkles, ArrowRight, Check,
} from "lucide-react";

const features = [
  { icon: FileText, title: "Resume Analyzer", desc: "ATS scoring, missing keywords, rewriting suggestions powered by Gemini." },
  { icon: Brain, title: "Adaptive Quizzes", desc: "DSA, SQL, OS, DBMS, OOP, Aptitude — AI generates fresh questions every time." },
  { icon: Mic, title: "AI Mock Interview", desc: "HR / Technical / Behavioral modes, voice or text, per-question scoring." },
  { icon: MessageSquare, title: "AI Career Coach", desc: "1-on-1 chat trained on your profile and goals." },
  { icon: Map, title: "30/60/90 Roadmap", desc: "Personalized study plan with check-off tracking and progress." },
  { icon: BarChart3, title: "Readiness Analytics", desc: "One score that tells you when you're ready to interview." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="landing-brand">
            <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-heading font-bold text-lg">InterviewIQ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#how" className="hover:text-primary transition-colors">How it works</a>
            <a href="#cta" className="hover:text-primary transition-colors">Get started</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" data-testid="landing-login-btn"><Link to="/login">Log in</Link></Button>
            <Button asChild size="sm" data-testid="landing-signup-btn"><Link to="/register">Get started</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <Badge variant="secondary" className="mb-6 rounded-full" data-testid="landing-badge">
            <span className="font-mono text-[10px] tracking-widest">v1 · POWERED BY GEMINI 2.5 FLASH</span>
          </Badge>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-black tracking-tighter max-w-4xl leading-[0.95]">
            Land the offer.<br />
            <span className="text-primary">Train like you mean it.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
            InterviewIQ is your AI prep partner — resume tear-downs, infinite practice quizzes, realistic mock interviews,
            and a 90-day roadmap that adapts to you.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full font-semibold gap-2" data-testid="hero-cta-primary">
              <Link to="/register">Start free <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full" data-testid="hero-cta-secondary">
              <Link to="/login">I have an account</Link>
            </Button>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            {["No credit card", "ATS-graded resume", "Voice mock interviews", "Personal roadmap"].map((x) => (
              <div key={x} className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> {x}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Features</div>
            <h2 className="mt-3 text-3xl md:text-5xl font-heading font-black tracking-tighter">
              Everything you need to interview with confidence.
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="border border-border bg-background rounded-lg p-6 transition-transform hover:-translate-y-1 hover:shadow-md" data-testid={`feature-card-${i}`}>
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="font-heading font-bold text-lg">{f.title}</div>
                <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">How it works</div>
            <h2 className="mt-3 text-3xl md:text-5xl font-heading font-black tracking-tighter">
              Four steps to interview-ready.
            </h2>
          </div>
          <ol className="space-y-6">
            {[
              ["01", "Build your profile", "Tell us your target role, skills, projects and coding profiles."],
              ["02", "Upload your resume", "Get a real ATS score plus bullet-point rewrites."],
              ["03", "Practice every day", "Adaptive quizzes + voice mock interviews tailored to you."],
              ["04", "Track your readiness", "One score, one roadmap. Know exactly what to fix next."],
            ].map(([n, t, d]) => (
              <li key={n} className="flex gap-5">
                <div className="font-mono text-sm text-primary font-bold">{n}</div>
                <div>
                  <div className="font-heading font-bold text-xl">{t}</div>
                  <div className="text-muted-foreground mt-1">{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="border-t border-border bg-foreground text-background">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl md:text-6xl font-heading font-black tracking-tighter">
            Your next interview starts now.
          </h2>
          <p className="mt-4 text-lg opacity-80 max-w-xl mx-auto">
            Free to start. No payment required. Get your first ATS score in under 60 seconds.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8 rounded-full font-semibold" data-testid="footer-cta">
            <Link to="/register">Create your account <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto px-6 flex justify-between">
          <div>© 2026 InterviewIQ AI</div>
          <div>Built with Gemini · Made for students</div>
        </div>
      </footer>
    </div>
  );
}
