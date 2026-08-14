import { useState } from "react";

import { USE_MOCK_API } from "../api/client";
import { taskflowApi } from "../api/taskflowApi";
import useTaskFlow from "../hooks/useTaskFlow";
import Button from "./ui/Button";
import Card from "./ui/Card";
import { TextInput } from "./ui/Field";

function AiChatSidebar() {
  const { currentProject } = useTaskFlow();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    if (USE_MOCK_API) {
      setError("AI chat needs a live API. Set VITE_USE_MOCK_API=false.");
      return;
    }

    const nextHistory = [...history, { role: "user", content: text }];
    setHistory(nextHistory);
    setMessage("");
    setBusy(true);
    setError("");
    try {
      const data = await taskflowApi.aiChat({
        message: text,
        history: nextHistory.slice(-8),
        project_id: currentProject?.id,
      });
      setHistory([
        ...nextHistory,
        { role: "assistant", content: data.answer, tools: data.tools_used },
      ]);
    } catch (err) {
      setError(err.message || "Chat failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-[var(--tf-accent)] px-4 py-3 text-sm font-bold text-[var(--tf-accent-ink)] shadow-lg"
      >
        {open ? "Close AI" : "AI Chat"}
      </button>

      {open ? (
        <Card className="fixed bottom-24 right-6 z-40 flex h-[480px] w-[min(420px,calc(100vw-2rem))] flex-col p-4">
          <p className="tf-eyebrow">AI assistant</p>
          <p className="mt-1 text-sm text-[var(--tf-muted)]">
            Ask about delayed tasks, your work, or project status.
          </p>
          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-auto">
            {history.length === 0 ? (
              <p className="text-sm text-[var(--tf-faint)]">
                Try: “What is delayed?” or “What are my tasks?”
              </p>
            ) : (
              history.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={[
                    "rounded-xl px-3 py-2 text-sm",
                    item.role === "user"
                      ? "ml-8 bg-[var(--tf-accent-soft)] text-white"
                      : "mr-8 bg-white/[0.04] text-[var(--tf-muted)]",
                  ].join(" ")}
                >
                  {item.content}
                </div>
              ))
            )}
          </div>
          {error ? <p className="mt-2 text-xs text-[var(--tf-danger)]">{error}</p> : null}
          <form className="mt-3 flex gap-2" onSubmit={send}>
            <TextInput
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={busy ? "Thinking…" : "Ask TaskFlow AI"}
              disabled={busy}
            />
            <Button type="submit" variant="primary" disabled={busy}>
              Send
            </Button>
          </form>
        </Card>
      ) : null}
    </>
  );
}

export default AiChatSidebar;
