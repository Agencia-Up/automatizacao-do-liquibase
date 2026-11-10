-- Module-only checkout changes. Existing manual entitlements remain valid.
alter table simulou_passou_private.orders
  add column if not exists prep_id text,
  add column if not exists provider_mode text check(provider_mode in ('sandbox','production'));
-- Preserve the existing single pending order constraint. Use a separate project for Sandbox.
create index if not exists sp_paid_checkout_order
  on simulou_passou_private.orders(user_id,provider_mode) where status='paid' and prep_id is not null;

create function public.sp_checkout_claim(p_actor uuid,p_prep text,p_mode text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare item simulou_passou_private.orders%rowtype; title text;
begin
  if p_actor is null or p_mode not in ('production','sandbox') or p_mode is null then
    raise exception 'Invalid checkout actor or mode' using errcode='22023';
  end if;
  if not exists(select 1 from simulou_passou_private.settings where id and checkout_enabled) then
    return jsonb_build_object('state','disabled');
  end if;
  select p->>'name' into title from simulou_passou_private.catalog,
    jsonb_array_elements(body->'preparations') p
    where id and p->>'id'=p_prep and p->>'status'='published' and p->>'track'='pqo'
    and exists(select 1 from jsonb_array_elements(body->'quizzes') q where q->>'prepId'=p_prep and q->>'status'='published');
  if title is null then return jsonb_build_object('state','unavailable'); end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':'||p_mode,0));
  if exists(select 1 from simulou_passou_private.administrators where user_id=p_actor)
    or exists(select 1 from simulou_passou_private.entitlements where user_id=p_actor and active)
    or exists(select 1 from simulou_passou_private.orders where user_id=p_actor and prep_id is not null and provider_mode=p_mode and status='paid') then
    return jsonb_build_object('state','owned');
  end if;
  select * into item from simulou_passou_private.orders
    where user_id=p_actor and prep_id is not null and provider_mode=p_mode and status='pending' for update;
  if found then
    if item.invoice_url is not null and item.lease_until>now() then
      return jsonb_build_object('state','ready','url',item.invoice_url);
    end if;
    if item.lease_until>now() or item.payment_id is not null then
      return jsonb_build_object('state','wait');
    end if;
    -- A failed request may have reached Asaas. Only retry once its checkout would have expired.
    update simulou_passou_private.orders set status='cancelled',updated_at=now() where id=item.id;
  end if;
  insert into simulou_passou_private.orders(user_id,prep_id,provider_mode,lease_until,provider_state)
    values(p_actor,p_prep,p_mode,now()+interval '33 minutes','creating') returning * into item;
  return jsonb_build_object('state','create','id',item.id,'name',title,'amount',item.amount);
end $$;

create function public.sp_checkout_attach(p_order uuid,p_provider text,p_url text) returns void
language plpgsql security invoker set search_path='' as $$
begin
  update simulou_passou_private.orders
    set payment_id=p_provider,invoice_url=p_url,provider_state='active',updated_at=now()
    where id=p_order and prep_id is not null and status='pending' and payment_id is null;
  if not found then raise exception 'Checkout is no longer pending'; end if;
end $$;

create function public.sp_checkout_event(p_provider text,p_mode text,p_event text,p_state text,p_amount integer default null) returns void
language plpgsql security invoker set search_path='' as $$
declare item simulou_passou_private.orders%rowtype;
begin
  select * into item from simulou_passou_private.orders where payment_id=p_provider and provider_mode=p_mode and prep_id is not null for update;
  if not found then return; end if;
  if p_state not in ('paid','refunded','cancelled') or (p_state in ('paid','refunded') and p_amount is distinct from item.amount) then
    raise exception 'Invalid payment event' using errcode='22023';
  end if;
  insert into simulou_passou_private.payment_events(event_id,order_id,status) values(p_mode||':'||p_event,item.id,p_state)
    on conflict do nothing;
  if not found then return; end if;
  if p_state='paid' and item.status in ('pending','cancelled','refunded')
    or p_state='refunded' and item.status in ('paid','pending','cancelled')
    or p_state='cancelled' and item.status='pending' then
    update simulou_passou_private.orders set status=p_state,provider_state=p_state,updated_at=now() where id=item.id;
  end if;
end $$;

revoke all on function public.sp_checkout_claim(uuid,text,text),public.sp_checkout_attach(uuid,text,text),
  public.sp_checkout_event(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.sp_checkout_claim(uuid,text,text),public.sp_checkout_attach(uuid,text,text),
  public.sp_checkout_event(text,text,text,text,integer) to service_role;

create or replace function public.sp_runtime_load(p_actor uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare adm boolean; entitled boolean;
begin
  -- Actor comes exclusively from Auth.getUser in the service-only gateway.
  -- FK constraints validate account existence without granting auth.users reads.
  adm := p_actor is not null and exists(select 1 from simulou_passou_private.administrators where user_id=p_actor);
  entitled := adm or exists(select 1 from simulou_passou_private.entitlements where user_id=p_actor and active);
  return jsonb_build_object(
    'admin',adm,'entitled',entitled,
    'administrator_ids',case when adm then coalesce((select jsonb_agg(user_id) from simulou_passou_private.administrators),'[]'::jsonb) else '[]'::jsonb end,
    'checkout_enabled',(select checkout_enabled from simulou_passou_private.settings where id),
    'catalog',(select jsonb_build_object('revision',revision,'body',body) from simulou_passou_private.catalog where id),
    'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',user_id,'revision',revision,'body',body)) from simulou_passou_private.members where p_actor is not null and (adm or user_id=p_actor)),'[]'::jsonb),
    'orders',coalesce((select jsonb_agg(jsonb_build_object('id',id,'userId',user_id,'prepId',prep_id,'providerMode',provider_mode,'amount',amount,'status',status,'invoiceUrl',invoice_url,'createdAt',created_at)) from simulou_passou_private.orders where p_actor is not null and (adm or user_id=p_actor)),'[]'::jsonb),
    'active_users',coalesce((select jsonb_agg(user_id) from simulou_passou_private.entitlements where active and p_actor is not null and (adm or user_id=p_actor)),'[]'::jsonb)
  );
end $$;
