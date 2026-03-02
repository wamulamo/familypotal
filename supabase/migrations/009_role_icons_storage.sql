-- role-icons ストレージバケット用ポリシー
-- 事前準備: Supabase ダッシュボード → Storage → New bucket
--   名前 "role-icons"、Public にチェック、作成
-- その後このマイグレーションを実行

create policy "role-icons upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'role-icons');

create policy "role-icons update"
  on storage.objects for update to authenticated
  using (bucket_id = 'role-icons');

create policy "role-icons delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'role-icons');

create policy "role-icons public read"
  on storage.objects for select to public
  using (bucket_id = 'role-icons');
