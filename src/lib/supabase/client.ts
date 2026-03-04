import { createBrowserClient } from "@supabase/ssr";

// シングルトン: 同一タブ内でクライアントを共有し WebSocket 接続を1本に保つ
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
