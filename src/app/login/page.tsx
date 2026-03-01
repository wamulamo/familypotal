"use client";

import { useState } from "react";

export default function LoginPage() {
  const [role, setRole] = useState<"michi" | "papa" | "mama">("michi");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const signIn = async () => {
    setError("");
    if (!password.trim()) {
      setError("パスワードを いれてね");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "ログインできませんでした");
        return;
      }
      // キャッシュを避けるためフルリロードして、正しい役割（みち/パパ/ママ）で表示する
      window.location.href = "/";
    } catch (e) {
      const msg =
        e instanceof Error && e.message?.toLowerCase().includes("fetch")
          ? "つうしんエラーです。ターミナルで npm run dev が うごいていますか？ いちど とめて また きどう してみてね。"
          : e instanceof Error
            ? e.message
            : "ログインできませんでした";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-lg p-8 border border-[var(--border)]">
        <h1 className="text-2xl font-bold text-center mb-6">
          かぞくポータル
        </h1>
        <p className="text-base text-[var(--text-muted)] text-center mb-6">
          だれで はいりますか？ パスワードを いれて ログイン
        </p>

        <div className="space-y-4">
          <label className="block">
            <span className="block text-base font-medium mb-1">だれではいる？</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "michi" | "papa" | "mama")}
              className="w-full text-chat-input px-4 py-3 rounded-xl border-2 border-[var(--border)]"
            >
              <option value="michi">みち</option>
              <option value="papa">パパ</option>
              <option value="mama">ママ</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-base font-medium mb-1">パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && signIn()}
              className="w-full text-chat-input px-4 py-3 rounded-xl border-2 border-[var(--border)]"
              placeholder="パスワード"
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 text-red-600 text-base" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={signIn}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-bold text-chat-input disabled:opacity-50"
          >
            {loading ? "ログインちゅう…" : "ログイン"}
          </button>
        </div>
      </div>
    </div>
  );
}
