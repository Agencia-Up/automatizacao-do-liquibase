import {createCloudGateway} from './gateway.mjs';
const gateway=createCloudGateway({
  supabaseUrl:Deno.env.get('SUPABASE_URL'),
  serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  publishableKey:Deno.env.get('SUPABASE_ANON_KEY'),
  allowedOrigins:['https://logosiabrasil.com','https://logos-ia-simulou-passou.pqaykh.easypanel.host'],
});
Deno.serve(gateway);
