-- Isolated module storage. No changes to Logos tables, triggers or global roles.
create schema if not exists simulou_passou_private;
revoke all on schema simulou_passou_private from public, anon, authenticated;
grant usage on schema simulou_passou_private to service_role;

create table simulou_passou_private.catalog (
  id boolean primary key default true check(id),
  revision bigint not null default 1,
  body jsonb not null default '{"preparations":[],"materials":[],"questions":[],"quizzes":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into simulou_passou_private.catalog(id) values(true);
create table simulou_passou_private.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1,
  body jsonb not null,
  updated_at timestamptz not null default now()
);
create table simulou_passou_private.administrators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table simulou_passou_private.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default false,
  source text not null check(source in ('manual','asaas')),
  payment_id text,
  updated_at timestamptz not null default now()
);
create table simulou_passou_private.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null default 2990 check(amount=2990),
  status text not null default 'pending' check(status in ('pending','paid','declined','refunded','cancelled')),
  payment_id text unique,
  invoice_url text,
  provider_state text,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index sp_one_pending_order on simulou_passou_private.orders(user_id) where status='pending';
create index sp_order_owner on simulou_passou_private.orders(user_id,created_at desc);
create table simulou_passou_private.payment_events (
  event_id text primary key,
  order_id uuid not null references simulou_passou_private.orders(id),
  status text not null,
  created_at timestamptz not null default now()
);
create table simulou_passou_private.settings (
  id boolean primary key default true check(id),
  checkout_enabled boolean not null default false,
  webhook_hash text,
  updated_at timestamptz not null default now()
);
insert into simulou_passou_private.settings(id) values(true);

alter table simulou_passou_private.catalog enable row level security;
alter table simulou_passou_private.members enable row level security;
alter table simulou_passou_private.administrators enable row level security;
alter table simulou_passou_private.entitlements enable row level security;
alter table simulou_passou_private.orders enable row level security;
alter table simulou_passou_private.payment_events enable row level security;
alter table simulou_passou_private.settings enable row level security;
revoke all on all tables in schema simulou_passou_private from public,anon,authenticated;
grant select,insert,update,delete on all tables in schema simulou_passou_private to service_role;

-- All RPCs are SECURITY INVOKER and executable only by the backend service role.
-- Authenticated browser users cannot load the runtime's answer keys or snapshots.
create function public.sp_runtime_load(p_actor uuid default null) returns jsonb
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
    'orders',coalesce((select jsonb_agg(jsonb_build_object('id',id,'userId',user_id,'amount',amount,'status',status,'invoiceUrl',invoice_url,'createdAt',created_at)) from simulou_passou_private.orders where p_actor is not null and (adm or user_id=p_actor)),'[]'::jsonb),
    'active_users',coalesce((select jsonb_agg(user_id) from simulou_passou_private.entitlements where active and p_actor is not null and (adm or user_id=p_actor)),'[]'::jsonb)
  );
end $$;

create function public.sp_runtime_commit(p_actor uuid,p_catalog_revision bigint,p_catalog jsonb,p_members jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare adm boolean; item jsonb; owner_id uuid; expected bigint; entry jsonb; collection text; row_item jsonb;
begin
  if p_actor is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  adm := exists(select 1 from simulou_passou_private.administrators where user_id=p_actor);
  if p_catalog is not null then
    if not adm then raise exception 'Administrator required' using errcode='42501'; end if;
    update simulou_passou_private.catalog set body=p_catalog,revision=revision+1,updated_at=now() where id and revision=p_catalog_revision;
    if not found then raise exception 'Concurrent catalog update' using errcode='40001'; end if;
  end if;
  -- Stable lock ordering prevents deadlocks when a teacher grades several accounts.
  for item in select value from jsonb_array_elements(p_members) order by value->>'user_id' loop
    owner_id := (item->>'user_id')::uuid;
    expected := (item->>'revision')::bigint;
    entry := item->'body';
    if not adm and owner_id<>p_actor then raise exception 'Owner mismatch' using errcode='42501'; end if;
    if entry ?| array['password','sessions','recoveries','orders','localAccess','role'] then
      raise exception 'Unsupported member state' using errcode='22023';
    end if;
    foreach collection in array array['attempts','completed','notes','studyTasks','studyPreferences','reviewMarks','focusSessions'] loop
      for row_item in select value from jsonb_array_elements(coalesce(entry->collection,'[]'::jsonb)) loop
        if (row_item->>'userId') is distinct from owner_id::text then raise exception 'Row owner mismatch' using errcode='42501'; end if;
      end loop;
    end loop;
    if expected=0 then
      insert into simulou_passou_private.members(user_id,body) values(owner_id,entry) on conflict do nothing;
    else
      update simulou_passou_private.members set body=entry,revision=revision+1,updated_at=now() where user_id=owner_id and revision=expected;
    end if;
    if not found then raise exception 'Concurrent member update' using errcode='40001'; end if;
  end loop;
end $$;

create function public.sp_module_access(p_actor uuid,p_user uuid,p_active boolean) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from simulou_passou_private.administrators where user_id=p_actor) then
    raise exception 'Administrator required' using errcode='42501';
  end if;
  if not exists(select 1 from simulou_passou_private.members where user_id=p_user) then raise exception 'Unknown member'; end if;
  insert into simulou_passou_private.entitlements(user_id,active,source) values(p_user,p_active,'manual')
  on conflict(user_id) do update set active=excluded.active,source='manual',payment_id=null,updated_at=now();
end $$;

revoke all on function public.sp_runtime_load(uuid) from public,anon,authenticated;
revoke all on function public.sp_runtime_commit(uuid,bigint,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.sp_module_access(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.sp_runtime_load(uuid) to service_role;
grant execute on function public.sp_runtime_commit(uuid,bigint,jsonb,jsonb) to service_role;
grant execute on function public.sp_module_access(uuid,uuid,boolean) to service_role;
