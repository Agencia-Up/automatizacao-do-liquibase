create table simulou_passou_private.purchase_mail (
  order_id uuid primary key references simulou_passou_private.orders(id) on delete cascade,
  queued_at timestamptz not null default now(),
  next_at timestamptz not null default now(),
  sent_at timestamptz,
  claim_token uuid,
  attempts integer not null default 0,
  last_error text
);
alter table simulou_passou_private.purchase_mail enable row level security;
grant select,update on simulou_passou_private.purchase_mail to service_role;

create function simulou_passou_private.queue_purchase_mail() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status='paid' and old.status is distinct from 'paid'
    and new.provider_mode in ('production','sandbox') and new.offer in ('module','all') then
    insert into simulou_passou_private.purchase_mail(order_id) values(new.id)
    on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function simulou_passou_private.queue_purchase_mail() from public,anon,authenticated;
create trigger sp_queue_purchase_mail after update of status on simulou_passou_private.orders
  for each row execute function simulou_passou_private.queue_purchase_mail();

create function public.sp_purchase_mail_claim(p_mode text) returns jsonb
language sql security invoker set search_path='' as $$
  with ready as (
    select q.order_id from simulou_passou_private.purchase_mail q
    join simulou_passou_private.orders o on o.id=q.order_id
    where o.status='paid' and o.provider_mode=p_mode and q.sent_at is null
      and q.next_at<=now() and q.queued_at>now()-interval '23 hours'
    order by q.next_at
    limit 8 for update of q skip locked
  ), claimed as (
    update simulou_passou_private.purchase_mail q
      set claim_token=gen_random_uuid(),attempts=q.attempts+1,
          next_at=now()+interval '1 minute'*least(60, power(2,least(q.attempts,6)))
    from ready where q.order_id=ready.order_id
    returning q.order_id,q.claim_token
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',o.id,'token',c.claim_token,'userId',o.user_id,'email',o.buyer_email,
    'offer',o.offer,'amount',o.amount,'module',(
      select p->>'name' from simulou_passou_private.catalog,
      jsonb_array_elements(body->'preparations') p where p->>'id'=o.prep_id limit 1
    ))),'[]'::jsonb)
  from claimed c join simulou_passou_private.orders o on o.id=c.order_id;
$$;

create function public.sp_purchase_mail_finish(p_order uuid,p_claim uuid,p_error text) returns void
language sql security invoker set search_path='' as $$
  update simulou_passou_private.purchase_mail
  set sent_at=case when p_error is null then now() end,
      claim_token=null,last_error=left(p_error,64)
  where order_id=p_order and claim_token=p_claim and sent_at is null;
$$;
revoke all on function public.sp_purchase_mail_claim(text),public.sp_purchase_mail_finish(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.sp_purchase_mail_claim(text),public.sp_purchase_mail_finish(uuid,uuid,text) to service_role;
