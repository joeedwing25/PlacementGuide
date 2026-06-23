import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import ScoreRing from "@/components/ScoreRing";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["hsl(222 100% 50%)", "hsl(42 100% 50%)", "hsl(160 60% 45%)", "hsl(280 65% 60%)", "hsl(340 75% 55%)"];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/analytics/overview");
        setData(data);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="text-muted-foreground">Loading...</div>;
  if (!data) return null;

  const topicData = Object.entries(data.topic_breakdown || {}).map(([k, v]) => ({ topic: k, score: v }));
  const historyData = (data.quiz_history || []).map((p) => ({
    date: new Date(p.date).toLocaleDateString(),
    score: p.score,
    topic: p.topic,
  }));
  const componentData = [
    { name: "Resume", value: data.resume_score },
    { name: "Quizzes", value: data.quiz_average },
    { name: "Interviews", value: data.interview_average },
    { name: "Roadmap", value: data.roadmap_progress },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8" data-testid="analytics-page">
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Performance analytics</div>
        <h1 className="mt-2 text-3xl md:text-4xl font-heading font-black tracking-tighter">Know exactly where you stand</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-8 flex items-center justify-center lg:col-span-1" data-testid="analytics-readiness">
          <ScoreRing value={data.readiness_score} label="Readiness" />
        </Card>

        <Card className="p-6 lg:col-span-2" data-testid="analytics-components-chart">
          <h3 className="font-heading font-bold text-lg mb-4">Component breakdown</h3>
          {componentData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground">No data yet — take a quiz or analyze your resume.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={componentData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={45} paddingAngle={2}>
                  {componentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6" data-testid="analytics-topic-chart">
          <h3 className="font-heading font-bold text-lg mb-4">Topic mastery</h3>
          {topicData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground">Complete a few quizzes to see your topic mastery.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topicData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="topic" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6" data-testid="analytics-history-chart">
          <h3 className="font-heading font-bold text-lg mb-4">Quiz history</h3>
          {historyData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground">Take a quiz to see progress over time.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-6" data-testid="analytics-counts">
        <h3 className="font-heading font-bold text-lg mb-6">Activity counts</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            ["Resumes", data.counts?.resumes],
            ["Quizzes", data.counts?.quizzes],
            ["Interviews", data.counts?.interviews],
            ["Tasks", `${data.counts?.roadmap_tasks_completed ?? 0}/${data.counts?.roadmap_tasks_total ?? 0}`],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-4xl font-heading font-black tracking-tighter font-mono tabular-nums">{v ?? 0}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1">{k}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
