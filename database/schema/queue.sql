create table public.queue (
  number numeric not null,
  exchange uuid not null,
  device_id uuid null,
  created_at timestamp with time zone not null default now(),
  constraint queue_pkey primary key (number, exchange),
  constraint unique_exchange_device_id unique (exchange, device_id),
  constraint queue_exchange_fkey foreign KEY (exchange) references exchanges (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;
