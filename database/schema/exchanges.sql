create table public.exchanges (
  id uuid not null default gen_random_uuid (),
  date date not null,
  constraint exchanges_pkey primary key (id),
  constraint exchanges_date_key unique (date)
) TABLESPACE pg_default;
