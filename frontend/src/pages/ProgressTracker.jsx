import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProgressTracker() {
  const [quizzes, setQuizzes] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [qRes, iRes] = await Promise.all([
          api.get("/quiz/history"),
          api.get("/interview/history")
        ]);
        setQuizzes(qRes.data.items || []);
        setInterviews(iRes.data.items || []);
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading progress...</div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Progress Tracker</h1>
        <p className="text-muted-foreground mt-2">View your quiz and mock interview history.</p>
      </header>

      <section>
        <h2 className="text-xl font-bold mb-4">Quiz History</h2>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground font-medium border-b">
                <tr>
                  <th className="px-4 py-3">Topic</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {quizzes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-muted-foreground">No quizzes taken yet.</td>
                  </tr>
                ) : (
                  quizzes.map((q) => (
                    <tr key={q.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{q.topic}</td>
                      <td className="px-4 py-3 capitalize">{q.difficulty}</td>
                      <td className="px-4 py-3">
                        <Badge variant={q.score >= 70 ? "success" : q.score >= 40 ? "warning" : "destructive"}>
                          {q.score}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(q.completed_at || q.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Interview History</h2>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground font-medium border-b">
                <tr>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Overall Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {interviews.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-muted-foreground">No mock interviews yet.</td>
                  </tr>
                ) : (
                  interviews.map((i) => (
                    <tr key={i.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium capitalize">{i.mode}</td>
                      <td className="px-4 py-3">
                        {i.status === "completed" ? (
                          <Badge variant={i.overall_score >= 70 ? "success" : i.overall_score >= 40 ? "warning" : "destructive"}>
                            {i.overall_score}%
                          </Badge>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 capitalize">{i.status}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(i.completed_at || i.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
