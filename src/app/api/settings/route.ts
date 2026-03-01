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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "papa") {
    return NextResponse.json({ error: "設定の変更はパパのみ可能です" }, { status: 403 });
  }

  const { data: row, error } = await supabase
    .from("chat_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(row ?? null);
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "papa") {
    return NextResponse.json({ error: "設定の変更はパパのみ可能です" }, { status: 403 });
  }

  let body: {
    system_prompt?: string;
    ng_words?: string[];
    semantic_filter_prompt?: string;
    enabled_menu_ids?: string[];
    allowed_youtube_urls?: string[];
    allowed_youtube_channel_ids?: string[];
    allowed_youtube_playlist_ids?: string[];
    daily_watch_limit_minutes?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("chat_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  const payload = {
    ...(body.system_prompt !== undefined && { system_prompt: body.system_prompt }),
    ...(body.ng_words !== undefined && { ng_words: body.ng_words }),
    ...(body.semantic_filter_prompt !== undefined && {
      semantic_filter_prompt: body.semantic_filter_prompt,
    }),
    ...(body.enabled_menu_ids !== undefined && { enabled_menu_ids: body.enabled_menu_ids }),
    ...(body.allowed_youtube_urls !== undefined && { allowed_youtube_urls: body.allowed_youtube_urls }),
    ...(body.allowed_youtube_channel_ids !== undefined && { allowed_youtube_channel_ids: body.allowed_youtube_channel_ids }),
    ...(body.allowed_youtube_playlist_ids !== undefined && { allowed_youtube_playlist_ids: body.allowed_youtube_playlist_ids }),
    ...(body.daily_watch_limit_minutes !== undefined && { daily_watch_limit_minutes: body.daily_watch_limit_minutes }),
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    let result = await supabase
      .from("chat_settings")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (result.error && (result.error.message.includes("enabled_menu_ids") || result.error.message.includes("does not exist"))) {
      const { enabled_menu_ids: _, ...payloadWithoutMenu } = payload as typeof payload & { enabled_menu_ids?: string[] };
      result = await supabase
        .from("chat_settings")
        .update(payloadWithoutMenu)
        .eq("id", existing.id)
        .select()
        .single();
      if (!result.error) {
        return NextResponse.json({ ...result.data, _menu_ids_skipped: true });
      }
    }
    if (result.error && (result.error.message.includes("allowed_youtube_channel_ids") || result.error.message.includes("allowed_youtube_playlist_ids"))) {
      const { allowed_youtube_channel_ids: __, allowed_youtube_playlist_ids: ___, ...payloadWithoutYoutubeExtra } = payload as typeof payload & { allowed_youtube_channel_ids?: string[]; allowed_youtube_playlist_ids?: string[] };
      result = await supabase
        .from("chat_settings")
        .update(payloadWithoutYoutubeExtra)
        .eq("id", existing.id)
        .select()
        .single();
      if (!result.error) {
        return NextResponse.json({ ...result.data, _channel_ids_skipped: true });
      }
    }
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    return NextResponse.json(result.data);
  }

  const { data: threads } = await supabase
    .from("threads")
    .select("id")
    .limit(1)
    .order("created_at", { ascending: true });
  const threadId = threads?.[0]?.id ?? null;

  let insertPayload = {
    thread_id: threadId,
    system_prompt: body.system_prompt ?? "",
    ng_words: body.ng_words ?? [],
    semantic_filter_prompt: body.semantic_filter_prompt ?? "",
    enabled_menu_ids: body.enabled_menu_ids ?? [] as string[],
    allowed_youtube_urls: body.allowed_youtube_urls ?? [],
    allowed_youtube_channel_ids: body.allowed_youtube_channel_ids ?? [],
    allowed_youtube_playlist_ids: body.allowed_youtube_playlist_ids ?? [],
    daily_watch_limit_minutes: body.daily_watch_limit_minutes ?? 30,
  };
  let result = await supabase.from("chat_settings").insert(insertPayload).select().single();
  if (result.error && (result.error.message.includes("enabled_menu_ids") || result.error.message.includes("does not exist"))) {
    const { enabled_menu_ids: _, ...rest } = insertPayload;
    result = await supabase.from("chat_settings").insert(rest).select().single();
    if (!result.error) {
      return NextResponse.json({ ...result.data, _menu_ids_skipped: true });
    }
  }
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
