"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export default function SayaniChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: `Sorry, something went wrong: ${err.error || res.statusText}`,
          };
          return copy;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                copy[copy.length - 1] = {
                  ...last,
                  content: last.content + parsed.text,
                };
                return copy;
              });
            }
            if (parsed.error) {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: `Error: ${parsed.error}`,
                };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `Connection error: ${err instanceof Error ? err.message : "unknown"}`,
        };
        return copy;
      });
    }

    setStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="sayani-fab"
          title="Ask Sayani, your librarian"
        >
          <img
            src="/sayani-avatar.png"
            alt="Sayani"
            className="sayani-fab-img"
          />
        </button>
      )}

      {/* Chat drawer */}
      {open && (
        <div className="sayani-drawer">
          <div className="sayani-header">
            <div className="sayani-header-left">
              <img
                src="/sayani-avatar.png"
                alt="Sayani"
                className="sayani-header-avatar"
              />
              <div>
                <div className="sayani-name">Sayani</div>
                <div className="sayani-subtitle">your librarian</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="action-btn"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="sayani-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="sayani-welcome">
                <p className="sayani-welcome-title">
                  Namaste! I&apos;m Sayani.
                </p>
                <p>
                  I know every link in this library. Ask me to find something,
                  explain a project, or recommend links on a topic.
                </p>
                <div className="sayani-suggestions">
                  {[
                    "What Rangamati links do we have?",
                    "Find all playbooks",
                    "Show me RARE India sites",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInput(s);
                        sendMessage(s);
                      }}
                      className="sayani-suggestion"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`sayani-msg ${msg.role === "user" ? "sayani-msg-user" : "sayani-msg-assistant"}`}
              >
                {msg.role === "assistant" && (
                  <img
                    src="/sayani-avatar.png"
                    alt=""
                    className="sayani-msg-avatar"
                  />
                )}
                <div className="sayani-msg-content">
                  {msg.role === "assistant" ? (
                    <FormattedMessage content={msg.content} />
                  ) : (
                    msg.content
                  )}
                  {streaming &&
                    msg.role === "assistant" &&
                    i === messages.length - 1 &&
                    !msg.content && (
                      <Loader2 size={14} className="animate-spin opacity-50" />
                    )}
                </div>
              </div>
            ))}
          </div>

          <div className="sayani-input-row">
            <input
              ref={inputRef}
              type="text"
              className="sayani-input"
              placeholder="Ask Sayani anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
            />
            <button
              onClick={() => sendMessage()}
              disabled={streaming || !input.trim()}
              className="sayani-send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function FormattedMessage({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const formatted = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="sayani-link">$1</a>',
      );

    elements.push(
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: formatted }} />
        {i < lines.length - 1 && <br />}
      </span>,
    );
  }

  return <>{elements}</>;
}
