create table simulou_passou_private.student_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 5 and 2000),
  created_at timestamptz not null default now()
);
alter table simulou_passou_private.student_feedback enable row level security;
grant select,insert on simulou_passou_private.student_feedback to service_role;
create index student_feedback_recent on simulou_passou_private.student_feedback(user_id,created_at desc);

create function public.sp_feedback_submit(p_actor uuid,p_message text) returns void
language plpgsql security invoker set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('sp-feedback:'||p_actor,0));
  if (select count(*) from simulou_passou_private.student_feedback
      where user_id=p_actor and created_at>now()-interval '1 hour')>=5 then
    raise exception 'Feedback rate limit' using errcode='PT429';
  end if;
  insert into simulou_passou_private.student_feedback(user_id,message) values(p_actor,p_message);
end $$;
create function public.sp_feedback_inbox(p_actor uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
  if not exists(select 1 from simulou_passou_private.administrators where user_id=p_actor) then
    raise exception 'Administrator required' using errcode='PT403';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('message',message,'createdAt',created_at) order by created_at desc),'[]'::jsonb)
    from (select message,created_at from simulou_passou_private.student_feedback order by created_at desc limit 100) recent);
end $$;
revoke all on function public.sp_feedback_submit(uuid,text),public.sp_feedback_inbox(uuid) from public,anon,authenticated;
grant execute on function public.sp_feedback_submit(uuid,text),public.sp_feedback_inbox(uuid) to service_role;
