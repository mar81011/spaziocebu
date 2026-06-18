-- Custom labels for chat Help buttons (if support columns already exist)
alter table public.store_config
  add column if not exists support_page_label text not null default 'Visit this page';

alter table public.store_config
  add column if not exists support_phone_label text not null default '';
