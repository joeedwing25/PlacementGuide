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

  const pickAnswer = (qid, letter) => setAnswers((a) => ({ ...a, [qid]: letter }));

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
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Quiz center</div>
          <h1 className="mt-2 text-3xl md:text-4xl font-heading font-black tracking-tighter">Pick a topic. Train.</h1>
          <p className="mt-2 text-muted-foreground">AI generates fresh questions every session.</p>
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
          <Button onClick={start} disabled={busy} size="lg" className="rounded-full font-semibold gap-2" data-testid="quiz-start-btn">
            <Brain className="w-4 h-4" /> {busy ? "Generating..." : "Start quiz"}
          </Button>
        </Card>

        {history.length > 0 && (
          <Card className="p-6 md:p-8" data-testid="quiz-history">
            <h3 className="font-heading font-bold text-lg mb-4">Recent quizzes</h3>
            <div className="space-y-3">
              {history.slice(0, 10).map((h) => (
                <div key={h.id} className="flex items-center justify-between border border-border rounded-md p-3 text-sm" data-testid={`quiz-history-${h.id}`}>
                  <div>
                    <span className="font-semibold">{h.topic}</span>
                    <span className="text-muted-foreground"> · {h.difficulty} · {h.total} Qs</span>
                  </div>
                  <Badge variant={h.score >= 70 ? "default" : "secondary"} className="font-mono">{h.score}%</Badge>
                </div>
              ))}
            </div>
          </Card>
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
        <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-background/90 backdrop-blur border-b border-border flex items-center justify-between">
          <div className="text-sm font-medium">Question {idx + 1} / {total}</div>
          <div className="text-sm font-mono">{quiz.topic} · {quiz.difficulty}</div>
        </div>
        <Progress value={((idx + 1) / total) * 100} className="h-1" />

        <Card className="p-6 md:p-8">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Question</div>
          <div className="mt-2 text-xl font-heading font-bold leading-snug" data-testid="quiz-question-text">{q.question}</div>
          <div className="mt-6 space-y-2">
            {q.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const selected = answers[q.id] === letter;
              return (
                <button
                  key={i}
                  onClick={() => pickAnswer(q.id, letter)}
                  data-testid={`quiz-option-${letter}`}
                  className={`w-full text-left border rounded-md px-4 py-3 transition-colors ${selected ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}
                >
                  <span className="font-mono font-bold mr-3">{letter}.</span>{opt}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="outline" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)} data-testid="quiz-prev-btn">Previous</Button>
            {idx < total - 1 ? (
              <Button onClick={() => setIdx((i) => i + 1)} className="gap-2" data-testid="quiz-next-btn">Next <ArrowRight className="w-4 h-4" /></Button>
            ) : (
              <Button onClick={submit} disabled={!allAnswered || busy} className="gap-2" data-testid="quiz-submit-btn">
                {busy ? "Scoring..." : "Submit"} <CheckCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
          {!allAnswered && idx === total - 1 && (
            <div className="mt-3 text-xs text-muted-foreground">Answer all questions to submit.</div>
          )}
        </Card>
      </div>
    );
  }

  if (stage === "results" && result) {
    return (
      <div className="max-w-3xl space-y-6" data-testid="quiz-results-page">
        <Card className="p-8 text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Final score</div>
          <div className="mt-2 text-7xl font-heading font-black tracking-tighter font-mono tabular-nums" data-testid="quiz-final-score">{result.score}</div>
          <div className="mt-2 text-muted-foreground">{result.correct} / {result.total} correct</div>
          <Button onClick={restart} className="mt-6 gap-2 rounded-full" data-testid="quiz-restart-btn">
            <RotateCcw className="w-4 h-4" /> New quiz
          </Button>
        </Card>

        <div className="space-y-3">
          {result.detail.map((d, i) => (
            <Card key={d.id} className="p-5" data-testid={`quiz-result-detail-${i}`}>
              <div className="flex items-start gap-3">
                {d.is_correct ? <CheckCircle className="w-5 h-5 text-emerald-500 mt-1" /> : <XCircle className="w-5 h-5 text-destructive mt-1" />}
                <div className="flex-1">
                  <div className="font-medium">{i + 1}. {d.question}</div>
                  <div className="mt-2 text-sm">
                    Your answer: <span className="font-mono font-bold">{d.your_answer || "—"}</span>
                    {" · "}
                    Correct: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{d.correct_answer}</span>
                  </div>
                  {d.explanation && <div className="mt-2 text-sm text-muted-foreground">{d.explanation}</div>}
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
