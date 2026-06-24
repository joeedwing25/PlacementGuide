import React, { useEffect, useRef, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Mic, MicOff, Send, RotateCcw } from "lucide-react";

const MODES = [
  { value: "technical", label: "Technical" },
  { value: "behavioral", label: "Behavioral" },
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

export default function Interview() {
  const [mode, setMode] = useState("technical");
  const [stage, setStage] = useState("select"); // select | playing | done
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
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
      setQaList([]);
      setAnswer("");
      setStage("playing");
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
        setAnswer("");
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
          <h1 className="text-3xl font-bold tracking-tight">Mock Interview</h1>
          <p className="mt-2 text-muted-foreground text-lg">Practice with structured interview questions. 5 questions per session.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              data-testid={`interview-mode-${m.value}`}
              className={`text-left border-2 rounded-lg p-6 transition-all ${mode === m.value ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-muted-foreground/30"}`}
            >
              <div className="font-bold text-xl capitalize">{m.label} Interview</div>
              <p className="text-muted-foreground mt-2">
                {m.value === "technical" ? "Covers OS, DBMS, Networks, and programming concepts." : "Focuses on situational and behavioral questions."}
              </p>
            </button>
          ))}
        </div>

        <Button onClick={start} disabled={busy} size="lg" className="px-10 font-semibold" data-testid="interview-start-btn">
          {busy ? "Starting..." : "Start Interview"}
        </Button>
      </div>
    );
  }

  if (stage === "playing") {
    return (
      <div className="max-w-3xl space-y-6" data-testid="interview-playing-page">
        <div className="flex items-center justify-between border-b pb-4">
          <Badge className="px-3 py-1 capitalize text-sm">{mode}</Badge>
          <div className="font-bold">Question {qaList.length + 1} of 5</div>
        </div>
        <Progress value={((qaList.length + 1) / 5) * 100} className="h-2" />

        <Card className="p-8">
          <div className="text-2xl font-bold leading-snug" data-testid="interview-question">{question}</div>
        </Card>

        <Card className="p-8 space-y-4">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="text-lg leading-relaxed min-h-[200px]"
            data-testid="interview-answer-textarea"
          />
          <div className="flex items-center justify-between gap-4">
            {speech.supported && (
              <Button
                type="button"
                variant={speech.listening ? "destructive" : "outline"}
                onClick={() => speech.listening ? speech.stop() : speech.start(setAnswer)}
                className="gap-2"
                data-testid="interview-mic-btn"
              >
                {speech.listening ? <><MicOff className="w-4 h-4" /> Stop Mic</> : <><Mic className="w-4 h-4" /> Use Voice</>}
              </Button>
            )}
            <Button onClick={submitAnswer} disabled={busy} size="lg" className="gap-2 px-8" data-testid="interview-submit-answer-btn">
               {busy ? "Submitting..." : "Submit Answer"} <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="max-w-3xl space-y-8" data-testid="interview-done-page">
        <Card className="p-10 text-center border-2">
          <h2 className="text-2xl font-bold text-muted-foreground uppercase tracking-widest">Interview Score</h2>
          <div className="mt-4 text-7xl font-bold" data-testid="interview-overall-score">{overall}%</div>
          <div className="mt-4 text-lg text-muted-foreground">Session Complete</div>
          <Button onClick={restart} className="mt-8 gap-2 px-10" data-testid="interview-new-btn">
            <RotateCcw className="w-4 h-4" /> Start New Session
          </Button>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xl font-bold">Session Summary</h3>
          {qaList.map((q, i) => (
            <Card key={i} className="p-6" data-testid={`interview-summary-${i}`}>
              <div className="font-bold text-lg">{i + 1}. {q.question}</div>
              <div className="mt-4 p-4 bg-muted rounded-md text-sm italic">"{q.answer}"</div>
              <div className="mt-6 flex items-center gap-4">
                <Badge variant={q.evaluation.overall_score >= 70 ? "default" : "secondary"} className="text-lg px-4 py-1">
                  {q.evaluation.overall_score}%
                </Badge>
                <p className="text-sm font-medium">{q.evaluation.feedback}</p>
              </div>
              {q.evaluation.improvements?.length > 0 && (
                <div className="mt-4 space-y-2">
                   <p className="text-xs font-bold uppercase text-muted-foreground">Suggested Improvements:</p>
                   <ul className="text-sm space-y-1">
                    {q.evaluation.improvements.map((s, j) => <li key={j} className="text-muted-foreground">• {s}</li>)}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
