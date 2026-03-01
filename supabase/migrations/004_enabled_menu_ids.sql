-- サイドメニューで表示する「追加機能」のオン/オフ用
alter table public.chat_settings
  add column if not exists enabled_menu_ids text[] not null default '{}';

comment on column public.chat_settings.enabled_menu_ids is '有効にする追加メニューID（例: game, youtube）';
