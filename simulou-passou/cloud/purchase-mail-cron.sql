select cron.schedule('simulou-passou-purchase-mail','* * * * *',$job$
  select net.http_post(
    url := 'https://seyljsqmhlopkcauhlor.supabase.co/functions/v1/simulou-passou-api/api/internal/purchase-mail',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||key.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 12000
  )
  from vault.decrypted_secrets key
  where key.name='service_role_key' and exists (
    select 1 from simulou_passou_private.purchase_mail q
    join simulou_passou_private.orders o on o.id=q.order_id
    where o.provider_mode='production' and o.status='paid' and q.sent_at is null
      and q.next_at<=now() and q.queued_at>now()-interval '23 hours'
  );
$job$);
