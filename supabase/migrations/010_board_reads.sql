-- board_reads: 伝言板の「読んだよ」記録
create table if not exists public.board_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  reader_role text not null check (reader_role in ('papa', 'mama', 'michi')),
  created_at timestamptz default now(),
  unique(message_id, reader_role)
);

-- RLS
alter table public.board_reads enable row level security;

create policy "board_reads read" on public.board_reads
  for select to authenticated using (true);

create policy "board_reads insert" on public.board_reads
  for insert to authenticated with check (true);

-- Realtime
alter publication supabase_realtime add table public.board_reads;
