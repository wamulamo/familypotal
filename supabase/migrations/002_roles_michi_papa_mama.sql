-- ロールを みち / パパ / ママ の3つに変更
-- 先に制約を外してからデータを更新する（UPDATE で 'papa' 等を入れるため）

-- 1. 既存の check 制約を削除
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.messages drop constraint if exists messages_role_check;

-- 2. 既存データを新ロールに移行（child→みち, parent→パパ）
update public.profiles set role = 'michi' where role = 'child';
update public.profiles set role = 'papa' where role = 'parent';

update public.messages set role = 'michi' where role = 'child';
update public.messages set role = 'papa' where role = 'parent';

-- 3. 新しい check 制約を追加
alter table public.profiles add constraint profiles_role_check check (role in ('michi', 'papa', 'mama'));
alter table public.messages add constraint messages_role_check check (role in ('michi', 'papa', 'mama', 'ai'));
