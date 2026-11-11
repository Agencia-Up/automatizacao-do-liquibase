-- Guest orders stay private and use the same signed payment events as member orders.
alter table simulou_passou_private.orders
  alter column user_id drop not null,
  add column guest_key text,
  add column buyer_email text,
  add constraint sp_order_has_buyer check (
    user_id is not null or (guest_key is not null and buyer_email is not null)
  );

create unique index sp_guest_pending_order
  on simulou_passou_private.orders(guest_key,provider_mode)
  where guest_key is not null and status='pending';
create index sp_guest_order_rate
  on simulou_passou_private.orders(provider_mode,created_at)
  where guest_key is not null;
create index sp_guest_unclaimed_email
  on simulou_passou_private.orders(buyer_email,provider_mode)
  where user_id is null and guest_key is not null and status='paid';

create function public.sp_checkout_claim_guest(
  p_guest text,p_email text,p_prep text,p_mode text,p_offer text
) returns jsonb
language plpgsql security invoker set search_path='' as $$
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
end $$;

-- The service calls this only with the verified e-mail from Auth.getUser.
create function public.sp_checkout_link_guest(p_actor uuid,p_email text,p_mode text) returns void
language sql security invoker set search_path='' as $$
  update simulou_passou_private.orders set user_id=p_actor,updated_at=now()
    where p_actor is not null and user_id is null and guest_key is not null
      and buyer_email=lower(p_email) and provider_mode=p_mode and status='paid';
$$;

revoke all on function public.sp_checkout_claim_guest(text,text,text,text,text),
  public.sp_checkout_link_guest(uuid,text,text) from public,anon,authenticated;
grant execute on function public.sp_checkout_claim_guest(text,text,text,text,text),
  public.sp_checkout_link_guest(uuid,text,text) to service_role;
