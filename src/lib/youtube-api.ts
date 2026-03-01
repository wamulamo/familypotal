/**
 * YouTube Data API v3 でチャンネルの動画一覧を取得する。
 * 要: .env.local に YOUTUBE_API_KEY（Google Cloud で YouTube Data API v3 を有効化したAPIキー）
 */

const MAX_VIDEOS_PER_CHANNEL = 30;
const PLAYLIST_PAGE_SIZE = 50;
const MAX_SHORTS_FETCH = 500;

/** チャンネルの Shorts プレイリスト（UUSH + channelId の2文字目以降）に含まれる動画IDを取得 */
async function fetchShortsVideoIdsByChannelId(
  channelId: string,
  apiKey: string
): Promise<Set<string>> {
  if (!channelId.startsWith("UC") || channelId.length < 24) return new Set();
  const shortsPlaylistId = "UUSH" + channelId.slice(2);
  const set = new Set<string>();
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("playlistId", shortsPlaylistId);
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("maxResults", String(PLAYLIST_PAGE_SIZE));
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) return set;
    const data = (await res.json()) as {
      items?: Array<{ contentDetails?: { videoId?: string } }>;
      nextPageToken?: string;
    };
    for (const item of data.items ?? []) {
      const id = item.contentDetails?.videoId;
      if (id) set.add(id);
    }
    pageToken = data.nextPageToken;
    if (set.size >= MAX_SHORTS_FETCH) break;
  } while (pageToken);

  return set;
}

/** チャンネルの動画一覧を取得し、UUSH（Shorts）プレイリストに含まれる動画は除外する */
export async function fetchVideoIdsByChannelId(
  channelId: string,
  apiKey: string
): Promise<string[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("type", "video");
  url.searchParams.set("part", "id");
  url.searchParams.set("order", "date");
  url.searchParams.set("maxResults", String(MAX_VIDEOS_PER_CHANNEL));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube API: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    items?: Array<{ id?: { videoId?: string } }>;
  };
  const ids = (data.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));

  const shortsIds = await fetchShortsVideoIdsByChannelId(channelId, apiKey);
  return ids.filter((id) => !shortsIds.has(id));
}

/** プレイリストに含まれる動画IDを取得（最大100件まで。ページネーション対応） */
const MAX_VIDEOS_PER_PLAYLIST = 100;

export async function fetchVideoIdsByPlaylistId(
  playlistId: string,
  apiKey: string
): Promise<string[]> {
  const allIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("maxResults", String(PLAYLIST_PAGE_SIZE));
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`YouTube API: ${res.status} ${err}`);
    }
    const data = (await res.json()) as {
      items?: Array<{ contentDetails?: { videoId?: string } }>;
      nextPageToken?: string;
    };
    const ids = (data.items ?? [])
      .map((item) => item.contentDetails?.videoId)
      .filter((id): id is string => Boolean(id));
    allIds.push(...ids);
    pageToken = data.nextPageToken;
    if (allIds.length >= MAX_VIDEOS_PER_PLAYLIST) break;
  } while (pageToken);

  return allIds.slice(0, MAX_VIDEOS_PER_PLAYLIST);
}
