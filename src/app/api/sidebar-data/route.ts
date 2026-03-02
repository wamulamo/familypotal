import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOptionalItemsByIds } from "@/config/menu";

const FIXED_ITEMS: { path: string; label: string; unreadKey: "board" | null; icon: string }[] = [
  { path: "/board", label: "かぞく伝言板", unreadKey: "board", icon: "📋" },
  { path: "/ai", label: "AIへの質問", unreadKey: null, icon: "🤖" },
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 並列で chat_settings と board latest を取得
  const [settingsRes, boardRes] = await Promise.all([
    supabase.from("chat_settings").select("*").limit(1).maybeSingle(),
    (async () => {
      const { data: threads } = await supabase
        .from("threads")
        .select("id")
        .limit(1)
        .order("created_at", { ascending: true });
      const threadId = threads?.[0]?.id;
      if (!threadId) return { latest_at: null as string | null };
      const { data: rows } = await supabase
        .from("messages")
        .select("created_at")
        .eq("thread_id", threadId)
        .eq("channel", "dennnon")
        .order("created_at", { ascending: false })
        .limit(1);
      return { latest_at: rows?.[0]?.created_at ?? null };
    })(),
  ]);

  const row = settingsRes.data as { enabled_menu_ids?: string[] } | null;
  const enabledIds = row?.enabled_menu_ids ?? [];
  const optionalItems = getOptionalItemsByIds(enabledIds);
  const optionalIcons: Record<string, string> = { game: "🧮", youtube: "📺" };
  const items = [
    ...FIXED_ITEMS.map(({ path, label, unreadKey, icon }) => ({
      path,
      label,
      unreadKey,
      icon: icon ?? "•",
    })),
    ...optionalItems.map((item) => ({
      path: item.path,
      label: item.label,
      unreadKey: null as null,
      icon: optionalIcons[item.id] ?? "•",
    })),
  ];

  return NextResponse.json({
    items,
    latest_at: boardRes.latest_at,
  });
}
