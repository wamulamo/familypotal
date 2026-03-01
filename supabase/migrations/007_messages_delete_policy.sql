-- messages テーブルに DELETE ポリシーを追加
-- 設定画面の「AIチャット履歴をすべて削除」や API DELETE で削除できるようにする
create policy "messages delete" on public.messages for delete to authenticated using (true);
