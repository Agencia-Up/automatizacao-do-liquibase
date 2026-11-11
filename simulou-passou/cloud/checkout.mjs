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
      redirect:'error',
      signal:AbortSignal.timeout(12000),
    });
    if(!response.ok){
      let errors=[];
      if(path==='/checkouts'&&body?.customerData&&[400,422].includes(response.status)){
        const error=await response.json().catch(()=>null);
        errors=Array.isArray(error?.errors)?error.errors:[];
        const fields=errors.map(item=>item?.code+' '+item?.description).join(' ');
        if(/customer|pagador|cpf|cnpj|endere[cç]o|postal|cidade|bairro|telefone|phone|e.?mail|parse_error/i.test(fields)){
          const {customerData,...checkout}=body;
          return provider(path,checkout);
        }
      }
      if(path==='/checkouts'){
        if(!body?.customerData){
          const error=await response.json().catch(()=>null);
          errors=Array.isArray(error?.errors)?error.errors:[];
        }
        const codes=errors.map(item=>item?.code).filter(code=>typeof code==='string'&&/^[a-z0-9_]{1,64}$/i.test(code));
        console.warn('Simulou Passou: Asaas recusou o checkout',response.status,codes.join(','));
      }
      throw fault(503,'O provedor de pagamentos está indisponível. Tente novamente em instantes.');
    }
    return response.json();
  };

  async function create(user,prep,offer,guest,details){
    if(!configured)throw fault(503,'As vendas ainda não estão habilitadas.');
    if(!config.itemImage)throw fault(503,'A imagem do produto está indisponível.');
    if(typeof prep!=='string'||!/^[a-z0-9-]{1,80}$/.test(prep))throw fault(400,'Escolha uma trilha válida.');
    if(!['module','all'].includes(offer))throw fault(400,'Escolha uma opção de acesso.');
    const offerArgs={p_prep:prep,p_mode:mode,p_offer:offer};
    const order=details
      ?await rpc('sp_checkout_claim_details',{
        p_actor:user?.id??null,p_guest:guest?.key??null,p_email:user?.email??guest?.email,...offerArgs,
        p_name:details.name,p_phone:details.phone,p_method:details.method
      })
      :user
      ?await rpc('sp_checkout_claim_offer',{p_actor:user.id,...offerArgs})
      :await rpc('sp_checkout_claim_guest',{p_guest:guest.key,p_email:guest.email,...offerArgs});
    if(order.state==='disabled')throw fault(503,'As vendas ainda não estão habilitadas.');
    if(order.state==='unavailable')throw fault(404,'Essa trilha não está disponível.');
    if(order.state==='owned')return {owned:true};
    if(order.state==='guest_paid')return {guestPaid:true};
    if(order.state==='limited')throw fault(429,'Muitas tentativas de pagamento. Aguarde alguns minutos e tente novamente.');
    if(order.state==='ready')return {url:order.url};
    if(order.state==='different_method')throw fault(409,'Já existe um pagamento aberto por '+(order.method==='PIX'?'Pix':'cartão')+'. Selecione essa opção para reabrir o pagamento.');
    if(order.state==='different_order')throw fault(409,'Conclua ou cancele o pedido anterior antes de escolher outra opção.');
    if(order.state!=='create')throw fault(409,'Já existe um pedido em processamento. Aguarde e tente novamente.');
    const returnUrl=origin+basePath+'/?'+new URLSearchParams({prep,offer})+'&pagamento=';
    const itemName=offer==='all'?'Simulou Passou - Pacote':order.name;
    const itemDescription=offer==='all'?'Acesso a todos os módulos':'Acesso ao módulo '+order.name;
    const checkout=await provider('/checkouts',{
      billingTypes:details?[details.method]:['PIX','CREDIT_CARD'],
      ...(details?{customerData:{name:details.name,phone:details.phone,email:user?.email??guest?.email}}:{}),
      chargeTypes:['DETACHED'],
      minutesToExpire:30,
      externalReference:order.id,
      callback:{successUrl:returnUrl+'retorno',cancelUrl:returnUrl+'cancelado',expiredUrl:returnUrl+'cancelado'},
      items:[{
        name:Array.from(itemName).slice(0,30).join(''),
        description:Array.from(itemDescription).slice(0,150).join(''),
        imageBase64:config.itemImage,
        quantity:1,value:order.amount/100,
      }],
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
    }else if(body.event==='CHECKOUT_PAID'&&checkoutId(body.checkout?.id)){
      const id=body.checkout.id;
      const found=await rpc('sp_checkout_known',{p_provider:id,p_mode:mode});
      if(!found)return {ok:true};
      const payments=await provider('/payments?'+new URLSearchParams({checkoutSession:id,limit:'20'}));
      const paid=Array.isArray(payments.data)&&payments.data.find(payment=>paidStatus.has(payment.status)&&['PIX','CREDIT_CARD'].includes(payment.billingType)&&payment.checkoutSession===id);
      if(!paid)throw fault(503,'Pagamento ainda não confirmado no Asaas.');
      const amount=Math.round(Number(paid.value)*100);
      if(Number.isSafeInteger(amount))await rpc('sp_checkout_event',{p_provider:id,p_mode:mode,p_event:body.id,p_state:'paid',p_amount:amount});
    }else if(paymentEvents.has(body.event)&&checkoutId(body.payment?.id)){
      if(checkoutId(body.payment.checkoutSession)&&!await rpc('sp_checkout_known',{p_provider:body.payment.checkoutSession,p_mode:mode}))return {ok:true};
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
