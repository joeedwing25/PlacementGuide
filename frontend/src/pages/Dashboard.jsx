import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import ScoreRing from "@/components/ScoreRing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, Brain, Mic, Map, MessageSquare, ArrowRight, BarChart3 } from "lucide-react";

const quickActions = [
  { to: "/resume", icon: FileText, label: "Analyze resume", desc: "Upload PDF/DOCX for ATS score", testid: "qa-resume" },
  { to: "/quiz", icon: Brain, label: "Take a quiz", desc: "Adaptive technical questions", testid: "qa-quiz" },
  { to: "/interview", icon: Mic, label: "Mock interview", desc: "HR / Technical / Behavioral", testid: "qa-interview" },
  { to: "/coach", icon: MessageSquare, label: "Ask the coach", desc: "1-on-1 chat with AI", testid: "qa-coach" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/analytics/overview");
        setOverview(data);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Mission control</div>
        <h1 className="mt-2 text-3xl md:text-5xl font-heading font-black tracking-tighter">
          Hello, {user?.name?.split(" ")[0] || "there"} 👋
        </h1>
        <p className="mt-2 text-muted-foreground">Your interview readiness, all in one place.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Readiness gauge */}
        <Card className="lg:col-span-1 p-8 flex flex-col items-center justify-center" data-testid="readiness-card">
          {loading ? (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground">Calculating...</div>
          ) : (
            <>
              <ScoreRing value={overview?.readiness_score || 0} label="Readiness" />
              <p className="mt-4 text-sm text-muted-foreground text-center max-w-xs">
                Average across resume, quizzes, interviews and roadmap progress.
              </p>
            </>
          )}
        </Card>

        {/* Component scores */}
        <Card className="lg:col-span-2 p-6 md:p-8" data-testid="component-scores-card">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Component scores</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              ["Resume (ATS)", overview?.resume_score, FileText],
              ["Quiz average", overview?.quiz_average, Brain],
              ["Interview average", overview?.interview_average, Mic],
              ["Roadmap progress", overview?.roadmap_progress, Map],
            ].map(([label, val, Icon]) => (
              <div key={label} data-testid={`score-${label.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 font-medium"><Icon className="w-4 h-4 text-muted-foreground" /> {label}</div>
                  <div className="font-mono font-bold tabular-nums">{val ?? 0}</div>
                </div>
                <Progress value={val || 0} className="mt-2 h-2" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Quick actions</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              data-testid={q.testid}
              className="group border border-border rounded-lg p-5 bg-surface hover:-translate-y-1 hover:shadow-md transition-all"
            >
              <q.icon className="w-6 h-6 text-primary" />
              <div className="mt-4 font-heading font-bold text-lg">{q.label}</div>
              <div className="text-sm text-muted-foreground mt-1">{q.desc}</div>
              <div className="mt-4 text-sm font-semibold text-primary inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Counts */}
      <Card className="p-6 md:p-8" data-testid="activity-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Your activity</div>
            <h3 className="mt-2 text-2xl font-heading font-bold tracking-tight">Lifetime stats</h3>
          </div>
          <Button asChild variant="outline" size="sm" data-testid="dashboard-view-analytics">
            <Link to="/analytics" className="gap-2"><BarChart3 className="w-4 h-4" /> View analytics</Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            ["Resumes", overview?.counts?.resumes ?? 0],
            ["Quizzes", overview?.counts?.quizzes ?? 0],
            ["Interviews", overview?.counts?.interviews ?? 0],
            ["Tasks done", `${overview?.counts?.roadmap_tasks_completed ?? 0}/${overview?.counts?.roadmap_tasks_total ?? 0}`],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-4xl font-heading font-black tracking-tighter font-mono tabular-nums">{v}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1">{k}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
