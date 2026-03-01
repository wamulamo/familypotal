-- プロファイル: 児童/保護者の区別
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('child', 'parent')),
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 単一ファミリーチャット用スレッド（1件のみ想定）
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

-- メッセージ
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  role text not null check (role in ('child', 'parent', 'ai')),
  content text not null,
  created_at timestamptz default now()
);

-- 設定（保護者用・1ファミリー1レコード想定）
create table if not exists public.chat_settings (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.threads(id) on delete cascade,
  system_prompt text not null default 'あなたは、小学2年生の子どもと保護者と会話する、やさしいAIアシスタントです。子どもには分かりやすく、短い文で答えてください。',
  ng_words text[] not null default '{}',
  semantic_filter_prompt text not null default '以下のトピックや概念には答えないでください：暴力、差別、違法行為、不適切な大人向けの話題。',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Realtime を messages で有効化
alter publication supabase_realtime add table public.messages;

-- RLS
alter table public.profiles enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.chat_settings enable row level security;

-- 認証済みユーザーは同一ファミリー（ここでは全認証ユーザーを同一スレッドとみなす簡易版）
create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);

create policy "threads read" on public.threads for select to authenticated using (true);
create policy "threads insert" on public.threads for insert to authenticated with check (true);

create policy "messages read" on public.messages for select to authenticated using (true);
create policy "messages insert" on public.messages for insert to authenticated with check (true);

-- 設定: 保護者のみ更新可能（role は app 側でチェック。DB では認証済みで insert/update 許可）
create policy "settings read" on public.chat_settings for select to authenticated using (true);
create policy "settings insert" on public.chat_settings for insert to authenticated with check (true);
create policy "settings update" on public.chat_settings for update to authenticated using (true);

-- 初期スレッドを1件作成（アプリ側でも未存在なら作成する）
insert into public.threads default values;
