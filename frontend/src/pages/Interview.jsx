import React, { useEffect, useRef, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Mic, MicOff, Send, RotateCcw, Sparkles } from "lucide-react";

const MODES = [
  { value: "technical", label: "Technical" },
  { value: "hr", label: "HR" },
  { value: "behavioral", label: "Behavioral" },
  { value: "project", label: "Project Discussion" },
  { value: "resume", label: "Resume-Based" },
];

function useSpeechRecognition() {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) setSupported(true);
  }, []);

  const start = (onText) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      onText((finalText + interim).trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  return { listening, supported, start, stop };
}

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

export default function Interview() {
  const [mode, setMode] = useState("technical");
  const [stage, setStage] = useState("select"); // select | playing | done
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [category, setCategory] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [qaList, setQaList] = useState([]); // {question, answer, evaluation}
  const [overall, setOverall] = useState(null);
  const speech = useSpeechRecognition();

  const start = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/interview/start", { mode });
      setSessionId(data.session_id);
      setQuestion(data.question);
      setCategory(data.category || "");
      setQaList([]);
      setAnswer("");
      setStage("playing");
      speak(data.question);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setBusy(false); }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) { toast.error("Please answer the question."); return; }
    if (speech.listening) speech.stop();
    setBusy(true);
    try {
      const { data } = await api.post("/interview/answer", { session_id: sessionId, answer });
      setQaList((l) => [...l, { question, answer, evaluation: data.evaluation }]);
      if (data.done) {
        setOverall(data.overall_score);
        setStage("done");
      } else {
        setQuestion(data.next_question);
        setCategory(data.category || "");
        setAnswer("");
        speak(data.next_question);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setBusy(false); }
  };

  const restart = () => {
    setStage("select"); setSessionId(null); setQuestion(null); setAnswer("");
    setQaList([]); setOverall(null);
  };

  if (stage === "select") {
    return (
      <div className="space-y-8" data-testid="interview-select-page">
        <header>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">AI mock interview</div>
          <h1 className="mt-2 text-3xl md:text-4xl font-heading font-black tracking-tighter">Practice like it's real</h1>
          <p className="mt-2 text-muted-foreground">5 questions per session. Voice or text. Per-question scoring.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              data-testid={`interview-mode-${m.value}`}
              className={`text-left border rounded-lg p-5 transition-all hover:-translate-y-1 ${mode === m.value ? "border-primary bg-primary/5" : "border-border bg-surface"}`}
            >
              <div className="font-heading font-bold text-lg">{m.label}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {m.value === "technical" && "Deep technical questions from your profile."}
                {m.value === "hr" && "Tell-me-about-yourself & company fit."}
                {m.value === "behavioral" && "STAR-method situational questions."}
                {m.value === "project" && "Deep dive into your projects."}
                {m.value === "resume" && "Questions strictly from your resume."}
              </div>
            </button>
          ))}
        </div>

        <Button onClick={start} disabled={busy} size="lg" className="rounded-full font-semibold gap-2" data-testid="interview-start-btn">
          <Sparkles className="w-4 h-4" /> {busy ? "Preparing..." : "Start mock interview"}
        </Button>
      </div>
    );
  }

  if (stage === "playing") {
    return (
      <div className="max-w-3xl space-y-6" data-testid="interview-playing-page">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{MODES.find((m) => m.value === mode)?.label}</Badge>
          <div className="text-sm text-muted-foreground">Question {qaList.length + 1} / 5</div>
        </div>
        <Progress value={((qaList.length + 1) / 5) * 100} className="h-1" />

        <Card className="p-6 md:p-8">
          {category && <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{category}</div>}
          <div className="mt-2 text-xl font-heading font-bold leading-snug" data-testid="interview-question">{question}</div>
          <Button variant="ghost" size="sm" className="mt-2 gap-1" onClick={() => speak(question)} data-testid="interview-speak-btn">
            🔊 Replay question
          </Button>
        </Card>

        <Card className="p-6 md:p-8 space-y-4">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer or use the mic..."
            rows={6}
            data-testid="interview-answer-textarea"
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {speech.supported ? (
              <Button
                type="button"
                variant={speech.listening ? "destructive" : "outline"}
                onClick={() => speech.listening ? speech.stop() : speech.start(setAnswer)}
                className="gap-2"
                data-testid="interview-mic-btn"
              >
                {speech.listening ? <><MicOff className="w-4 h-4" /> Stop</> : <><Mic className="w-4 h-4" /> Use voice</>}
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground">Voice not supported in this browser.</div>
            )}
            <Button onClick={submitAnswer} disabled={busy} className="gap-2" data-testid="interview-submit-answer-btn">
              <Send className="w-4 h-4" /> {busy ? "Evaluating..." : "Submit answer"}
            </Button>
          </div>
        </Card>

        {qaList.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Previous answers</h3>
            {qaList.map((q, i) => (
              <Card key={i} className="p-4 text-sm">
                <div className="font-medium">{i + 1}. {q.question}</div>
                <div className="mt-2 text-muted-foreground">{q.answer}</div>
                <div className="mt-3 flex items-center gap-3">
                  <Badge variant={q.evaluation.overall_score >= 70 ? "default" : "secondary"} className="font-mono">
                    {q.evaluation.overall_score}/100
                  </Badge>
                  <span className="text-xs text-muted-foreground">{q.evaluation.feedback}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="max-w-3xl space-y-6" data-testid="interview-done-page">
        <Card className="p-8 text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Interview complete</div>
          <div className="mt-2 text-7xl font-heading font-black tracking-tighter font-mono tabular-nums" data-testid="interview-overall-score">{overall}</div>
          <div className="mt-2 text-muted-foreground">Overall score / 100</div>
          <Button onClick={restart} className="mt-6 gap-2 rounded-full" data-testid="interview-new-btn">
            <RotateCcw className="w-4 h-4" /> New interview
          </Button>
        </Card>

        <div className="space-y-3">
          {qaList.map((q, i) => (
            <Card key={i} className="p-5" data-testid={`interview-summary-${i}`}>
              <div className="font-medium">{i + 1}. {q.question}</div>
              <div className="mt-2 text-sm text-muted-foreground">{q.answer}</div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                {[
                  ["Technical", q.evaluation.technical_accuracy],
                  ["Comm.", q.evaluation.communication],
                  ["Confidence", q.evaluation.confidence],
                  ["Clarity", q.evaluation.clarity],
                  ["Complete", q.evaluation.completeness],
                ].map(([k, v]) => (
                  <div key={k} className="text-center">
                    <div className="font-mono text-lg font-bold tabular-nums">{v}/10</div>
                    <div className="text-muted-foreground">{k}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm border-l-2 border-primary pl-3">{q.evaluation.feedback}</div>
              {q.evaluation.improvements?.length > 0 && (
                <ul className="mt-3 text-sm space-y-1">
                  {q.evaluation.improvements.map((s, j) => <li key={j} className="text-muted-foreground">• {s}</li>)}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
