import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: threads } = await supabase
    .from("threads")
    .select("id")
    .limit(1)
    .order("created_at", { ascending: true });
  const threadId = threads?.[0]?.id;
  if (!threadId) {
    return NextResponse.json({ latest_at: null });
  }

  const { data: rows } = await supabase
    .from("messages")
    .select("created_at")
    .eq("thread_id", threadId)
    .eq("channel", "dennnon")
    .order("created_at", { ascending: false })
    .limit(1);
  const latest_at = rows?.[0]?.created_at ?? null;
  return NextResponse.json({ latest_at });
}
