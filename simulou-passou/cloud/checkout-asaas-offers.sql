create table simulou_passou_private.asaas_offers (
  provider_mode text not null check (provider_mode in ('production','sandbox')),
  offer text not null check (offer in ('module','all')),
  link_id text not null check (link_id ~ '^[a-zA-Z0-9_-]{5,100}$'),
  amount integer not null check ((offer='module' and amount=2990) or (offer='all' and amount=4990)),
  primary key (provider_mode,offer),
  unique (provider_mode,link_id)
);
alter table simulou_passou_private.asaas_offers enable row level security;
grant select on simulou_passou_private.asaas_offers to service_role;

create function public.sp_checkout_asaas_offer(p_mode text,p_offer text) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('reference',link_id,'amount',amount)
  from simulou_passou_private.asaas_offers
  where provider_mode=p_mode and offer=p_offer;
$$;
revoke all on function public.sp_checkout_asaas_offer(text,text) from public,anon,authenticated;
grant execute on function public.sp_checkout_asaas_offer(text,text) to service_role;
