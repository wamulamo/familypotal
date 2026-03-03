import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/board/reads?ids=id1,id2,...
// Returns { [message_id]: reader_role[] }
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) {
    return NextResponse.json({});
  }

  const idList = ids.split(",").filter(Boolean);
  if (idList.length === 0) {
    return NextResponse.json({});
  }

  const { data, error } = await supabase
    .from("board_reads")
    .select("message_id, reader_role")
    .in("message_id", idList);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result: Record<string, string[]> = {};
  for (const row of data ?? []) {
    if (!result[row.message_id]) result[row.message_id] = [];
    result[row.message_id].push(row.reader_role);
  }
  return NextResponse.json(result);
}

// POST /api/board/reads
// Body: { message_id: string }
// Inserts a read record for the current user's role
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message_id } = await req.json();
  if (!message_id) {
    return NextResponse.json({ error: "message_id is required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { error } = await supabase.from("board_reads").insert({
    message_id,
    reader_role: profile.role,
  });

  // ON CONFLICT DO NOTHING equivalent: ignore unique violation
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
