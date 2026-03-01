import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** 本日の視聴秒数を返す（制限チェック用） */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: row } = await supabase
    .from("watch_logs")
    .select("seconds_watched")
    .eq("user_id", user.id)
    .eq("watched_date", today)
    .maybeSingle();

  const today_seconds = Number(row?.seconds_watched ?? 0);
  return NextResponse.json({ today_seconds });
}
