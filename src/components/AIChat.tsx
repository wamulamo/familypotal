"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import type { Message } from "@/types/database";

export function AIChat() {
  const pathname = usePathname();
  const role = useRole();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    const res = await fetch("/api/messages?channel=ai", { cache: "no-store" });
    if (res.ok) {
      const { messages: list } = await res.json();
      setMessages(list ?? []);
    }
  }, []);

  // マウント時およびAIチャット画面に戻ってきたときに再取得
  useEffect(() => {
    if (pathname === "/ai") load();
  }, [pathname, load]);

  // 初回表示時のみ最新（一番下）へスクロール
  const didInitialScroll = useRef(false);
  useEffect(() => {
    if (messages.length > 0 && !didInitialScroll.current) {
      didInitialScroll.current = true;
      const t = setTimeout(() => bottomRef.current?.scrollIntoView(), 0);
      return () => clearTimeout(t);
    }
  }, [messages.length]);

  useEffect(() => {
    const channel = supabase
      .channel("ai-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newRow = payload.new as Message & { channel?: string };
          if (newRow.channel !== "ai") return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newRow.id)) return prev;
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
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        () => {
          // 削除が発生したら一覧を再取得（履歴全削除などに対応）
          load();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      thread_id: "",
      role,
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, role, channel: "ai", forAi: true }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "送信できませんでした");
        setInput(text);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } else if (data.role === "ai" && data.content != null) {
        const aiMsg: Message = {
          id: data.aiMessageId,
          thread_id: "",
          role: "ai",
          content: data.content,
          created_at: data.created_at ?? new Date().toISOString(),
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === aiMsg.id)) return prev;
          return [...prev, aiMsg];
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

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-chat-sm text-[var(--text-muted)] text-center py-8">
            ＡＩに なんでも きいてみよう
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
                className="w-8 h-8 rounded-full shrink-0 object-cover"
                aria-hidden
              />
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                m.role === "ai"
                  ? "bg-[var(--bubble-ai)] text-left"
                  : "bg-[var(--bubble-user)] text-right"
              }`}
            >
              {m.role === "ai" ? (
                <div className="markdown-body text-chat-sm text-[var(--text)] [&_*]:break-words [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1 [&_h1]:first:mt-0 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-0.5 [&_p]:my-0.5 [&_p]:leading-relaxed [&_ul]:my-1 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-1 [&_ol]:pl-5 [&_ol]:list-decimal [&_strong]:font-bold [&_em]:italic [&_code]:bg-black/10 dark:bg-white/20 [&_code]:px-1 [&_code]:rounded [&_code]:text-[0.9em] [&_pre]:my-1 [&_pre]:p-2 [&_pre]:rounded [&_pre]:bg-black/10 dark:bg-white/20 [&_pre]:overflow-x-auto">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words text-chat-sm">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} aria-hidden />
      </div>
      <div className="flex-none p-4 border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="ＡＩに何について聞きたい？"
            className="flex-1 text-chat-input px-4 py-3 rounded-xl border-2 border-[var(--border)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            disabled={sending}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="px-5 py-3 rounded-xl bg-[var(--accent)] text-white font-bold text-chat-input disabled:opacity-50"
          >
            {sending ? "おくってる…" : "おくる"}
          </button>
        </div>
      </div>
    </div>
  );
}
