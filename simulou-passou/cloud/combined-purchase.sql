alter table simulou_passou_private.purchase_mail
  add column message_id text,
  add column message_status text,
  add column content_cipher text,
  add column message_generation integer not null default 1;

create or replace function public.sp_purchase_mail_claim(p_mode text) returns jsonb
language sql security invoker set search_path='' as $$
  with ready as (
    select q.order_id from simulou_passou_private.purchase_mail q
    join simulou_passou_private.orders o on o.id=q.order_id
    where o.status='paid' and o.provider_mode=p_mode and q.sent_at is null
      and q.next_at<=now() and q.queued_at>now()-interval '23 hours'
    order by q.next_at limit 4 for update of q skip locked
  ), claimed as (
    update simulou_passou_private.purchase_mail q
    set claim_token=gen_random_uuid(),attempts=q.attempts+1,
      next_at=now()+interval '1 minute'*least(60,power(2,least(q.attempts,6)))
    from ready where q.order_id=ready.order_id returning q.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',o.id,'token',c.claim_token,'userId',o.user_id,'email',o.buyer_email,
    'name',o.buyer_name,'offer',o.offer,'amount',o.amount,'expiresAt',o.access_expires_at,
    'messageId',c.message_id,'contentCipher',c.content_cipher,'generation',c.message_generation,
    'module',(select p->>'name' from simulou_passou_private.catalog,
      jsonb_array_elements(body->'preparations') p where p->>'id'=o.prep_id limit 1)
  )),'[]'::jsonb) from claimed c join simulou_passou_private.orders o on o.id=c.order_id;
$$;

create function public.sp_purchase_mail_snapshot(p_order uuid,p_claim uuid,p_cipher text) returns text
language plpgsql security invoker set search_path='' as $$
declare saved text;
begin
  if p_cipher is null or length(p_cipher)>100000 then raise exception 'Invalid purchase envelope'; end if;
  update simulou_passou_private.purchase_mail q set content_cipher=coalesce(q.content_cipher,p_cipher)
  where q.order_id=p_order and q.claim_token=p_claim and q.sent_at is null
    and exists(select 1 from simulou_passou_private.orders o where o.id=q.order_id and o.status='paid')
  returning content_cipher into saved;
  if not found then raise exception 'Purchase claim expired'; end if;
  return saved;
end $$;
revoke all on function public.sp_purchase_mail_snapshot(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.sp_purchase_mail_snapshot(uuid,uuid,text) to service_role;

create function public.sp_purchase_combined_record(p_order uuid,p_claim uuid,p_id text) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if p_id is null or length(p_id)>100 then raise exception 'Invalid purchase message'; end if;
  update simulou_passou_private.purchase_mail set message_id=p_id,message_status='accepted'
  where order_id=p_order and claim_token=p_claim and sent_at is null;
  if not found then raise exception 'Purchase claim expired'; end if;
end $$;
revoke all on function public.sp_purchase_combined_record(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.sp_purchase_combined_record(uuid,uuid,text) to service_role;

create or replace function public.sp_purchase_mail_audit(p_order uuid) returns jsonb
language sql security invoker set search_path='' as $$
  select jsonb_build_object('email',o.buyer_email,'confirmationId',q.confirmation_id,'accessId',q.access_id,'messageId',q.message_id)
  from simulou_passou_private.orders o join simulou_passou_private.purchase_mail q on q.order_id=o.id
  where o.id=p_order;
$$;
create or replace function public.sp_purchase_delivery_record(p_order uuid,p_id text,p_status text) returns void
language sql security invoker set search_path='' as $$
  update simulou_passou_private.purchase_mail set
    confirmation_status=case when confirmation_id=p_id then left(p_status,40) else confirmation_status end,
    access_status=case when access_id=p_id then left(p_status,40) else access_status end,
    message_status=case when message_id=p_id then left(p_status,40) else message_status end
  where order_id=p_order and p_id in (confirmation_id,access_id,message_id);
$$;
