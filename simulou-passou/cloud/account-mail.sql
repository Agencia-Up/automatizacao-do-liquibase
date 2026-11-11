create table simulou_passou_private.mail_limits (
  scope text primary key,
  started_at timestamptz not null,
  hits integer not null check (hits > 0)
);
alter table simulou_passou_private.mail_limits enable row level security;
revoke all on simulou_passou_private.mail_limits from public,anon,authenticated;
grant select,insert,update,delete on simulou_passou_private.mail_limits to service_role;

create function public.sp_mail_reserve(p_recipient text,p_client text) returns void
language plpgsql security invoker set search_path='' as $$
declare
  requested_at timestamptz := clock_timestamp();
  bucket record;
begin
  if p_recipient is null or p_recipient !~ '^[a-f0-9]{64}$' or p_client !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid mail limit key';
  end if;
  for bucket in
    select * from (values
      ('mail:global', interval '1 hour', 100),
      ('mail:client:'||p_client, interval '15 minutes', 6),
      ('mail:recipient:'||p_recipient, interval '10 minutes', 1)
    ) as limits(scope,period,max_hits) where scope is not null
  loop
    insert into simulou_passou_private.mail_limits as current_limit(scope,started_at,hits)
      values(bucket.scope,requested_at,1)
    on conflict (scope) do update
      set started_at=case when current_limit.started_at+bucket.period<=requested_at
        then requested_at else current_limit.started_at end,
        hits=case when current_limit.started_at+bucket.period<=requested_at
        then 1 else current_limit.hits+1 end
      where current_limit.started_at+bucket.period<=requested_at or current_limit.hits<bucket.max_hits;
    if not found then
      raise sqlstate 'PT429' using message='Mail request limit';
    end if;
  end loop;
  delete from simulou_passou_private.mail_limits where started_at<requested_at-interval '2 days';
end $$;
revoke all on function public.sp_mail_reserve(text,text) from public,anon,authenticated;
grant execute on function public.sp_mail_reserve(text,text) to service_role;
