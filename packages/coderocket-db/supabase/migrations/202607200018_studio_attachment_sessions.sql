-- Let a fresh composer safely replace unfinished uploads from an abandoned browser session.

alter table public.cr_builder_message_attachments
  add column if not exists composer_id uuid not null default gen_random_uuid();

alter table public.cr_builder_message_attachments
  alter column composer_id drop default;
