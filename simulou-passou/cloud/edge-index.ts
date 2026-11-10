import {createCloudGateway} from './gateway.mjs';
const gateway=createCloudGateway({
  supabaseUrl:Deno.env.get('SUPABASE_URL'),
  serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  publishableKey:Deno.env.get('SUPABASE_ANON_KEY'),
  checkoutConfig:{apiKey:Deno.env.get('SP_ASAAS_API_KEY'),webhookToken:Deno.env.get('SP_ASAAS_WEBHOOK_TOKEN'),mode:Deno.env.get('SP_ASAAS_MODE')},
  allowedOrigins:['https://logosiabrasil.com','https://logos-ia-simulou-passou.pqaykh.easypanel.host'],
});
Deno.serve(gateway);
