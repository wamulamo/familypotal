"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRoleIcons } from "@/contexts/RoleIconsContext";
import { RoleIcon } from "@/components/RoleIcon";
import type { Message } from "@/types/database";

const ROLE_LABELS: Record<"michi" | "papa" | "mama", string> = {
  michi: "みち",
  papa: "パパ",
  mama: "ママ",
};


interface ChatProps {
  role: "michi" | "papa" | "mama";
  displayName?: string;
}

type InputTab = "chat" | "ai";

export function Chat({ role, displayName }: ChatProps) {
  const roleIcons = useRoleIcons();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [inputTab, setInputTab] = useState<InputTab>("chat");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const signOut = async () => {
    await supabase.auth.signOut();
    // キャッシュを避けるためフルリロード（次に別の人がログインしたときに正しい役割になる）
    window.location.href = "/login";
  };

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const { messages: list } = await res.json();
        setMessages(list ?? []);
      }
    })();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newRow = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newRow.id)) return prev;
            // 楽観表示した仮メッセージと同じ内容なら置き換えて重複を防ぐ
            const tempIdx = prev.findIndex(
              (m) =>
                m.id.startsWith("temp-") &&
                m.role === newRow.role &&
                m.content === newRow.content
            );
            if (tempIdx !== -1) {
              const next = [...prev];
              next[tempIdx] = newRow;
              return next;
            }
            return [...prev, newRow];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    // 送信したメッセージをすぐ表示（楽観的更新）
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      thread_id: "",
      role,
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const forAi = inputTab === "ai";
    const controller = new AbortController();
    const timeoutMs = forAi ? 90000 : 15000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, role, forAi }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "送信できませんでした");
        setInput(text);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } else if (data.role === "ai" && data.content != null) {
        // AI返答をレスポンスから即表示（Realtimeを待たない）
        const aiMsg: Message = {
          id: data.aiMessageId,
          thread_id: "",
          role: "ai",
          content: data.content,
          created_at: data.created_at ?? new Date().toISOString(),
        };
        setMessages((prev) => {
          const next = prev.some((m) => m.id === aiMsg.id) ? prev : [...prev, aiMsg];
          return next;
        });
      }
    } catch (e) {
      clearTimeout(timeoutId);
      const isAbort = e instanceof Error && e.name === "AbortError";
      alert(
        isAbort
          ? "時間がかかりすぎています。もう一度おくってみてね。"
          : "つうしんエラーです。ネットをかくにんしてもう一度おくってね。"
      );
      setInput(text);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const label = ROLE_LABELS[role];
  const name = displayName || label;

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-[var(--bg)]">
      <header className="flex-none py-4 px-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
            aria-hidden
          >
            話
          </div>
          <h1 className="text-2xl font-bold text-center text-[var(--text)]">
            かぞくのAIチャット
          </h1>
          {role === "papa" && (
            <a
              href="/settings"
              className="text-base text-[var(--accent)] underline shrink-0"
            >
              せってい
            </a>
          )}
          <button
            type="button"
            onClick={signOut}
            className="text-base text-[var(--text-muted)] underline shrink-0 hover:text-[var(--text)]"
          >
            ログアウト
          </button>
        </div>
        <p className="text-base text-center text-[var(--text-muted)] mt-1">
          {name} として はいっているよ
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-chat-base text-[var(--text-muted)] text-center py-8">
            メッセージを おくって みよう
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2 ${m.role === "ai" ? "justify-start" : "justify-end"}`}
          >
            {m.role === "ai" && (
              <img
                src="/ai-icon.svg"
                alt=""
                className="w-9 h-9 rounded-full shrink-0 object-cover"
                aria-hidden
              />
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3 text-chat-base ${
                m.role === "ai"
                  ? "bg-[var(--bubble-ai)] text-left"
                  : "bg-[var(--bubble-user)] text-right"
              }`}
            >
              <span className="font-bold text-sm block mb-1 opacity-80 flex items-center gap-1.5">
                {m.role !== "ai" && (
                  <span className="inline-flex" aria-hidden>
                    <RoleIcon role={m.role} value={roleIcons[m.role]} size="xs" />
                  </span>
                )}
                {m.role === "ai" ? "AI" : ROLE_LABELS[m.role]}
              </span>
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
            </div>
            {m.role !== "ai" && (
              <RoleIcon role={m.role} value={roleIcons[m.role]} size="sm" className="shrink-0" />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex-none p-4 border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="flex gap-1 mb-2">
          <button
            type="button"
            onClick={() => setInputTab("chat")}
            className={`px-4 py-2 rounded-t-lg text-chat-input font-medium ${
              inputTab === "chat"
                ? "bg-[var(--bg)] border-2 border-b-0 border-[var(--border)] -mb-0.5"
                : "bg-transparent border border-transparent text-[var(--text-muted)]"
            }`}
          >
            みんなへ
          </button>
          <button
            type="button"
            onClick={() => setInputTab("ai")}
            className={`px-4 py-2 rounded-t-lg text-chat-input font-medium ${
              inputTab === "ai"
                ? "bg-[var(--bg)] border-2 border-b-0 border-[var(--border)] -mb-0.5"
                : "bg-transparent border border-transparent text-[var(--text-muted)]"
            }`}
          >
            ＡＩにきく
          </button>
        </div>
        <div className="flex gap-2 bg-[var(--bg)] border-2 border-[var(--border)] rounded-b-xl rounded-tr-xl p-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={inputTab === "ai" ? "ＡＩに何について聞きたい？" : "メッセージを かいてね"}
            className="flex-1 text-chat-input px-4 py-3 rounded-lg bg-transparent placeholder:text-[var(--text-muted)] focus:outline-none"
            disabled={sending}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-bold text-chat-input disabled:opacity-50"
          >
            {sending ? "おくってる…" : "おくる"}
          </button>
        </div>
      </div>
    </div>
  );
}
