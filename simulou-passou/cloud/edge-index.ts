import {createCloudGateway} from './gateway.mjs';
const mode=Deno.env.get('SP_ASAAS_MODE')||'production';
const gateway=createCloudGateway({
  supabaseUrl:Deno.env.get('SUPABASE_URL'),
  serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  publishableKey:Deno.env.get('SUPABASE_ANON_KEY'),
  checkoutConfig:{
    apiKey:mode==='production'?(Deno.env.get('ASAAS_API_KEY')||Deno.env.get('SP_ASAAS_API_KEY')):Deno.env.get('SP_ASAAS_API_KEY'),
    webhookToken:Deno.env.get('SP_ASAAS_WEBHOOK_TOKEN')||(mode==='production'?(Deno.env.get('CHECKOUT_ASAAS_WEBHOOK_TOKEN')||Deno.env.get('ASAAS_WEBHOOK_SECRET')):undefined),
    mode,
  },
  allowedOrigins:['https://logosiabrasil.com','https://logos-ia-simulou-passou.pqaykh.easypanel.host'],
});
Deno.serve(gateway);
