-- Record the buyer details and the selected method with the reserved order.
alter table simulou_passou_private.orders
  add column buyer_name text,
  add column buyer_phone text,
  add column checkout_method text check (checkout_method in ('PIX','CREDIT_CARD'));

create function public.sp_checkout_claim_details(
  p_actor uuid,p_guest text,p_email text,p_prep text,p_mode text,p_offer text,
  p_name text,p_phone text,p_method text
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb; previous_method text;
begin
  if p_method is null or p_method not in ('PIX','CREDIT_CARD')
    or p_name is null or length(p_name) not between 2 and 100
    or p_phone is null or p_phone !~ '^[1-9][0-9]{9,10}$' then
    raise exception 'Invalid checkout details' using errcode='22023';
  end if;
  if p_actor is null then
    result:=public.sp_checkout_claim_guest(p_guest,p_email,p_prep,p_mode,p_offer);
  else
    result:=public.sp_checkout_claim_offer(p_actor,p_prep,p_mode,p_offer);
  end if;
  if result->>'state'='create' then
    update simulou_passou_private.orders
    set buyer_name=p_name,buyer_phone=p_phone,checkout_method=p_method
    where id=(result->>'id')::uuid;
  elsif result->>'state'='ready' then
    select checkout_method into previous_method from simulou_passou_private.orders
    where invoice_url=result->>'url' and provider_mode=p_mode and status='pending'
      and ((p_actor is not null and user_id=p_actor)
        or (p_actor is null and guest_key=p_guest and buyer_email=p_email));
    if previous_method is not null and previous_method<>p_method then
      return jsonb_build_object('state','different_method','method',previous_method);
    end if;
  end if;
  return result;
end $$;

revoke all on function public.sp_checkout_claim_details(uuid,text,text,text,text,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.sp_checkout_claim_details(uuid,text,text,text,text,text,text,text,text)
  to service_role;
