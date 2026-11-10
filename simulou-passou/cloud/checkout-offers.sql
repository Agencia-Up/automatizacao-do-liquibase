-- Existing orders retain the access they originally purchased.
alter table simulou_passou_private.orders
  add column offer text not null default 'legacy';

alter table simulou_passou_private.orders
  drop constraint orders_amount_check,
  add constraint orders_offer_amount_check check (
    (offer = 'legacy' and amount = 2990)
    or (offer = 'module' and amount = 2990 and prep_id is not null)
    or (offer = 'all' and amount = 4990 and prep_id is not null)
  );

create function public.sp_checkout_claim_offer(p_actor uuid,p_prep text,p_mode text,p_offer text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare item simulou_passou_private.orders%rowtype; title text; price integer;
begin
  if p_actor is null or p_mode is null or p_mode not in ('production','sandbox')
    or p_offer is null or p_offer not in ('module','all') then
    raise exception 'Invalid checkout offer' using errcode='22023';
  end if;
  if not exists(select 1 from simulou_passou_private.settings where id and checkout_enabled) then
    return jsonb_build_object('state','disabled');
  end if;
  select p->>'name' into title from simulou_passou_private.catalog,
    jsonb_array_elements(body->'preparations') p
    where id and p->>'id'=p_prep and p->>'status'='published' and p->>'track'='pqo'
    and exists(select 1 from jsonb_array_elements(body->'quizzes') q where q->>'prepId'=p_prep and q->>'status'='published');
  if title is null then return jsonb_build_object('state','unavailable'); end if;
  price := case p_offer when 'all' then 4990 else 2990 end;
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':'||p_mode,0));
  if exists(select 1 from simulou_passou_private.administrators where user_id=p_actor)
    or exists(select 1 from simulou_passou_private.entitlements where user_id=p_actor and active)
    or exists(select 1 from simulou_passou_private.orders where user_id=p_actor and prep_id is not null
      and provider_mode=p_mode and status='paid'
      and (offer in ('all','legacy') or (p_offer='module' and offer='module' and prep_id=p_prep))) then
    return jsonb_build_object('state','owned');
  end if;
  select * into item from simulou_passou_private.orders
    where user_id=p_actor and prep_id is not null and provider_mode=p_mode and status='pending' for update;
  if found then
    if item.invoice_url is not null and item.lease_until>now() then
      if item.offer=p_offer and (p_offer='all' or item.prep_id=p_prep) then
        return jsonb_build_object('state','ready','url',item.invoice_url);
      end if;
      return jsonb_build_object('state','different_order');
    end if;
    if item.lease_until>now() or item.payment_id is not null then
      return jsonb_build_object('state','wait');
    end if;
    update simulou_passou_private.orders set status='cancelled',updated_at=now() where id=item.id;
  end if;
  insert into simulou_passou_private.orders(user_id,prep_id,provider_mode,offer,amount,lease_until,provider_state)
    values(p_actor,p_prep,p_mode,p_offer,price,now()+interval '33 minutes','creating') returning * into item;
  return jsonb_build_object('state','create','id',item.id,'name',title,'amount',item.amount);
end $$;

revoke all on function public.sp_checkout_claim_offer(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.sp_checkout_claim_offer(uuid,text,text,text) to service_role;


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
    'orders',coalesce((select jsonb_agg(jsonb_build_object('id',id,'userId',user_id,'prepId',prep_id,'providerMode',provider_mode,'offer',offer,'amount',amount,'status',status,'invoiceUrl',invoice_url,'createdAt',created_at)) from simulou_passou_private.orders where p_actor is not null and (adm or user_id=p_actor)),'[]'::jsonb),
    'active_users',coalesce((select jsonb_agg(user_id) from simulou_passou_private.entitlements where active and p_actor is not null and (adm or user_id=p_actor)),'[]'::jsonb)
  );
end $$;
