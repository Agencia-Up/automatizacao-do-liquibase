-- Credentials remain in managed Supabase Auth; only a server-owned mapping
-- connects the product identity to the real recipient and existing study data.
create table if not exists simulou_passou_private.product_identities (
  email text primary key check(email=lower(btrim(email)) and length(email)<=254),
  auth_user_id uuid not null unique default gen_random_uuid(),
  auth_email text not null unique default ('sp-'||replace(gen_random_uuid()::text,'-','')||left(replace(gen_random_uuid()::text,'-',''),24)||'@simulou-passou.invalid'),
  member_user_id uuid not null unique,
  created_at timestamptz not null default now()
);
alter table simulou_passou_private.product_identities enable row level security;
revoke all on simulou_passou_private.product_identities from public,anon,authenticated;
grant select,insert,update on simulou_passou_private.product_identities to service_role;

-- This narrow private definer can inspect Auth without exposing Auth reads to
-- REST clients. No caller can supply a workspace member id or an admin role.
create or replace function simulou_passou_private.product_identity(p_email text,p_auth_user uuid,p_create boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  recipient text:=lower(btrim(p_email));
  item simulou_passou_private.product_identities%rowtype;
  legacy auth.users%rowtype;
  account auth.users%rowtype;
  new_id uuid;
begin
  if p_auth_user is not null then
    if p_email is not null or p_create then raise exception 'Invalid identity lookup'; end if;
    select * into item from simulou_passou_private.product_identities where auth_user_id=p_auth_user;
    if not found then return null; end if;
  else
    if recipient is null or length(recipient)>254 or recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid product recipient'; end if;
    select * into item from simulou_passou_private.product_identities where email=recipient;
    if not found then
      select u.* into legacy from auth.users u where lower(u.email)=recipient and u.deleted_at is null
      and (exists(select 1 from simulou_passou_private.members m where m.user_id=u.id)
        or exists(select 1 from simulou_passou_private.administrators a where a.user_id=u.id)
        or exists(select 1 from simulou_passou_private.orders o where o.user_id=u.id and o.status='paid')) limit 1;
      if not p_create then
        if legacy.id is null then return null; end if;
        return jsonb_build_object('email',recipient,'name',coalesce(legacy.raw_user_meta_data->>'name','Participante'),
          'memberId',legacy.id,'exists',false,'legacy',true);
      end if;
      new_id:=gen_random_uuid();
      insert into simulou_passou_private.product_identities(email,auth_user_id,member_user_id)
      values(recipient,new_id,coalesce(legacy.id,new_id)) on conflict(email) do nothing;
      select * into strict item from simulou_passou_private.product_identities where email=recipient;
    end if;
  end if;
  select * into account from auth.users where id=item.auth_user_id and deleted_at is null;
  return jsonb_build_object('email',item.email,'authUserId',item.auth_user_id,'memberId',item.member_user_id,
    'authEmail',item.auth_email,
    'name',coalesce(account.raw_user_meta_data->>'name',legacy.raw_user_meta_data->>'name','Participante'),
    'exists',account.id is not null,'confirmed',account.email_confirmed_at is not null,
    'legacy',item.member_user_id<>item.auth_user_id);
end $$;
revoke all on function simulou_passou_private.product_identity(text,uuid,boolean) from public,anon,authenticated;
grant execute on function simulou_passou_private.product_identity(text,uuid,boolean) to service_role;
create or replace function public.sp_product_identity(p_email text,p_auth_user uuid,p_create boolean)
returns jsonb language sql security invoker set search_path='' as $$
  select simulou_passou_private.product_identity(p_email,p_auth_user,p_create);
$$;
revoke all on function public.sp_product_identity(text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.sp_product_identity(text,uuid,boolean) to service_role;

-- Preserve the current Logos trigger code and team-authority checks. Only Auth
-- UUIDs reserved in the service-only product registry bypass Logos enrollment.
do $$
declare target regprocedure; definition text; guard text:=E'\nBEGIN\n  -- sp-product-isolation: never enroll simulator identities into Logos.\n  IF EXISTS (SELECT 1 FROM simulou_passou_private.product_identities WHERE auth_user_id=NEW.id) THEN RETURN NEW; END IF;\n';
begin
  foreach target in array array['public.handle_new_user()'::regprocedure,'public.create_default_subscription()'::regprocedure] loop
    definition:=pg_get_functiondef(target);
    if position('sp-product-isolation' in definition)=0 then
      if position(E'\nBEGIN\n' in definition)=0 then raise exception 'Unexpected Logos trigger definition'; end if;
      execute replace(definition,E'\nBEGIN\n',guard);
    end if;
  end loop;
end $$;

create or replace function simulou_passou_private.purchase_identity(p_order uuid,p_claim uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  item simulou_passou_private.orders%rowtype;
  provision simulou_passou_private.purchase_accounts%rowtype;
  account auth.users%rowtype;
  product jsonb;
  recipient text;
begin
  select o.* into item from simulou_passou_private.orders o
  join simulou_passou_private.purchase_mail q on q.order_id=o.id
  where o.id=p_order and o.status='paid' and q.claim_token=p_claim and q.sent_at is null for update of q;
  if not found then raise exception 'Purchase claim expired'; end if;
  recipient:=lower(coalesce(item.buyer_email,
    (select i.email from simulou_passou_private.product_identities i where i.member_user_id=item.user_id),
    (select email from auth.users where id=item.user_id)));
  product:=simulou_passou_private.product_identity(recipient,null,true);
  select * into account from auth.users where id=(product->>'authUserId')::uuid and deleted_at is null;
  select * into provision from simulou_passou_private.purchase_accounts where email=recipient for update;
  if provision.email is null and account.id is null then
    insert into simulou_passou_private.purchase_accounts(email,user_id,first_order)
    values(recipient,(product->>'authUserId')::uuid,item.id) on conflict(email) do nothing;
    select * into strict provision from simulou_passou_private.purchase_accounts where email=recipient for update;
  end if;
  if account.id is not null then
    if provision.user_id=account.id and provision.initial_hash is null then
      update simulou_passou_private.purchase_accounts set initial_hash=md5(account.encrypted_password)
      where email=recipient returning * into provision;
    end if;
    update simulou_passou_private.orders set user_id=(product->>'memberId')::uuid where id=item.id and user_id is null;
  end if;
  return product||jsonb_build_object('name',coalesce(item.buyer_name,'Participante'),'create',account.id is null,
    'userId',(product->>'authUserId')::uuid,
    'provisional',provision.first_order=item.id and (account.id is null or
      (account.id=provision.user_id and provision.initial_hash=md5(account.encrypted_password))));
end $$;

-- Old authenticated checkouts may not have buyer_email. Resolve the real
-- recipient through the product mapping, never through its internal Auth alias.
do $$
declare target regprocedure; definition text;
  needle text:='''email'',o.buyer_email';
  replacement text:='''email'',coalesce(o.buyer_email,(select i.email from simulou_passou_private.product_identities i where i.member_user_id=o.user_id))';
begin
  foreach target in array array['public.sp_purchase_mail_claim(text)'::regprocedure,'public.sp_purchase_mail_audit(uuid)'::regprocedure] loop
    definition:=pg_get_functiondef(target);
    if position(replacement in definition)=0 then
      if position(needle in definition)=0 then raise exception 'Unexpected purchase mail definition'; end if;
      execute replace(definition,needle,replacement);
    end if;
  end loop;
end $$;
