"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useRoleIcons } from "@/contexts/RoleIconsContext";
import { RoleIcon } from "@/components/RoleIcon";
import type { Message } from "@/types/database";

const BOARD_ORDER: ("papa" | "mama" | "michi")[] = ["papa", "mama", "michi"];
const ROLE_LABELS: Record<"michi" | "papa" | "mama", string> = {
  michi: "みち",
  papa: "パパ",
  mama: "ママ",
};

const BUBBLE_STYLES: Record<"papa" | "mama" | "michi", { bg: string; border: string }> = {
  papa: { bg: "bg-cyan-50 dark:bg-cyan-950/40", border: "border-cyan-200 dark:border-cyan-700" },
  mama: { bg: "bg-pink-50 dark:bg-pink-950/40", border: "border-pink-200 dark:border-pink-700" },
  michi: { bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-700" },
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLatestByRole(messages: Message[]): Record<"papa" | "mama" | "michi", Message | null> {
  const byRole: Record<string, Message> = {};
  const sorted = [...messages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  for (const m of sorted) {
    if (m.role in byRole) continue;
    byRole[m.role] = m;
  }
  return {
    papa: byRole.papa ?? null,
    mama: byRole.mama ?? null,
    michi: byRole.michi ?? null,
  };
}

const BOARD_LAST_READ_KEY = "board_last_read";

// threadId はセッション中に変化しないのでモジュール変数でキャッシュ
let _boardThreadId: string | null = null;

export function Board() {
  const role = useRole();
  const roleIcons = useRoleIcons();
  const [messages, setMessages] = useState<Message[]>([]);
  // draft は入力中のテキストのみ管理（表示はサーバー内容を直接使う）
  const [draft, setDraft] = useState<Record<"papa" | "mama" | "michi", string>>({
    papa: "",
    mama: "",
    michi: "",
  });
  const [sending, setSending] = useState(false);
  const [reads, setReads] = useState<Record<string, string[]>>({});
  const supabase = useMemo(() => createClient(), []);

  // Supabase を直接クエリ（API Route 経由のラウンドトリップを省略）
  const load = useCallback(async () => {
    if (!_boardThreadId) {
      const { data } = await supabase
        .from("threads")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1);
      _boardThreadId = data?.[0]?.id ?? null;
    }
    if (!_boardThreadId) return;
    const { data } = await supabase
      .from("messages")
      .select("id, thread_id, role, content, created_at, channel")
      .eq("thread_id", _boardThreadId)
      .eq("channel", "dennnon")
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) ?? []);
  }, [supabase]);

  const loadReads = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data } = await supabase
      .from("board_reads")
      .select("message_id, reader_role")
      .in("message_id", ids);
    const result: Record<string, string[]> = {};
    for (const row of (data ?? []) as { message_id: string; reader_role: string }[]) {
      if (!result[row.message_id]) result[row.message_id] = [];
      result[row.message_id].push(row.reader_role);
    }
    setReads(result);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("board-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newRow = payload.new as Message & { channel?: string };
          if (newRow.channel !== "dennnon") return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newRow.id)) return prev;
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
    const channel = supabase
      .channel("board-reads")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "board_reads" },
        (payload) => {
          const row = payload.new as { message_id: string; reader_role: string };
          setReads((prev) => {
            const existing = prev[row.message_id] ?? [];
            if (existing.includes(row.reader_role)) return prev;
            return { ...prev, [row.message_id]: [...existing, row.reader_role] };
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // 表示時に未読を解消
  useEffect(() => {
    const latest = messages.reduce<string | null>((acc, m) => {
      const t = m.created_at;
      return !acc || t > acc ? t : acc;
    }, null);
    if (latest) {
      try {
        localStorage.setItem(BOARD_LAST_READ_KEY, latest);
      } catch {}
    }
  }, [messages]);

  const latestByRole = useMemo(() => getLatestByRole(messages), [messages]);

  useEffect(() => {
    const ids = BOARD_ORDER
      .map((r) => latestByRole[r]?.id)
      .filter((id): id is string => !!id);
    loadReads(ids);
  }, [latestByRole, loadReads]);

  const save = async (r: "papa" | "mama" | "michi") => {
    const text = draft[r].trim();
    if (sending || r !== role || text === "") return;
    setSending(true);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, role: r, channel: "dennnon" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "送信できませんでした");
      } else {
        setDraft((prev) => ({ ...prev, [r]: "" }));
        load();
      }
    } finally {
      setSending(false);
    }
  };

  const markRead = async (messageId: string) => {
    setReads((prev) => {
      const existing = prev[messageId] ?? [];
      if (existing.includes(role)) return prev;
      return { ...prev, [messageId]: [...existing, role] };
    });
    await fetch("/api/board/reads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: messageId }),
    });
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full overflow-y-auto">
      <div className="p-4 space-y-6">
        {BOARD_ORDER.map((r) => {
          const msg = latestByRole[r];
          const isOwn = r === role;
          const displayContent = msg?.content?.trim() || "";
          const style = BUBBLE_STYLES[r];
          const msgReaders = msg ? (reads[msg.id] ?? []) : [];
          const hasRead = msg ? msgReaders.includes(role) : false;

          return (
            <div key={r} className="flex gap-3 items-start">
              {/* 左: ロールラベル＋アイコン */}
              <div className="flex flex-col items-center shrink-0 w-[72px]">
                <span className="text-chat-xs font-bold text-[var(--text-muted)] mb-1">
                  {ROLE_LABELS[r]}
                </span>
                <RoleIcon role={r} value={roleIcons[r]} size="lg" className="shadow-sm" />
              </div>

              {/* 右: 吹き出し */}
              <div className={`flex-1 min-w-0 rounded-2xl border-2 ${style.bg} ${style.border} pl-4 pr-4 pt-3 pb-3 shadow-sm`}>
                {/* 更新日時 */}
                {msg?.created_at && (
                  <p className="text-chat-xs text-[var(--text-muted)] mb-2">
                    更新: {formatDateTime(msg.created_at)}
                  </p>
                )}

                {/* 現在の内容表示（サーバー内容をそのまま表示・全デバイス共通） */}
                <p className="text-chat-sm whitespace-pre-wrap break-words text-[var(--text)] min-h-[2.5rem]">
                  {displayContent || "（まだ かいてないよ）"}
                </p>

                {/* 読んだよ欄 */}
                {msg && displayContent && (
                  <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center gap-2 min-h-[2rem]">
                    <div className="flex items-center gap-1">
                      {BOARD_ORDER.filter((rr) => rr !== r && msgReaders.includes(rr)).map((rr) => (
                        <RoleIcon
                          key={rr}
                          role={rr}
                          value={roleIcons[rr]}
                          size="sm"
                          className="opacity-90"
                        />
                      ))}
                    </div>
                    {!isOwn && !hasRead && (
                      <button
                        type="button"
                        onClick={() => markRead(msg.id)}
                        className="ml-auto px-3 py-1 rounded-lg text-chat-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
                      >
                        読んだよ
                      </button>
                    )}
                  </div>
                )}

                {/* 編集エリア（自分のみ） */}
                {isOwn && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <textarea
                      value={draft[r]}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [r]: e.target.value }))}
                      placeholder="あたらしいでんごんを かいてね"
                      className="w-full min-h-[80px] text-chat-sm p-3 rounded-xl border border-[var(--border)] bg-white/90 dark:bg-black/20 placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-y"
                      disabled={sending}
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => save(r)}
                        disabled={sending || draft[r].trim() === ""}
                        className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-chat-sm font-medium disabled:opacity-50"
                      >
                        {sending ? "保存中…" : "保存"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
