-- Safe to run on a project that already has 01-schema.sql.
-- New projects: run after 01, 02 and 03. No existing content is overwritten.
begin;
alter table public.makers
  add column if not exists portrait_url text not null default '',
  add column if not exists life_story text not null default '',
  add column if not exists learning_story text not null default '',
  add column if not exists signature_style text not null default '',
  add column if not exists cultural_roots text not null default '';

alter table public.products
  add column if not exists gallery jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery)='array' and jsonb_array_length(gallery)<=3),
  add column if not exists making_video_url text not null default '',
  add column if not exists making_video_poster text not null default '',
  add column if not exists making_video_caption text not null default '',
  add column if not exists making_video_transcript text not null default '',
  add column if not exists making_video_captions_url text not null default '',
  add column if not exists origin text not null default '',
  add column if not exists technique text not null default '',
  add column if not exists making_time text not null default '',
  add column if not exists process_steps jsonb not null default '[]'::jsonb check (jsonb_typeof(process_steps)='array' and jsonb_array_length(process_steps)<=12);
commit;
