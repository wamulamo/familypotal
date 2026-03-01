/** YouTubeのURLまたは埋め込み用IDから動画IDを取得 */
export function getVideoId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m1 = s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (m1) return m1[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return null;
}

/** チャンネルURLまたはIDからチャンネルIDを取得（UCで始まる24文字） */
export function getChannelId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(/(?:youtube\.com\/channel\/)([a-zA-Z0-9_-]{24})/);
  if (m) return m[1];
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(s)) return s;
  return null;
}

/** プレイリストURLまたはIDからプレイリストIDを取得（PLで始まる34文字など） */
export function getPlaylistId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(/(?:list=)(PL[a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^PL[a-zA-Z0-9_-]+$/.test(s)) return s;
  return null;
}
