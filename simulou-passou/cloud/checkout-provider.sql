create function public.sp_checkout_known(p_provider text,p_mode text) returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(
    select 1 from simulou_passou_private.orders
    where payment_id=p_provider and provider_mode=p_mode and prep_id is not null
  );
$$;
revoke all on function public.sp_checkout_known(text,text) from public,anon,authenticated;
grant execute on function public.sp_checkout_known(text,text) to service_role;
