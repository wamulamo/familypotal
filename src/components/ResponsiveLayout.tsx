"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";

function HamburgerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

export function ResponsiveLayout({
  role,
  children,
}: {
  role: "michi" | "papa" | "mama";
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setDrawerOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <div className="flex h-screen bg-[var(--bg)]">
      {/* デスクトップ: サイドバー常時表示 */}
      <div className="hidden md:block shrink-0">
        <Sidebar role={role} />
      </div>

      {/* モバイル: ヘッダー + メイン */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col md:flex-row">
        {/* モバイルヘッダー（md以上では非表示） */}
        <header className="md:hidden shrink-0 h-14 flex items-center gap-3 px-4 border-b border-[var(--border)] bg-[var(--surface)]">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 rounded-lg text-[var(--text)] hover:bg-[var(--border)] transition-colors"
            aria-label="メニューを開く"
          >
            <HamburgerIcon />
          </button>
          <span className="text-lg font-bold text-[var(--text)]">かぞくポータル</span>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
          {children}
        </main>
      </div>

      {/* モバイル: ドロワーオーバーレイ */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[var(--surface)] border-r border-[var(--border)] shadow-xl z-50 md:hidden flex flex-col overflow-hidden">
            <div className="shrink-0 flex justify-end p-2 border-b border-[var(--border)]">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors"
                aria-label="メニューを閉じる"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3">
              <Sidebar role={role} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
