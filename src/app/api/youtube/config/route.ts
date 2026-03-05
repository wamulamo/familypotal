import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVideoId } from "@/lib/youtube";
import { fetchVideoIdsByChannelId, fetchVideoIdsByPlaylistId, VideoIdWithDate } from "@/lib/youtube-api";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5分
let cachedVideoIds: { video_ids: string[]; expiresAt: number } | null = null;

/** 認証済みユーザーが参照するYouTube設定（許可URL・許可チャンネル・動画ID一覧・1日の制限分数） */
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

  const raw = row as {
    allowed_youtube_urls?: string[];
    allowed_youtube_channel_ids?: string[];
    allowed_youtube_playlist_ids?: string[];
    daily_watch_limit_minutes?: number;
  } | null;

  const allowed_youtube_urls = raw?.allowed_youtube_urls ?? [];
  const allowed_youtube_channel_ids = Array.isArray(raw?.allowed_youtube_channel_ids)
    ? raw.allowed_youtube_channel_ids.filter(Boolean)
    : [];
  const allowed_youtube_playlist_ids = Array.isArray(raw?.allowed_youtube_playlist_ids)
    ? raw.allowed_youtube_playlist_ids.filter(Boolean)
    : [];
  const daily_watch_limit_minutes = Math.max(
    1,
    Math.min(1440, Number(raw?.daily_watch_limit_minutes) || 30)
  );

  const videoIdsFromUrls = (allowed_youtube_urls as string[])
    .map((u) => getVideoId(u))
    .filter((id): id is string => id !== null);

  // キャッシュが有効なら YouTube API 呼び出しをスキップ
  let video_ids: string[];
  if (cachedVideoIds && Date.now() < cachedVideoIds.expiresAt) {
    video_ids = Array.from(new Set([...videoIdsFromUrls, ...cachedVideoIds.video_ids]));
  } else {
    let channelVideos: VideoIdWithDate[] = [];
    let playlistVideoIds: string[] = [];
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey && allowed_youtube_channel_ids.length > 0) {
      try {
        const results = await Promise.all(
          allowed_youtube_channel_ids.map((channelId) =>
            fetchVideoIdsByChannelId(channelId, apiKey)
          )
        );
        // 全チャンネルの動画を投稿日時の新しい順で混合ソート
        channelVideos = results.flat().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      } catch {
        channelVideos = [];
      }
    }
    if (apiKey && allowed_youtube_playlist_ids.length > 0) {
      try {
        const results = await Promise.all(
          allowed_youtube_playlist_ids.map((playlistId) =>
            fetchVideoIdsByPlaylistId(playlistId, apiKey)
          )
        );
        playlistVideoIds = results.flat();
      } catch {
        playlistVideoIds = [];
      }
    }

    const fetchedIds = [...channelVideos.map((v) => v.id), ...playlistVideoIds];
    cachedVideoIds = { video_ids: fetchedIds, expiresAt: Date.now() + CACHE_TTL_MS };

    // 並び順: 個別URLの登録順 → チャンネル混合新着順 → プレイリストごと（各プレイリスト内の順）
    video_ids = Array.from(new Set([...videoIdsFromUrls, ...fetchedIds]));
  }

  return NextResponse.json({
    allowed_urls: (allowed_youtube_urls as string[]).filter(Boolean),
    allowed_channel_ids: allowed_youtube_channel_ids,
    allowed_playlist_ids: allowed_youtube_playlist_ids,
    video_ids,
    daily_limit_minutes: daily_watch_limit_minutes,
  });
}
