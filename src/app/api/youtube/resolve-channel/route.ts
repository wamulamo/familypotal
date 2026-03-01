import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChannelId } from "@/lib/youtube";

/**
 * 入力（@handleのURL・チャンネルURL・チャンネルID）をチャンネルIDに変換する。
 * @handle の場合は YouTube Data API で解決。要 YOUTUBE_API_KEY。
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const input = searchParams.get("input")?.trim() ?? "";
  if (!input) {
    return NextResponse.json({ error: "input required" }, { status: 400 });
  }

  const fromIdOrUrl = getChannelId(input);
  if (fromIdOrUrl) {
    return NextResponse.json({ channelId: fromIdOrUrl });
  }

  const handleMatch = input.match(/(?:youtube\.com\/)?@([a-zA-Z0-9_]+)/);
  const handle = handleMatch ? handleMatch[1] : input.startsWith("@") ? input.slice(1) : null;
  if (!handle) {
    return NextResponse.json({ error: "チャンネルURLまたは@ハンドルを入力してください" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "@ハンドルを使うには設定に YOUTUBE_API_KEY を追加してください" },
      { status: 503 }
    );
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("part", "id");
  url.searchParams.set("forHandle", handle.startsWith("@") ? handle : `@${handle}`);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: `YouTube API エラー: ${res.status}` },
      { status: 502 }
    );
  }
  const data = (await res.json()) as { items?: Array<{ id?: string }> };
  const channelId = data.items?.[0]?.id ?? null;
  if (!channelId) {
    return NextResponse.json(
      { error: "チャンネルが見つかりませんでした" },
      { status: 404 }
    );
  }
  return NextResponse.json({ channelId });
}
