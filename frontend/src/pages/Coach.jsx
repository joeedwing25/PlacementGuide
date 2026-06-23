import React, { useEffect, useRef, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Review my profile and tell me what to focus on.",
  "How do I prepare for a Google SDE interview in 6 weeks?",
  "Give me 3 portfolio project ideas based on my skills.",
  "What should I say in a 'tell me about yourself' answer?",
];

export default function Coach() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/coach/history");
        setMessages(data.items || []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setBusy(true);
    try {
      const { data } = await api.post("/coach/chat", { message: msg });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col" data-testid="coach-page">
      <header className="mb-4">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">AI career coach</div>
        <h1 className="mt-1 text-3xl font-heading font-black tracking-tighter">Ask anything</h1>
      </header>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="coach-messages">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="mt-4 font-heading font-bold text-lg">Hi! I'm your AI career coach.</div>
                <div className="text-sm text-muted-foreground">Ask about resumes, interviews, DSA, projects, or careers.</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    className="text-left text-sm border border-border rounded-md p-3 hover:bg-secondary transition-colors"
                    data-testid={`coach-suggestion-${i}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`coach-msg-${i}`}>
              <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start" data-testid="coach-typing">
              <div className="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse mr-1" />
                <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse mr-1" style={{ animationDelay: "0.2s" }} />
                <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-border p-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach..."
            disabled={busy}
            data-testid="coach-input"
          />
          <Button type="submit" disabled={busy || !input.trim()} className="gap-2" data-testid="coach-send-btn">
            <Send className="w-4 h-4" /> Send
          </Button>
        </form>
      </Card>
    </div>
  );
}
