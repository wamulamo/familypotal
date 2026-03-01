import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOptionalItemsByIds } from "@/config/menu";

/** 固定メニュー（常に表示） */
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

  const { data: row } = await supabase
    .from("chat_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  const enabledIds = (row as { enabled_menu_ids?: string[] } | null)?.enabled_menu_ids ?? [];
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

  return NextResponse.json({ items });
}
