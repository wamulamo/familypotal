"use client";

import { useState, useRef } from "react";
import { OPTIONAL_MENU_ITEMS } from "@/config/menu";
import { RoleIcon } from "@/components/RoleIcon";
import { getChannelId, getPlaylistId } from "@/lib/youtube";

interface SettingsFormProps {
  initial: {
    system_prompt: string;
    ng_words: string[];
    semantic_filter_prompt: string;
    enabled_menu_ids: string[];
    allowed_youtube_urls: string[];
    allowed_youtube_channel_ids: string[];
    allowed_youtube_playlist_ids: string[];
    daily_watch_limit_minutes: number;
    role_icons: { papa: string; mama: string; michi: string };
  };
}

export function SettingsForm({ initial }: SettingsFormProps) {
  const [systemPrompt, setSystemPrompt] = useState(initial.system_prompt);
  const [ngWordsText, setNgWordsText] = useState(
    Array.isArray(initial.ng_words) ? initial.ng_words.join("\n") : ""
  );
  const [semanticFilterPrompt, setSemanticFilterPrompt] = useState(
    initial.semantic_filter_prompt
  );
  const [enabledMenuIds, setEnabledMenuIds] = useState<Set<string>>(
    () => new Set(Array.isArray(initial.enabled_menu_ids) ? initial.enabled_menu_ids : [])
  );
  const [youtubeUrlsText, setYoutubeUrlsText] = useState(
    Array.isArray(initial.allowed_youtube_urls) ? initial.allowed_youtube_urls.join("\n") : ""
  );
  const [youtubeChannelsText, setYoutubeChannelsText] = useState(
    Array.isArray(initial.allowed_youtube_channel_ids) ? initial.allowed_youtube_channel_ids.join("\n") : ""
  );
  const [youtubePlaylistsText, setYoutubePlaylistsText] = useState(
    Array.isArray(initial.allowed_youtube_playlist_ids) ? initial.allowed_youtube_playlist_ids.join("\n") : ""
  );
  const [dailyWatchLimit, setDailyWatchLimit] = useState(
    Number(initial.daily_watch_limit_minutes) || 30
  );
  const [roleIcons, setRoleIcons] = useState(initial.role_icons ?? { papa: "👨", mama: "👩", michi: "👧" });
  const [uploading, setUploading] = useState<"papa" | "mama" | "michi" | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({ papa: null, mama: null, michi: null });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"success" | "success_need_migration" | "success_need_channel_migration" | "error" | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [historyCleared, setHistoryCleared] = useState(false);

  const clearAiHistory = async () => {
    if (!confirm("AIチャットの履歴をすべて削除します。よろしいですか？")) return;
    setClearingHistory(true);
    setHistoryCleared(false);
    try {
      const res = await fetch("/api/messages?channel=ai&keepCount=0", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "削除に失敗しました");
      }
      setHistoryCleared(true);
    } catch (e) {
      setMessage("error");
      setErrorDetail(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setClearingHistory(false);
    }
  };

  const uploadIcon = async (r: "papa" | "mama" | "michi", file: File) => {
    setUploading(r);
    try {
      const formData = new FormData();
      formData.set("role", r);
      formData.set("file", file);
      const res = await fetch("/api/role-icons/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "アップロードに失敗しました");
      if (data.url) setRoleIcons((prev) => ({ ...prev, [r]: data.url }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploading(null);
      const input = fileInputRefs.current[r];
      if (input) input.value = "";
    }
  };

  const clearIcon = (r: "papa" | "mama" | "michi") => {
    setRoleIcons((prev) => ({ ...prev, [r]: r === "papa" ? "👨" : r === "mama" ? "👩" : "👧" }));
  };

  const toggleMenu = (id: string) => {
    setEnabledMenuIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resolveChannelIds = async (lines: string[]): Promise<string[]> => {
    const ids: string[] = [];
    for (const line of lines) {
      const id = getChannelId(line);
      if (id) {
        ids.push(id);
        continue;
      }
      const r = await fetch(
        "/api/youtube/resolve-channel?input=" + encodeURIComponent(line.trim())
      );
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.channelId) {
        ids.push(d.channelId);
      } else if (!r.ok && d.error) {
        throw new Error(d.error);
      }
    }
    return ids;
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setErrorDetail(null);
    const ngWords = ngWordsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const channelLines = youtubeChannelsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const allowed_youtube_channel_ids = await resolveChannelIds(channelLines);
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          ng_words: ngWords,
          semantic_filter_prompt: semanticFilterPrompt,
          enabled_menu_ids: Array.from(enabledMenuIds),
          allowed_youtube_urls: youtubeUrlsText.split("\n").map((s) => s.trim()).filter(Boolean),
          allowed_youtube_channel_ids,
          allowed_youtube_playlist_ids: youtubePlaylistsText
            .split("\n")
            .map((s) => getPlaylistId(s))
            .filter((id): id is string => id !== null),
          daily_watch_limit_minutes: Math.max(1, Math.min(1440, dailyWatchLimit)),
          role_icons: {
            papa: roleIcons.papa?.trim() || "👨",
            mama: roleIcons.mama?.trim() || "👩",
            michi: roleIcons.michi?.trim() || "👧",
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "保存できませんでした");
      }
      const data = await res.json().catch(() => ({}));
      if (data._channel_ids_skipped) setMessage("success_need_channel_migration");
      else if (data._menu_ids_skipped) setMessage("success_need_migration");
      else setMessage("success");
    } catch (e) {
      setMessage("error");
      setErrorDetail(e instanceof Error ? e.message : "保存できませんでした");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="block">
        <span className="block text-lg font-bold mb-2">メンバーのアイコン</span>
        <p className="text-base text-[var(--text-muted)] mb-3">
          伝言板・チャットで表示するアイコンです。スマホの写真を選択すると丸く表示されます。未設定の場合は絵文字になります
        </p>
        <div className="grid grid-cols-3 gap-4">
          {(["papa", "mama", "michi"] as const).map((r) => (
            <div key={r} className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">
                {r === "papa" ? "パパ" : r === "mama" ? "ママ" : "みち"}
              </span>
              <div className="relative">
                <RoleIcon role={r} value={roleIcons[r] ?? ""} size="lg" className="w-20 h-20" />
              </div>
              <input
                ref={(el) => { fileInputRefs.current[r] = el; }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadIcon(r, f);
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[r]?.click()}
                  disabled={uploading !== null}
                  className="px-3 py-1.5 rounded-lg text-sm bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {uploading === r ? "送信中…" : "写真を選ぶ"}
                </button>
                <button
                  type="button"
                  onClick={() => clearIcon(r)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--border)]"
                >
                  絵文字に戻す
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="block text-lg font-bold mb-2">AI システムプロンプト</span>
        <p className="text-base text-[var(--text-muted)] mb-2">
          AIの口調や回答のルールを指定します
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={5}
          className="w-full text-chat-input px-4 py-3 rounded-xl border-2 border-[var(--border)] focus:border-[var(--accent)] focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="block text-lg font-bold mb-2">NGワードリスト</span>
        <p className="text-base text-[var(--text-muted)] mb-2">
          1行に1つ。子どもがこの語を使うとAIは応答しません
        </p>
        <textarea
          value={ngWordsText}
          onChange={(e) => setNgWordsText(e.target.value)}
          rows={4}
          placeholder="例：&#10;不適切な語&#10;禁止語"
          className="w-full text-chat-input px-4 py-3 rounded-xl border-2 border-[var(--border)] focus:border-[var(--accent)] focus:outline-none"
        />
      </label>

      <div className="block">
        <span className="block text-lg font-bold mb-2">許可するYouTube動画</span>
        <p className="text-base text-[var(--text-muted)] mb-2">
          1行に1つ、許可する動画のURLを入力します。未入力の場合は動画ページに何も表示されません
        </p>
        <textarea
          value={youtubeUrlsText}
          onChange={(e) => setYoutubeUrlsText(e.target.value)}
          rows={4}
          placeholder="https://www.youtube.com/watch?v=xxxxx&#10;https://youtu.be/xxxxx"
          className="w-full text-chat-input px-4 py-3 rounded-xl border-2 border-[var(--border)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      <div className="block">
        <span className="block text-lg font-bold mb-2">許可するYouTubeチャンネル</span>
        <p className="text-base text-[var(--text-muted)] mb-2">
          1行に1つ、チャンネルURLまたはチャンネルID（UCで始まる24文字）を入力すると、そのチャンネルの直近動画が一括で許可されます。YouTube Data API キーが必要です
        </p>
        <textarea
          value={youtubeChannelsText}
          onChange={(e) => setYoutubeChannelsText(e.target.value)}
          rows={3}
          placeholder="https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxx"
          className="w-full text-chat-input px-4 py-3 rounded-xl border-2 border-[var(--border)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      <div className="block">
        <span className="block text-lg font-bold mb-2">許可するYouTubeプレイリスト（子どもに見せたいリスト）</span>
        <p className="text-base text-[var(--text-muted)] mb-2">
          1行に1つ、プレイリストのURLを入力すると、そのリスト内の動画がまとめて許可されます。YouTube Data API キーが必要です
        </p>
        <textarea
          value={youtubePlaylistsText}
          onChange={(e) => setYoutubePlaylistsText(e.target.value)}
          rows={3}
          placeholder="https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxxxxxxxxxxxx"
          className="w-full text-chat-input px-4 py-3 rounded-xl border-2 border-[var(--border)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      <div className="block">
        <span className="block text-lg font-bold mb-2">1日の視聴時間制限（分）</span>
        <p className="text-base text-[var(--text-muted)] mb-2">
          1人あたりの1日合計視聴時間の上限です（1〜1440分）
        </p>
        <input
          type="number"
          min={1}
          max={1440}
          value={dailyWatchLimit}
          onChange={(e) => setDailyWatchLimit(Number(e.target.value) || 30)}
          className="w-24 px-3 py-2 rounded-lg border-2 border-[var(--border)] focus:border-[var(--accent)] focus:outline-none"
        />
        <span className="ml-2 text-[var(--text-muted)]">分</span>
      </div>

      <div className="block">
        <span className="block text-lg font-bold mb-2">サイドメニューに表示する機能</span>
        <p className="text-base text-[var(--text-muted)] mb-2">
          使用する機能にチェックを入れるとサイドメニューに表示されます
        </p>
        <ul className="space-y-2">
          {OPTIONAL_MENU_ITEMS.map((item) => (
            <li key={item.id}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabledMenuIds.has(item.id)}
                  onChange={() => toggleMenu(item.id)}
                  className="w-4 h-4 rounded border-[var(--border)]"
                />
                <span>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <label className="block">
        <span className="block text-lg font-bold mb-2">セマンティック・フィルター</span>
        <p className="text-base text-[var(--text-muted)] mb-2">
          禁止したいトピックや概念を指定します。AIがこの内容に応答しないようにします
        </p>
        <textarea
          value={semanticFilterPrompt}
          onChange={(e) => setSemanticFilterPrompt(e.target.value)}
          rows={4}
          className="w-full text-chat-input px-4 py-3 rounded-xl border-2 border-[var(--border)] focus:border-[var(--accent)] focus:outline-none"
        />
      </label>

      <div className="block">
        <span className="block text-lg font-bold mb-2">AIチャット履歴</span>
        <p className="text-base text-[var(--text-muted)] mb-2">
          AIへの質問のやりとりをすべて削除します。削除後は元に戻せません
        </p>
        <button
          type="button"
          onClick={clearAiHistory}
          disabled={clearingHistory}
          className="px-4 py-2 rounded-xl border-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30 disabled:opacity-50"
        >
          {clearingHistory ? "削除中…" : "AIチャットの履歴をすべて削除"}
        </button>
        {historyCleared && (
          <p className="mt-2 text-green-600 dark:text-green-400 font-medium">履歴を削除しました</p>
        )}
      </div>

      {message === "success" && (
        <p className="text-green-600 font-medium">保存しました</p>
      )}
      {message === "success_need_migration" && (
        <p className="text-amber-600 font-medium">
          保存しました（追加メニューのオン/オフはマイグレーション 004 を実行すると利用できます）
        </p>
      )}
      {message === "success_need_channel_migration" && (
        <p className="text-amber-600 font-medium">
          保存しました（チャンネル許可はマイグレーション 005 を実行すると利用できます）
        </p>
      )}
      {message === "error" && (
        <p className="text-red-600 font-medium">
          {errorDetail ?? "保存できませんでした"}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full py-4 rounded-xl bg-[var(--accent)] text-white font-bold text-xl disabled:opacity-50"
      >
        {saving ? "保存中…" : "保存する"}
      </button>
    </div>
  );
}
