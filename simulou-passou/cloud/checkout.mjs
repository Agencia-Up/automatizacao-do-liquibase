import { timingSafeEqual } from 'node:crypto';

const checkoutId = value => typeof value === 'string' && /^[0-9a-z_-]{8,100}$/i.test(value);
const paymentEvents = new Set(['PAYMENT_CONFIRMED','PAYMENT_RECEIVED','PAYMENT_REFUNDED','PAYMENT_CHARGEBACK_REQUESTED','PAYMENT_CHARGEBACK_DISPUTE']);
const checkoutEvents = new Set(['CHECKOUT_CANCELED','CHECKOUT_EXPIRED']);
const paidStatus = new Set(['CONFIRMED','RECEIVED']);
const refundStatus = new Set(['REFUNDED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE']);

export function createCheckout({config,fetchImpl,origin,basePath,rpc,fault}){
  const mode=config?.mode==='sandbox'?'sandbox':'production';
  const sandbox=mode==='sandbox';
  const configured=['sandbox','production'].includes(config?.mode)&&!!config.apiKey&&typeof config.webhookToken==='string'&&config.webhookToken.length>=32;
  const api=sandbox?'https://api-sandbox.asaas.com/v3':'https://api.asaas.com/v3';
  const pay=sandbox?'https://sandbox.asaas.com':'https://asaas.com';
  const encoder=new TextEncoder();
  const secret=encoder.encode(config?.webhookToken||'');
  const provider=async(path,body)=>{
    const response=await fetchImpl(api+path,{
      method:body?'POST':'GET',
      headers:{access_token:config.apiKey,'Content-Type':'application/json','User-Agent':'Simulou-Passou/1.0'},
      body:body?JSON.stringify(body):undefined,
      signal:AbortSignal.timeout(12000),
    });
    if(!response.ok)throw fault(503,'O provedor de pagamentos está indisponível. Tente novamente em instantes.');
    return response.json();
  };

  async function create(user,prep){
    if(!configured)throw fault(503,'As vendas ainda não estão habilitadas.');
    if(typeof prep!=='string'||!/^[a-z0-9-]{1,80}$/.test(prep))throw fault(400,'Escolha uma trilha válida.');
    const order=await rpc('sp_checkout_claim',{p_actor:user.id,p_prep:prep,p_mode:mode});
    if(order.state==='disabled')throw fault(503,'As vendas ainda não estão habilitadas.');
    if(order.state==='unavailable')throw fault(404,'Essa trilha não está disponível.');
    if(order.state==='owned')return {owned:true};
    if(order.state==='ready')return {url:order.url};
    if(order.state!=='create')throw fault(409,'Já existe um pedido em processamento. Aguarde e tente novamente.');
    const returnUrl=origin+basePath+'/?prep='+encodeURIComponent(prep)+'&pagamento=';
    const checkout=await provider('/checkouts',{
      billingTypes:['PIX','CREDIT_CARD'],
      chargeTypes:['DETACHED'],
      minutesToExpire:30,
      externalReference:order.id,
      callback:{successUrl:returnUrl+'retorno',cancelUrl:returnUrl+'cancelado',expiredUrl:returnUrl+'cancelado'},
      items:[{name:'Simulou Passou · Acesso completo',description:'Trilha inicial: '+order.name,quantity:1,value:order.amount/100}],
    });
    if(!checkoutId(checkout.id))throw fault(503,'O provedor não retornou um link de pagamento válido.');
    const url=pay+'/checkoutSession/show?id='+encodeURIComponent(checkout.id);
    await rpc('sp_checkout_attach',{p_order:order.id,p_provider:checkout.id,p_url:url});
    return {url};
  }

  async function handleWebhook(req,body){
    if(!configured)throw fault(404,'Operação indisponível.');
    const provided=encoder.encode(req.headers.get('asaas-access-token')||'');
    if(provided.length!==secret.length||!timingSafeEqual(provided,secret))throw fault(403,'Notificação não autorizada.');
    if(typeof body.id!=='string'||body.id.length<1||body.id.length>200)throw fault(400,'Evento inválido.');
    if(checkoutEvents.has(body.event)&&checkoutId(body.checkout?.id)){
      await rpc('sp_checkout_event',{p_provider:body.checkout.id,p_mode:mode,p_event:body.id,p_state:'cancelled'});
    }else if(paymentEvents.has(body.event)&&checkoutId(body.payment?.id)){
      const payment=await provider('/payments/'+encodeURIComponent(body.payment.id));
      if(!checkoutId(payment.checkoutSession)||!['PIX','CREDIT_CARD'].includes(payment.billingType))return {ok:true};
      const state=paidStatus.has(payment.status)?'paid':refundStatus.has(payment.status)?'refunded':null;
      const amount=Math.round(Number(payment.value)*100);
      if(state&&Number.isSafeInteger(amount))await rpc('sp_checkout_event',{p_provider:payment.checkoutSession,p_mode:mode,p_event:body.id,p_state:state,p_amount:amount});
    }
    return {ok:true};
  }

  return {configured,mode,create,handleWebhook};
}
