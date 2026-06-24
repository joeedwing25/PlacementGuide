import React, { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, ArrowRight, CheckCircle, XCircle, RotateCcw } from "lucide-react";

const TOPICS = ["DSA", "SQL", "DBMS", "Operating Systems", "Computer Networks", "OOP", "Java", "Python", "JavaScript", "Aptitude", "System Design"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const COUNTS = [5, 10, 20];

export default function Quiz() {
  const [stage, setStage] = useState("select"); // select | playing | results
  const [topic, setTopic] = useState("DSA");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/quiz/history");
        setHistory(data.items || []);
      } catch {}
    })();
  }, [stage]);

  const start = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/quiz/start", { topic, difficulty, count });
      setQuiz(data.quiz);
      setIdx(0); setAnswers({});
      setStage("playing");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setBusy(false); }
  };

  const pickAnswer = (qid, text) => setAnswers((a) => ({ ...a, [qid]: text }));

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/quiz/submit", { quiz_id: quiz.id, answers });
      setResult(data);
      setStage("results");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setBusy(false); }
  };

  const restart = () => {
    setQuiz(null); setResult(null); setIdx(0); setAnswers({}); setStage("select");
  };

  if (stage === "select") {
    return (
      <div className="space-y-8" data-testid="quiz-select-page">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Quiz Practice</h1>
          <p className="mt-2 text-muted-foreground text-lg">Test your knowledge with multiple choice questions.</p>
        </header>

        <Card className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic</label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger data-testid="quiz-topic-select"><SelectValue /></SelectTrigger>
                <SelectContent>{TOPICS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger data-testid="quiz-difficulty-select"><SelectValue /></SelectTrigger>
                <SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Question count</label>
              <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
                <SelectTrigger data-testid="quiz-count-select"><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTS.map((c) => <SelectItem key={c} value={String(c)}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={start} disabled={busy} size="lg" className="font-semibold gap-2" data-testid="quiz-start-btn">
             {busy ? "Starting..." : "Start Quiz"}
          </Button>
        </Card>

        {history.length > 0 && (
          <div data-testid="quiz-history">
            <h3 className="text-xl font-bold mb-4">Recent Quizzes</h3>
            <div className="grid gap-3">
              {history.slice(0, 5).map((h) => (
                <Card key={h.id} className="flex items-center justify-between p-4" data-testid={`quiz-history-${h.id}`}>
                  <div>
                    <span className="font-bold">{h.topic}</span>
                    <span className="text-muted-foreground ml-2 text-sm capitalize">· {h.difficulty} · {h.total} Qs</span>
                  </div>
                  <Badge variant={h.score >= 70 ? "default" : "secondary"} className="font-mono">{h.score}%</Badge>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (stage === "playing" && quiz) {
    const q = quiz.questions[idx];
    const total = quiz.questions.length;
    const allAnswered = quiz.questions.every((qq) => answers[qq.id]);
    return (
      <div className="max-w-3xl space-y-6" data-testid="quiz-playing-page">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="font-bold">Question {idx + 1} of {total}</div>
          <div className="text-sm text-muted-foreground">{quiz.topic} · {quiz.difficulty}</div>
        </div>
        <Progress value={((idx + 1) / total) * 100} className="h-2" />

        <Card className="p-6 md:p-8">
          <div className="text-xl font-bold leading-snug" data-testid="quiz-question-text">{q.question}</div>
          <div className="mt-8 space-y-3">
            {q.options.map((opt, i) => {
              const selected = answers[q.id] === opt;
              return (
                <button
                  key={i}
                  onClick={() => pickAnswer(q.id, opt)}
                  className={`w-full text-left border rounded-lg px-6 py-4 transition-colors font-medium ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted"}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex justify-between">
            <Button variant="outline" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)} data-testid="quiz-prev-btn">Previous</Button>
            {idx < total - 1 ? (
              <Button onClick={() => setIdx((i) => i + 1)} className="gap-2" data-testid="quiz-next-btn">Next <ArrowRight className="w-4 h-4" /></Button>
            ) : (
              <Button onClick={submit} disabled={!allAnswered || busy} className="gap-2" data-testid="quiz-submit-btn">
                {busy ? "Submitting..." : "Finish Quiz"} <CheckCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (stage === "results" && result) {
    return (
      <div className="max-w-3xl space-y-6" data-testid="quiz-results-page">
        <Card className="p-10 text-center">
          <h2 className="text-2xl font-bold text-muted-foreground uppercase tracking-widest">Final Score</h2>
          <div className="mt-4 text-7xl font-bold" data-testid="quiz-final-score">{result.score}%</div>
          <div className="mt-2 text-lg text-muted-foreground">{result.correct} out of {result.total} correct</div>
          <Button onClick={restart} className="mt-8 gap-2 px-8" data-testid="quiz-restart-btn">
            <RotateCcw className="w-4 h-4" /> Try Another Quiz
          </Button>
        </Card>

        <div className="space-y-4">
          {result.detail.map((d, i) => (
            <Card key={d.id} className="p-6" data-testid={`quiz-result-detail-${i}`}>
              <div className="flex items-start gap-4">
                {d.is_correct ? <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5" /> : <XCircle className="w-6 h-6 text-destructive mt-0.5" />}
                <div className="flex-1">
                  <div className="font-bold text-lg">{i + 1}. {d.question}</div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-4 text-sm">
                    <div className="p-3 bg-muted rounded-md flex-1">
                      <span className="font-bold block mb-1">Your Answer:</span>
                      {d.your_answer || "No answer"}
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-900 rounded-md flex-1">
                      <span className="font-bold block mb-1">Correct Answer:</span>
                      {d.correct_answer}
                    </div>
                  </div>
                  {d.explanation && <div className="mt-4 p-4 border-l-4 border-muted text-sm italic">{d.explanation}</div>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
