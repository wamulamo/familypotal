import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let { data: threads } = await supabase
    .from("threads")
    .select("id")
    .limit(1)
    .order("created_at", { ascending: true });
  let threadId = threads?.[0]?.id;
  if (!threadId) {
    const { data: inserted } = await supabase
      .from("threads")
      .insert({})
      .select("id")
      .single();
    threadId = inserted?.id;
  }
  if (!threadId) {
    return NextResponse.json({ messages: [] });
  }

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel"); // "dennnon" | "ai" | null(従来どおりすべて)

  let query = supabase
    .from("messages")
    .select("id, thread_id, role, content, created_at, channel")
    .eq("thread_id", threadId);
  if (channel === "dennnon" || channel === "ai") {
    query = query.eq("channel", channel);
  }
  const { data: messages, error } = await query.order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ messages: messages ?? [] });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");
  const keepCountParam = searchParams.get("keepCount");
  const keepCount = keepCountParam ? parseInt(keepCountParam, 10) : 100;
  if (!Number.isFinite(keepCount) || keepCount < 0) {
    return NextResponse.json({ error: "keepCount は 0 以上の数字で指定してください" }, { status: 400 });
  }
  if (channel !== "dennnon" && channel !== "ai") {
    return NextResponse.json({ error: "channel は dennnon または ai で指定してください" }, { status: 400 });
  }

  // keepCount === 0 のときは該当チャンネルのメッセージをすべて削除
  if (keepCount === 0) {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("channel", channel);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // 新しい順で keepCount 件目の created_at を取得（件数未満なら削除しない）
  const { data: cutoffRow } = await supabase
    .from("messages")
    .select("created_at")
    .eq("channel", channel)
    .order("created_at", { ascending: false })
    .range(keepCount - 1, keepCount - 1)
    .maybeSingle();

  if (!cutoffRow?.created_at) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("channel", channel)
    .lt("created_at", cutoffRow.created_at);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
