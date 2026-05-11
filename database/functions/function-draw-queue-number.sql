create or replace function public."draw-queue-number"(exchange_id uuid, device_id uuid)
returns setof queue
language plpgsql
security definer -- important
set search_path = public
as $$
declare
  max_drawn_number numeric := 0;
begin
  if exists(select 1 from queue where exchange = exchange_id) then
    select max(number) into max_drawn_number
    from queue
    where exchange = exchange_id;
  end if;

  return query
    insert into queue (exchange, number, device_id)
    values (
      exchange_id,
      max_drawn_number + 1,
      device_id
    )
    returning *;
end;
$$;

revoke all on function public."draw-queue-number"(exchange_id uuid, device_id uuid) from public;
grant execute on function public."draw-queue-number"(exchange_id uuid, device_id uuid) to anon;
