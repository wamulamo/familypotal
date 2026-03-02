import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_ICONS = { papa: "👨", mama: "👩", michi: "👧" };

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
    .select("role_icons")
    .limit(1)
    .maybeSingle();

  const raw = (row as { role_icons?: Record<string, string> } | null)?.role_icons;
  const icons = {
    papa: typeof raw?.papa === "string" && raw.papa ? raw.papa : DEFAULT_ICONS.papa,
    mama: typeof raw?.mama === "string" && raw.mama ? raw.mama : DEFAULT_ICONS.mama,
    michi: typeof raw?.michi === "string" && raw.michi ? raw.michi : DEFAULT_ICONS.michi,
  };
  return NextResponse.json(icons);
}
