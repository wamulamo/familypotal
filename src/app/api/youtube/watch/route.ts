import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** 視聴秒数を記録（監視・制限の集計用） */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { seconds?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const seconds = Math.max(0, Math.floor(Number(body?.seconds ?? 0)));
  if (seconds === 0) {
    return NextResponse.json({ ok: true });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("watch_logs")
    .select("id, seconds_watched")
    .eq("user_id", user.id)
    .eq("watched_date", today)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("watch_logs")
      .update({ seconds_watched: (existing.seconds_watched ?? 0) + seconds })
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase.from("watch_logs").insert({
      user_id: user.id,
      watched_date: today,
      seconds_watched: seconds,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
