create or replace function public."transfer-exchange-queue"(last_exchanged_number numeric, source_exchange uuid, target_exchange uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update queue
  set
    number = number - last_exchanged_number + (select count(*) from queue where exchange = target_exchange),
    exchange = target_exchange
  where exchange = source_exchange and number > last_exchanged_number;
end;
$$;
