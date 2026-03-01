-- YouTube関連: 許可動画URL・許可チャンネル・許可プレイリスト・1日あたりの視聴時間制限（分）
alter table public.chat_settings
  add column if not exists allowed_youtube_urls text[] not null default '{}',
  add column if not exists daily_watch_limit_minutes int not null default 30,
  add column if not exists allowed_youtube_channel_ids text[] not null default '{}',
  add column if not exists allowed_youtube_playlist_ids text[] not null default '{}';

-- 視聴時間の記録（監視用・制限の集計用）
create table if not exists public.watch_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  watched_date date not null default (current_date),
  seconds_watched int not null default 0,
  unique(user_id, watched_date)
);

alter table public.watch_logs enable row level security;

drop policy if exists "watch_logs read own" on public.watch_logs;
drop policy if exists "watch_logs insert own" on public.watch_logs;
drop policy if exists "watch_logs update own" on public.watch_logs;
create policy "watch_logs read own" on public.watch_logs for select to authenticated using (auth.uid() = user_id);
create policy "watch_logs insert own" on public.watch_logs for insert to authenticated with check (auth.uid() = user_id);
create policy "watch_logs update own" on public.watch_logs for update to authenticated using (auth.uid() = user_id);

comment on column public.chat_settings.allowed_youtube_urls is '許可するYouTube動画のURLまたは動画ID';
comment on column public.chat_settings.daily_watch_limit_minutes is '1日あたりの視聴時間制限（分）';
comment on column public.chat_settings.allowed_youtube_channel_ids is '許可するYouTubeチャンネルID（例: UCxxxxxxxxxxxxxxxxxxxxx）';
comment on column public.chat_settings.allowed_youtube_playlist_ids is '許可するYouTubeプレイリストID（例: PLxxxxxxxxxxxxxxxxxxxxxxxxxx）';
