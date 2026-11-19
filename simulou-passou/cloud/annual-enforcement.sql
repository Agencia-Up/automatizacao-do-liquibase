-- Preserve recorded deadlines. Repair only annual purchases missing a deadline.
update simulou_passou_private.orders o
set access_expires_at=coalesce(
  (select min(e.created_at) from simulou_passou_private.payment_events e where e.order_id=o.id and e.status='paid'),
  (select q.queued_at from simulou_passou_private.purchase_mail q where q.order_id=o.id),o.created_at
)+interval '1 year'
where o.status='paid' and o.annual_access and o.offer in ('all','module') and o.access_expires_at is null;
alter table simulou_passou_private.orders add constraint sp_annual_paid_expiry
check(status<>'paid' or not annual_access or offer not in ('all','module') or access_expires_at is not null);

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
    'orders',coalesce((select jsonb_agg(jsonb_build_object('id',id,'userId',user_id,'prepId',prep_id,'providerMode',provider_mode,'offer',offer,'amount',amount,'status',status,'invoiceUrl',invoice_url,'createdAt',created_at,'accessExpiresAt',access_expires_at,'annualAccess',annual_access)) from simulou_passou_private.orders where p_actor is not null and (adm or user_id=p_actor)),'[]'::jsonb),
    'active_users',coalesce((select jsonb_agg(user_id) from simulou_passou_private.entitlements where active and p_actor is not null and (adm or user_id=p_actor)),'[]'::jsonb)
  );
end $function$
