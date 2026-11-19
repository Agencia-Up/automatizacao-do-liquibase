begin;
create table if not exists simulou_passou_private.mail_limits(
 scope text primary key,started_at timestamptz not null,hits integer not null check(hits>0)
);
alter table simulou_passou_private.mail_limits enable row level security;
revoke all on simulou_passou_private.mail_limits from public,anon,authenticated;
grant select,insert,update,delete on simulou_passou_private.mail_limits to service_role;
create or replace function public.sp_mail_reserve(p_recipient text,p_client text) returns void
language plpgsql security invoker set search_path='' as $$
declare requested_at timestamptz:=clock_timestamp(); bucket record;
begin
 if p_recipient is null or p_recipient !~ '^[a-f0-9]{64}$' or (p_client is not null and p_client !~ '^[a-f0-9]{64}$') then raise exception 'Invalid mail limit key'; end if;
 for bucket in select * from (values
  ('mail:global',interval '1 hour',100),('mail:client:'||p_client,interval '15 minutes',6),('mail:recipient:'||p_recipient,interval '10 minutes',1)
 ) limits(scope,period,max_hits) where scope is not null loop
  insert into simulou_passou_private.mail_limits as current_limit(scope,started_at,hits) values(bucket.scope,requested_at,1)
  on conflict(scope) do update set
   started_at=case when current_limit.started_at+bucket.period<=requested_at then requested_at else current_limit.started_at end,
   hits=case when current_limit.started_at+bucket.period<=requested_at then 1 else current_limit.hits+1 end
   where current_limit.started_at+bucket.period<=requested_at or current_limit.hits<bucket.max_hits;
  if not found then raise sqlstate 'PT429' using message='Mail request limit'; end if;
 end loop;
 delete from simulou_passou_private.mail_limits where started_at<requested_at-interval '2 days';
end $$;
revoke all on function public.sp_mail_reserve(text,text) from public,anon,authenticated;
grant execute on function public.sp_mail_reserve(text,text) to service_role;

alter table simulou_passou_private.orders add column if not exists refunded_at timestamptz;
create table if not exists simulou_passou_private.refund_requests(
 order_id uuid primary key references simulou_passou_private.orders(id),requested_at timestamptz not null default now()
);
alter table simulou_passou_private.refund_requests enable row level security;
revoke all on simulou_passou_private.refund_requests from public,anon,authenticated;
grant select,insert on simulou_passou_private.refund_requests to service_role;
create or replace function public.sp_refund_request(p_actor uuid,p_order uuid,p_mode text) returns void
language plpgsql security invoker set search_path='' as $$
declare item simulou_passou_private.orders%rowtype;
begin
 if p_actor is null then raise sqlstate 'PT403' using message='Authentication required'; end if;
 select * into item from simulou_passou_private.orders where id=p_order and user_id=p_actor and provider_mode=p_mode
  and prep_id is not null and payment_id is not null and offer in ('module','all','legacy') for update;
 if not found then raise sqlstate 'PT404' using message='Compra não encontrada'; end if;
 if exists(select 1 from simulou_passou_private.refund_requests where order_id=p_order) then return; end if;
 if item.status<>'paid' then raise sqlstate 'PT409' using message='Esta compra não está confirmada para solicitar estorno'; end if;
 insert into simulou_passou_private.refund_requests(order_id) values(p_order) on conflict do nothing;
end $$;
create or replace function public.sp_refund_orders(p_actor uuid,p_mode text,p_admin boolean,p_order uuid default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
 if p_actor is null or (p_admin and not exists(select 1 from simulou_passou_private.administrators where user_id=p_actor)) then raise sqlstate 'PT403' using message='Access denied'; end if;
 return coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
  'id',o.id,'prepId',o.prep_id,'offer',o.offer,'amount',o.amount,'purchasedAt',o.created_at,'expiresAt',o.access_expires_at,
  'requestedAt',r.requested_at,'refundedAt',o.refunded_at,'status',o.status,
  'checkoutId',case when p_admin then o.payment_id end,'buyer',case when p_admin then coalesce(m.body->'profile'->>'name',o.buyer_name) end
 )) order by coalesce(r.requested_at,o.created_at) desc)
 from simulou_passou_private.orders o left join simulou_passou_private.refund_requests r on r.order_id=o.id
 left join simulou_passou_private.members m on p_admin and m.user_id=o.user_id
 where o.provider_mode=p_mode and o.prep_id is not null and o.payment_id is not null and o.offer in ('module','all','legacy')
 and (p_order is null or o.id=p_order) and ((p_admin and r.order_id is not null) or
  (not p_admin and o.user_id=p_actor and (o.status='paid' or o.refunded_at is not null or r.order_id is not null)))),'[]'::jsonb);
end $$;
revoke all on function public.sp_refund_request(uuid,uuid,text),public.sp_refund_orders(uuid,text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.sp_refund_request(uuid,uuid,text),public.sp_refund_orders(uuid,text,boolean,uuid) to service_role;

create or replace function public.sp_checkout_event(p_provider text,p_mode text,p_event text,p_state text,p_amount integer default null) returns void
language plpgsql security invoker set search_path='' as $$
declare item simulou_passou_private.orders%rowtype; effective_state text:=case when p_state='refunded_final' then 'refunded' else p_state end;
begin
 select * into item from simulou_passou_private.orders where payment_id=p_provider and provider_mode=p_mode and prep_id is not null for update;
 if not found then return; end if;
 if p_event is null or length(p_event) not between 1 and 200 or p_state is null or p_state not in ('paid','refunded','refunded_final','cancelled')
  or (effective_state in ('paid','refunded') and p_amount is distinct from item.amount) then raise exception 'Invalid payment event' using errcode='22023'; end if;
 insert into simulou_passou_private.payment_events(event_id,order_id,status) values(p_mode||':'||p_event,item.id,effective_state) on conflict do nothing;
 if not found then return; end if;
 if effective_state='refunded' then
  update simulou_passou_private.orders set status='refunded',provider_state='refunded',refunded_at=coalesce(refunded_at,now()),updated_at=now() where id=item.id;
  update simulou_passou_private.entitlements set active=false,updated_at=now() where user_id=item.user_id and source='asaas' and payment_id=item.payment_id and active;
 elsif item.refunded_at is null and item.status<>'refunded' then
  if effective_state='paid' and item.status in ('pending','cancelled') or effective_state='cancelled' and item.status='pending' then
   update simulou_passou_private.orders set status=effective_state,provider_state=effective_state,updated_at=now() where id=item.id;
  end if;
 end if;
end $$;
revoke all on function public.sp_checkout_event(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.sp_checkout_event(text,text,text,text,integer) to service_role;
-- Existing confirmed reversals must not be resurrected by delayed paid events.
update simulou_passou_private.orders set refunded_at=coalesce(updated_at,now()) where status='refunded' and refunded_at is null;
update simulou_passou_private.entitlements e set active=false,updated_at=now() where e.active and e.source='asaas'
 and exists(select 1 from simulou_passou_private.orders o where o.user_id=e.user_id and o.payment_id=e.payment_id and o.status='refunded');
commit;
