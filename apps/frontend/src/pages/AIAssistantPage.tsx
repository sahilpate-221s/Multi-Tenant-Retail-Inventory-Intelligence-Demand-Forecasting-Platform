import { useState, useRef, useEffect } from "react";
import { useAskAssistant } from "../hooks/useAIAssistant";
import type { ChatMessage } from "../lib/types";
import { ApiError } from "../lib/apiClient";

const SUGGESTED_QUESTIONS = [
  "What should I reorder right now?",
  "Do I have any dead or slow-moving stock?",
  "Which products are at risk of stocking out?",
  "Has anything unusual happened with demand recently?",
];

function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ask = useAskAssistant();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(question: string) {
    if (!question.trim()) return;
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");

    try {
      const result = await ask.mutateAsync(question);
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer, toolsUsed: result.toolsUsed }]);
    } catch (err) {
      if (err instanceof ApiError && err.code === "AI_UNAVAILABLE") {
        setError("The AI Assistant isn't available right now. Other features are unaffected.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <div className="p-6 md:p-8 flex flex-col h-[calc(100vh-56px)] max-w-6xl mx-auto select-none">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(255,255,255,0.08)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#d4a853]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#97979d]">
              NEURAL INVENTORY ORACLE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#e8e6e3] tracking-tight mt-1">
            AI Assistant
          </h1>
          <p className="text-xs text-[#97979d] mt-1 font-mono">
            Ask questions about inventory velocity, safety thresholds, and anomalous demand patterns. Grounded in real ledger telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#14141a] border border-[rgba(255,255,255,0.08)]">
          <span className="w-2 h-2 rounded-full bg-[#4aba7a] animate-pulse" />
          <span className="text-xs font-mono text-[#e8e6e3]">Engine: <span className="text-[#d4a853]">Gemini 2.5 Flash</span></span>
        </div>
      </div>

      {/* ─── CHAT VIEWPORT ─── */}
      <div className="flex-1 mt-4 sp-glass-elevated rounded-2xl overflow-y-auto p-5 md:p-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="my-auto text-center max-w-xl mx-auto py-8">
            <div className="w-12 h-12 rounded-2xl bg-[#181822] border border-[rgba(212,168,83,0.3)] flex items-center justify-center text-xl mx-auto mb-4 shadow-[0_0_20px_rgba(212,168,83,0.15)]">
              ✨
            </div>
            <h3 className="text-base font-bold text-[#e8e6e3] font-mono">
              Ask StockPilot Intelligence
            </h3>
            <p className="text-xs text-[#97979d] mt-1 font-mono leading-relaxed">
              Explore your real-time replenishment risk, dead stock capital impact, and supplier reliability.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-xs font-mono px-3.5 py-2 rounded-xl bg-[#181822] hover:bg-[#222230] text-[#e8e6e3] hover:text-[#d4a853] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(212,168,83,0.35)] transition-all shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-xl rounded-2xl px-4 py-3 text-xs md:text-sm font-mono whitespace-pre-wrap leading-relaxed shadow-md ${
                m.role === "user"
                  ? "bg-[#d4a853] text-[#0c0c0e] font-medium"
                  : "bg-[#181820] text-[#e8e6e3] border border-[rgba(255,255,255,0.08)]"
              }`}
            >
              {m.content}
              {m.toolsUsed && m.toolsUsed.length > 0 && (
                <div className="text-[10px] font-mono text-[#97979d] mt-2.5 pt-2 border-t border-[rgba(255,255,255,0.08)] flex items-center gap-1.5 flex-wrap">
                  <span className="text-[#d4a853]">Telemetry sources:</span>
                  {m.toolsUsed.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-[#0e0e12] border border-[rgba(255,255,255,0.08)] text-[#e8e6e3]">
                      {t.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {ask.isPending && (
          <div className="flex justify-start">
            <div className="bg-[#181820] text-[#d4a853] border border-[rgba(212,168,83,0.2)] rounded-2xl px-4 py-2.5 text-xs font-mono flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-[#d4a853] border-t-transparent rounded-full animate-spin" />
              <span>Analyzing warehouse telemetry & models...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-[rgba(212,90,74,0.12)] border border-[rgba(212,90,74,0.3)] text-xs font-mono text-[#d45a4a]">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ─── INPUT FORM ─── */}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
          placeholder="Ask about your inventory, stockout risks, or dead capital..."
          className="flex-1 border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] rounded-xl px-4 py-3 text-xs md:text-sm bg-[#121216] text-[#e8e6e3] placeholder-[#5c5c64] transition-colors font-mono focus:outline-none"
        />
        <button
          onClick={() => handleSend(input)}
          disabled={ask.isPending || !input.trim()}
          className="bg-[#d4a853] hover:bg-[#e8be66] active:scale-95 text-[#0c0c0e] font-semibold font-mono text-xs md:text-sm px-5 py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-1.5"
        >
          Send →
        </button>
      </div>
    </div>
  );
}

export default AIAssistantPage;