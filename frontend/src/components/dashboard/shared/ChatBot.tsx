import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Bot, Send, Loader2 } from "lucide-react";
import { API_URL } from "@/api";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

const SUGGESTIONS = [
  "Help me turn my idea into a brief",
  "What style suits a fine-line forearm piece?",
  "How do deposits and fees work?",
];

const ChatBot: React.FC = () => {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el?.scrollTo) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    else if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;
      setError(null);
      setInput("");

      const history = [...messages, { role: "user" as const, content }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setBusy(true);

      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/assistant/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ messages: history }),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          const msg =
            res.status === 503
              ? "The assistant isn't available right now."
              : res.status === 429
                ? "You're sending messages too quickly — give it a moment."
                : "Something went wrong. Try again.";
          throw new Error(msg);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") next[next.length - 1] = { ...last, content: last.content + chunk };
            return next;
          });
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Something went wrong. Try again.");
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && !last.content) next.pop();
          return next;
        });
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, messages, getToken]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-[420px] bg-card text-app">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
        {empty ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-2">
            <span className="grid place-items-center h-12 w-12 rounded-2xl border border-app bg-elevated">
              <Bot size={22} />
            </span>
            <div>
              <p className="font-bold">How can I help with your tattoo?</p>
              <p className="text-sm text-subtle mt-1 leading-relaxed">
                Refine an idea into a brief, talk through styles and placement, or learn how booking works.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="text-left text-sm rounded-xl border border-app/60 bg-elevated px-3 py-2 hover:border-app transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  m.role === "user"
                    ? "bg-elevated border border-app/60"
                    : "bg-card border border-app/40"
                }`}
              >
                {m.content || (busy && i === messages.length - 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : "")}
              </div>
            </div>
          ))
        )}
      </div>

      {error && <p className="px-4 pb-1 text-xs text-destructive">{error}</p>}

      <div className="shrink-0 border-t border-app p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about your tattoo, styles, or booking…"
            className="flex-1 resize-none max-h-28 rounded-xl border border-app bg-elevated px-3 py-2 text-sm outline-none focus:border-app/90"
            aria-label="Message the assistant"
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-[color:var(--fg)] text-[color:var(--bg)] disabled:opacity-40 transition"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted text-center">
          The assistant gives general guidance — it can't see live artists, prices, or your account.
        </p>
      </div>
    </div>
  );
};

export default ChatBot;
