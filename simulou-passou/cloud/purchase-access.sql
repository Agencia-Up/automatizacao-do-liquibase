-- Additive upgrade of the production purchase outbox. Existing Auth accounts stay intact.
alter table simulou_passou_private.purchase_mail
  add column template_version integer not null default 1,
  add column confirmation_id text,
  add column access_id text,
  add column confirmation_status text,
  add column access_status text;
alter table simulou_passou_private.purchase_mail alter column template_version set default 2;

create table simulou_passou_private.purchase_accounts (
  email text primary key,
  user_id uuid not null unique default gen_random_uuid(),
  first_order uuid not null references simulou_passou_private.orders(id),
  initial_hash text,
  created_at timestamptz not null default now()
);
alter table simulou_passou_private.purchase_accounts enable row level security;
revoke all on simulou_passou_private.purchase_accounts from public,anon,authenticated;
grant select,insert,update on simulou_passou_private.purchase_accounts to service_role;

-- A narrow private definer is needed to resolve Auth identities without granting Auth reads.
create function simulou_passou_private.purchase_identity(p_order uuid,p_claim uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  item simulou_passou_private.orders%rowtype;
  provision simulou_passou_private.purchase_accounts%rowtype;
  account auth.users%rowtype;
  recipient text;
begin
  select o.* into item from simulou_passou_private.orders o
  join simulou_passou_private.purchase_mail q on q.order_id=o.id
  where o.id=p_order and o.status='paid' and q.claim_token=p_claim and q.sent_at is null
  for update of q;
  if not found then raise exception 'Purchase claim expired'; end if;
  recipient:=coalesce(item.buyer_email,(select email from auth.users where id=item.user_id));
  if recipient is null then raise exception 'Purchase recipient missing'; end if;
  select * into account from auth.users where lower(email)=lower(recipient) and deleted_at is null limit 1;
  select * into provision from simulou_passou_private.purchase_accounts where email=recipient for update;
  if provision.email is null and account.id is null then
    insert into simulou_passou_private.purchase_accounts(email,first_order) values(recipient,item.id)
    on conflict(email) do nothing;
    select * into strict provision from simulou_passou_private.purchase_accounts where email=recipient for update;
  end if;
  -- An independently registered account always wins; its password must never be overwritten.
  if account.id is not null then
    if provision.user_id=account.id and provision.initial_hash is null then
      update simulou_passou_private.purchase_accounts set initial_hash=md5(account.encrypted_password)
      where email=recipient returning * into provision;
    end if;
    update simulou_passou_private.orders set user_id=account.id where id=item.id and user_id is null;
  end if;
  return jsonb_build_object('email',recipient,'name',coalesce(item.buyer_name,'Participante'),
    'userId',coalesce(account.id,provision.user_id),'create',account.id is null,
    'provisional',provision.first_order=item.id and (account.id is null or
      (account.id=provision.user_id and provision.initial_hash=md5(account.encrypted_password))));
end $$;
revoke all on function simulou_passou_private.purchase_identity(uuid,uuid) from public,anon,authenticated;
grant execute on function simulou_passou_private.purchase_identity(uuid,uuid) to service_role;
create function public.sp_purchase_access(p_order uuid,p_claim uuid) returns jsonb
language sql security invoker set search_path='' as $$
  select simulou_passou_private.purchase_identity(p_order,p_claim);
$$;
revoke all on function public.sp_purchase_access(uuid,uuid) from public,anon,authenticated;
grant execute on function public.sp_purchase_access(uuid,uuid) to service_role;

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
    'confirmationId',c.confirmation_id,'accessId',c.access_id,'version',c.template_version,
    'module',(select p->>'name' from simulou_passou_private.catalog,
      jsonb_array_elements(body->'preparations') p where p->>'id'=o.prep_id limit 1)
  )),'[]'::jsonb) from claimed c join simulou_passou_private.orders o on o.id=c.order_id;
$$;

create function public.sp_purchase_message_record(p_order uuid,p_claim uuid,p_kind text,p_id text) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if p_kind not in ('confirmation','access') or p_id is null or length(p_id)>100 then
    raise exception 'Invalid purchase message';
  end if;
  update simulou_passou_private.purchase_mail set
    confirmation_id=case when p_kind='confirmation' then p_id else confirmation_id end,
    access_id=case when p_kind='access' then p_id else access_id end,
    confirmation_status=case when p_kind='confirmation' then 'accepted' else confirmation_status end,
    access_status=case when p_kind='access' then 'accepted' else access_status end
  where order_id=p_order and claim_token=p_claim and sent_at is null;
  if not found then raise exception 'Purchase claim expired'; end if;
end $$;
revoke all on function public.sp_purchase_message_record(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.sp_purchase_message_record(uuid,uuid,text,text) to service_role;

create function public.sp_purchase_mail_audit(p_order uuid) returns jsonb
language sql security invoker set search_path='' as $$
  select jsonb_build_object('email',o.buyer_email,'confirmationId',q.confirmation_id,'accessId',q.access_id)
  from simulou_passou_private.orders o join simulou_passou_private.purchase_mail q on q.order_id=o.id
  where o.id=p_order;
$$;
revoke all on function public.sp_purchase_mail_audit(uuid) from public,anon,authenticated;
grant execute on function public.sp_purchase_mail_audit(uuid) to service_role;

create function public.sp_purchase_delivery_record(p_order uuid,p_id text,p_status text) returns void
language sql security invoker set search_path='' as $$
  update simulou_passou_private.purchase_mail set
    confirmation_status=case when confirmation_id=p_id then left(p_status,40) else confirmation_status end,
    access_status=case when access_id=p_id then left(p_status,40) else access_status end
  where order_id=p_order and p_id in (confirmation_id,access_id);
$$;
revoke all on function public.sp_purchase_delivery_record(uuid,text,text) from public,anon,authenticated;
grant execute on function public.sp_purchase_delivery_record(uuid,text,text) to service_role;

create or replace function simulou_passou_private.sp_set_annual_access() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.offer in ('all','module') and new.annual_access and new.status='paid' and new.access_expires_at is null then
    new.access_expires_at:=now()+interval '1 year';
  end if;
  return new;
end $$;
