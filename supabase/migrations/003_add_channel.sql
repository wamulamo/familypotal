-- 伝言板とAIチャットを分けるため channel を追加
alter table public.messages add column channel text default 'ai';
update public.messages set channel = 'ai' where channel is null;
alter table public.messages alter column channel set not null;
alter table public.messages add constraint messages_channel_check check (channel in ('dennnon', 'ai'));
