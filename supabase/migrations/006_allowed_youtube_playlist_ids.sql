-- プレイリストごと許可する用（005 を実行済みの場合はこのファイルのみ実行）
alter table public.chat_settings
  add column if not exists allowed_youtube_playlist_ids text[] not null default '{}';

comment on column public.chat_settings.allowed_youtube_playlist_ids is '許可するYouTubeプレイリストID（例: PLxxxxxxxxxxxxxxxxxxxxxxxxxx）';
