-- Existing purchases and checkout links retain their original terms.
alter table simulou_passou_private.orders
  add column annual_access boolean not null default false,
  add column access_expires_at timestamptz;
alter table simulou_passou_private.orders alter column annual_access set default true;

create function simulou_passou_private.sp_set_annual_access() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.offer='all' and new.annual_access and new.status='paid' and new.access_expires_at is null then
    new.access_expires_at := now() + interval '1 year';
  end if;
  return new;
end $$;
revoke all on function simulou_passou_private.sp_set_annual_access() from public,anon,authenticated;
grant execute on function simulou_passou_private.sp_set_annual_access() to service_role;
create trigger sp_set_annual_access before insert or update of status on simulou_passou_private.orders
for each row execute function simulou_passou_private.sp_set_annual_access();

CREATE OR REPLACE FUNCTION public.sp_runtime_load(p_actor uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
    'orders',coalesce((select jsonb_agg(jsonb_build_object('id',id,'userId',user_id,'prepId',prep_id,'providerMode',provider_mode,'offer',offer,'amount',amount,'status',status,'invoiceUrl',invoice_url,'createdAt',created_at,'accessExpiresAt',access_expires_at)) from simulou_passou_private.orders where p_actor is not null and (adm or user_id=p_actor)),'[]'::jsonb),
    'active_users',coalesce((select jsonb_agg(user_id) from simulou_passou_private.entitlements where active and p_actor is not null and (adm or user_id=p_actor)),'[]'::jsonb)
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.sp_checkout_claim_offer(p_actor uuid, p_prep text, p_mode text, p_offer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
      and (access_expires_at is null or access_expires_at>now())
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
end $function$
;

CREATE OR REPLACE FUNCTION public.sp_checkout_claim_guest(p_guest text, p_email text, p_prep text, p_mode text, p_offer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare item simulou_passou_private.orders%rowtype; title text; price integer;
begin
  if p_guest is null or p_guest !~ '^[a-f0-9]{64}$'
    or p_email is null or length(p_email)>254 or p_email<>lower(p_email) or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or p_mode is null or p_mode not in ('production','sandbox')
    or p_offer is null or p_offer not in ('module','all') then
    raise exception 'Invalid guest checkout' using errcode='22023';
  end if;
  if not exists(select 1 from simulou_passou_private.settings where id and checkout_enabled) then
    return jsonb_build_object('state','disabled');
  end if;
  select p->>'name' into title from simulou_passou_private.catalog,
    jsonb_array_elements(body->'preparations') p
    where id and p->>'id'=p_prep and p->>'status'='published' and p->>'track'='pqo'
    and exists(select 1 from jsonb_array_elements(body->'quizzes') q where q->>'prepId'=p_prep and q->>'status'='published');
  if title is null then return jsonb_build_object('state','unavailable'); end if;
  price:=case p_offer when 'all' then 4990 else 2990 end;
  -- Serialize the short reservation step so concurrent requests cannot bypass limits.
  perform pg_advisory_xact_lock(hashtextextended('simulou-passou:guest:'||p_mode,0));
  if exists(select 1 from simulou_passou_private.orders
    where guest_key=p_guest and buyer_email=p_email and provider_mode=p_mode and status='paid'
      and (access_expires_at is null or access_expires_at>now())
      and (offer='all' or (p_offer='module' and offer='module' and prep_id=p_prep))) then
    return jsonb_build_object('state','guest_paid');
  end if;
  select * into item from simulou_passou_private.orders
    where guest_key=p_guest and provider_mode=p_mode and status='pending' for update;
  if found then
    if item.invoice_url is not null and item.lease_until>now() then
      if item.buyer_email=p_email and item.offer=p_offer and (p_offer='all' or item.prep_id=p_prep) then
        return jsonb_build_object('state','ready','url',item.invoice_url);
      end if;
      return jsonb_build_object('state','different_order');
    end if;
    if item.lease_until>now() or item.payment_id is not null then
      return jsonb_build_object('state','wait');
    end if;
    update simulou_passou_private.orders set status='cancelled',updated_at=now() where id=item.id;
  end if;
  if (select count(*) from simulou_passou_private.orders where guest_key is not null
      and provider_mode=p_mode and created_at>now()-interval '1 minute')>=40
    or (select count(*) from simulou_passou_private.orders where guest_key is not null
      and provider_mode=p_mode and buyer_email=p_email and created_at>now()-interval '15 minutes')>=5 then
    return jsonb_build_object('state','limited');
  end if;
  insert into simulou_passou_private.orders(guest_key,buyer_email,prep_id,provider_mode,offer,amount,lease_until,provider_state)
    values(p_guest,p_email,p_prep,p_mode,p_offer,price,now()+interval '33 minutes','creating') returning * into item;
  return jsonb_build_object('state','create','id',item.id,'name',title,'amount',item.amount);
end $function$
;
