"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BOARD_LAST_READ_KEY = "board_last_read";

function GearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

interface MenuItem {
  path: string;
  label: string;
  unreadKey: string | null;
  icon?: string;
}

export function Sidebar({ role }: { role: "michi" | "papa" | "mama" }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [boardLatestAt, setBoardLatestAt] = useState<string | null>(null);
  const [lastRead, setLastRead] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setMenuItems(d?.items ?? []))
      .catch(() => setMenuItems([]));
  }, [pathname]);

  useEffect(() => {
    fetch("/api/board/latest")
      .then((r) => (r.ok ? r.json() : { latest_at: null }))
      .then((d) => setBoardLatestAt(d?.latest_at ?? null))
      .catch(() => setBoardLatestAt(null));
  }, [pathname]);

  useEffect(() => {
    try {
      setLastRead(localStorage.getItem(BOARD_LAST_READ_KEY));
    } catch {
      setLastRead(null);
    }
  }, [pathname]);

  const boardUnread = pathname !== "/board" && boardLatestAt && (!lastRead || boardLatestAt > lastRead);

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

  const base = "block w-full text-left py-3 px-4 rounded-lg text-sm font-medium transition-colors";
  const active = "bg-[var(--accent)] text-white";
  const inactive = "text-[var(--text)] hover:bg-[var(--border)]";

  return (
    <aside className="w-52 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-3 flex flex-col">
      <div className="mb-4 px-2">
        <span className="text-lg font-bold text-[var(--text)]">かぞくポータル</span>
      </div>
      <nav className="flex flex-col gap-1 flex-1 min-h-0">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center justify-between gap-2 ${pathname === item.path ? `${base} ${active}` : `${base} ${inactive}`}`}
          >
            <span className="flex items-center gap-2">
              {item.icon && <span className="text-base leading-none" aria-hidden>{item.icon}</span>}
              <span>{item.label}</span>
            </span>
            {item.unreadKey === "board" && boardUnread && (
              <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold" aria-label="未読あり">
                !
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="pt-2 mt-auto border-t border-[var(--border)]">
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--text)] transition-colors"
            aria-label="設定メニュー"
            aria-expanded={menuOpen}
          >
            <GearIcon />
          </button>
          {menuOpen && (
            <div className="absolute left-0 bottom-full mb-1 py-1 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-20">
              {role === "papa" && (
                <Link
                  href="/settings"
                  className="block px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--border)]"
                  onClick={() => setMenuOpen(false)}
                >
                  設定
                </Link>
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
      </div>
    </aside>
  );
}
