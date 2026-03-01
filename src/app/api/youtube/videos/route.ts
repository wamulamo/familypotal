import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_IDS_PER_REQUEST = 50;

export interface VideoInfo {
  id: string;
  title: string;
  thumbnailUrl: string;
}

/** 動画IDの一覧からタイトル・サムネイルを取得（YouTube Data API v3） */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean).slice(0, 100) : [];
  if (ids.length === 0) {
    return NextResponse.json({ videos: [] });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ videos: [] });
  }

  const videos: VideoInfo[] = [];

  for (let i = 0; i < ids.length; i += MAX_IDS_PER_REQUEST) {
    const chunk = ids.slice(i, i + MAX_IDS_PER_REQUEST);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("id", chunk.join(","));

    const res = await fetch(url.toString());
    if (!res.ok) continue;

    const data = (await res.json()) as {
      items?: Array<{
        id?: string;
        snippet?: {
          title?: string;
          thumbnails?: {
            default?: { url?: string };
            medium?: { url?: string };
            high?: { url?: string };
          };
        };
      }>;
    };

    for (const item of data.items ?? []) {
      const id = item.id;
      if (!id) continue;
      const thumb = item.snippet?.thumbnails?.medium?.url
        ?? item.snippet?.thumbnails?.default?.url
        ?? item.snippet?.thumbnails?.high?.url
        ?? "";
      videos.push({
        id,
        title: item.snippet?.title ?? "",
        thumbnailUrl: thumb,
      });
    }
  }

  return NextResponse.json({ videos });
}
