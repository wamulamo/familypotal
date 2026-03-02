-- マイグレーション適用状況の確認用（Supabase SQL Editor で実行）
-- 結果の applied が true なら適用済み、false なら未適用の可能性あり

SELECT
  '001_initial' AS migration,
  (
    SELECT count(*) = 4
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('profiles', 'threads', 'messages', 'chat_settings')
  ) AS applied
UNION ALL
SELECT
  '002_roles_michi_papa_mama',
  exists (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.messages'::regclass
      AND conname = 'messages_role_check'
  )
UNION ALL
SELECT
  '003_add_channel',
  exists (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'channel'
  )
UNION ALL
SELECT
  '004_enabled_menu_ids',
  exists (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_settings'
      AND column_name = 'enabled_menu_ids'
  )
UNION ALL
SELECT
  '005_youtube_settings_and_watch_logs',
  (
    exists (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'watch_logs'
    )
    AND exists (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'chat_settings'
        AND column_name = 'allowed_youtube_urls'
    )
  )
UNION ALL
SELECT
  '006_allowed_youtube_playlist_ids',
  exists (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_settings'
      AND column_name = 'allowed_youtube_playlist_ids'
  )
UNION ALL
SELECT
  '007_messages_delete_policy',
  exists (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'messages delete'
  )
UNION ALL
SELECT
  '008_role_icons',
  exists (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_settings'
      AND column_name = 'role_icons'
  )
ORDER BY migration;
