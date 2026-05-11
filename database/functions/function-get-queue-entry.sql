create or replace function public."get-queue-entry"(exchange_id uuid, device_id uuid)
returns setof queue
language plpgsql
security definer -- important
set search_path = public
as $$
declare
  dev_id alias for device_id;
begin
  return query
    select number, exchange, queue.device_id, created_at
    from queue
    where exchange = exchange_id and queue.device_id = dev_id;
end;
$$;

revoke all on function public."get-queue-entry"(exchange_id uuid, device_id uuid) from public;
grant execute on function public."get-queue-entry"(exchange_id uuid, device_id uuid) to anon;
