-- パパ・ママ・みちのアイコン設定（絵文字などを1文字程度で保存）
alter table public.chat_settings
  add column if not exists role_icons jsonb not null default '{"papa":"👨","mama":"👩","michi":"👦"}'::jsonb;

comment on column public.chat_settings.role_icons is '各役割の表示用アイコン（papa, mama, michi の絵文字など）';
