"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

function GearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function AppHeader({
  role,
}: {
  role: "michi" | "papa" | "mama";
  displayName?: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const signOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="flex-none h-14 px-4 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-end">
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--text)] transition-colors"
          aria-label="設定メニュー"
          aria-expanded={menuOpen}
        >
          <GearIcon />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 py-1 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-10">
            {role === "papa" && (
              <a
                href="/settings"
                className="block px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--border)]"
                onClick={() => setMenuOpen(false)}
              >
                せってい
              </a>
            )}
            <button
              type="button"
              onClick={signOut}
              className="w-full text-left px-4 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--text)]"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
