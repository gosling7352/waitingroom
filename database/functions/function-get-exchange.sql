create or replace function public."get-exchange"(exchange_id uuid)
returns setof exchanges
language plpgsql
security definer -- important
set search_path = public
as $$
begin
  return query
    select id, date
    from exchanges
    where id = exchange_id;
end;
$$;

revoke all on function public."get-exchange"(exchange_id uuid) from public;
grant execute on function public."get-exchange"(exchange_id uuid) to anon;
