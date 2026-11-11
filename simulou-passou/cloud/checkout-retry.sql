-- A rejected Asaas request cannot be paid. Keep ambiguous requests reserved.
create function public.sp_checkout_release_rejected(p_order uuid,p_mode text) returns void
language sql security invoker set search_path='' as $$
  update simulou_passou_private.orders
  set status='cancelled',provider_state='rejected',lease_until=null,updated_at=now()
  where id=p_order and provider_mode=p_mode and status='pending'
    and provider_state='creating' and payment_id is null and invoice_url is null;
$$;

revoke all on function public.sp_checkout_release_rejected(uuid,text) from public,anon,authenticated;
grant execute on function public.sp_checkout_release_rejected(uuid,text) to service_role;
