import {sealPurchaseMessage,openPurchaseMessage} from './purchase-snapshot.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sender='suporte@logosiabrasil.com';
export const recoveryKeyPattern=/^[A-Za-z0-9_-]{32,160}$/;

export function renderMessage({baseUrl,title,greeting='Olá!',paragraphs=[],details=[],action,link,secondary}){
  const text=[title,greeting,...paragraphs,...details.map(([label,value])=>label+': '+value),action+': '+link,secondary?.text,secondary?.label,secondary?.link,'Simulou Passou',sender].filter(Boolean).join('\n\n');
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f2f4ef;color:#19363a;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#fff;border:1px solid #dce4da;border-radius:16px">
  <tr><td style="padding:28px;background:#17383f;border-radius:15px 15px 0 0;border-bottom:4px solid #d7b16c"><img src="${escape(baseUrl)}/simulou-passou-logo.png" width="228" height="56" alt="Simulou Passou" style="display:block;max-width:100%;height:auto;color:white"></td></tr>
  <tr><td style="padding:28px"><h1 style="margin:0 0 20px;font:normal 30px/1.2 Georgia,serif">${escape(title)}</h1>
  <p style="font-size:16px;line-height:1.65">${escape(greeting)}</p>
  ${paragraphs.map(p=>`<p style="font-size:15px;line-height:1.65">${escape(p)}</p>`).join('')}
  ${details.length?`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;background:#f2f5ef;border-radius:10px">${details.map(([label,value])=>`<tr><td style="padding:12px 16px;font-size:13px;line-height:1.6;overflow-wrap:anywhere"><strong style="color:#53655b">${escape(label)}</strong><br><span style="font-size:16px">${escape(value)}</span></td></tr>`).join('')}</table>`:''}
  <table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#17383f" style="border-radius:7px"><a href="${escape(link)}" style="display:inline-block;padding:15px 22px;color:#fff;font-size:15px;font-weight:bold;text-decoration:none">${escape(action)}</a></td></tr></table>
  ${secondary?`<p style="margin-top:22px;font-size:13px;line-height:1.65">${escape(secondary.text)}<br><a href="${escape(secondary.link)}" style="color:#17383f">${escape(secondary.label||secondary.link)}</a></p>`:''}
  <p style="margin-top:24px;font-size:12px;line-height:1.6;color:#647269">Se o botão não abrir, copie este endereço para o navegador:<br><a href="${escape(link)}" style="color:#17383f;word-break:break-all">${escape(link)}</a></p>
  </td></tr><tr><td style="padding:20px 28px;background:#eef2ec;border-radius:0 0 16px 16px;font-size:12px;line-height:1.7">Simulou Passou · Pratique no seu ritmo.<br>Precisa de ajuda? <a href="mailto:${sender}" style="color:#17383f">${sender}</a></td></tr>
  </table></td></tr></table></body></html>`;
  return {html,text};
}

function mailer({fetchImpl=fetch,resendKey,baseUrl}){
  return async ({email,subject,type,idempotency,...content})=>{
    const response=await fetchImpl('https://api.resend.com/emails',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
      headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json',...(idempotency?{'Idempotency-Key':idempotency}:{})},
      body:JSON.stringify({from:'Simulou Passou <'+sender+'>',to:[email],reply_to:sender,
        headers:{'Auto-Submitted':'auto-generated'},tags:[{name:'project',value:'simulou-passou'},{name:'message_type',value:type}],
        subject,...renderMessage({baseUrl,...content})}),
    });
    const sent=await response.json().catch(()=>null);
    if(!response.ok||typeof sent?.id!=='string')throw Object.assign(new Error('Email provider did not accept message'),{mailError:'resend_'+response.status});
    return sent.id;
  };
}

export function createAccountMail({supa,fetchImpl,baseUrl,resendKey,fault}){
  const send=mailer({fetchImpl,baseUrl,resendKey});
  return async ({email,name='',access=false})=>{
    const generated=await supa('/auth/v1/admin/generate_link',{method:'POST',body:{type:'recovery',email,redirect_to:baseUrl+'/'}});
    const key=generated.hashed_token||generated.properties?.hashed_token;
    if(!recoveryKeyPattern.test(key||''))throw fault(503,'O link de recuperação não pôde ser gerado.');
    return send({email,type:access?'account-access':'password-reset',subject:'Simulou Passou · Defina sua senha',
      title:access?'Seu acesso está pronto':'Redefina sua senha',greeting:name?'Olá, '+name+'.':'Olá!',
      paragraphs:['Use o botão abaixo para escolher uma senha pessoal para sua conta do Simulou Passou.','O link é pessoal, de uso único e tem validade limitada. Se você não fez esta solicitação, ignore este e-mail.'],
      details:[['Seu login',email]],action:'Escolher nova senha',link:baseUrl+'/#/redefinir?'+new URLSearchParams({chave:key})});
  };
}

export function createRegistrationMail({supa,fetchImpl,baseUrl,resendKey}){
  const send=mailer({fetchImpl,baseUrl,resendKey});
  return async ({email,password,name})=>{
    const generated=await supa('/auth/v1/admin/generate_link',{method:'POST',body:{type:'signup',email,password,data:{name},redirect_to:baseUrl+'/'}});
    const link=generated.action_link||generated.properties?.action_link;
    if(typeof link!=='string'||!link.startsWith('https://'))throw new Error('Signup link unavailable');
    await send({email,type:'account-confirmation',subject:'Confirme sua conta · Simulou Passou',title:'Confirme sua conta',greeting:'Olá, '+name+'.',
      paragraphs:['Seu cadastro no Simulou Passou está pronto. Confirme seu e-mail e entre com a senha que você escolheu.'],
      details:[['Seu login',email]],action:'Confirmar meu e-mail',link});
  };
}

export function createPurchaseMail({purchaseAccess,supa,rpc,fetchImpl=fetch,baseUrl,resendKey,serviceKey}){
  const currency=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  return async order=>{
    try{
      if(order.messageId)return null;
      let encrypted=order.contentCipher;
      if(!encrypted){
        const account=await purchaseAccess(order);
        const generated=await supa('/auth/v1/admin/generate_link',{method:'POST',body:{type:'recovery',email:account.email,redirect_to:baseUrl+'/'}});
        const resetKey=generated.hashed_token||generated.properties?.hashed_token;
        if(!recoveryKeyPattern.test(resetKey||''))return 'recovery_link_unavailable';
        const product=order.offer==='all'?'Pacote completo · Todos os módulos':order.module||'Módulo individual';
        if(!order.expiresAt)return 'purchase_expiry_missing';
        const expiry=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'long',timeStyle:'short'}).format(new Date(order.expiresAt));
        const resetUrl=baseUrl+'/#/redefinir?'+new URLSearchParams({chave:resetKey});
        const message={
          from:'Simulou Passou <'+sender+'>',to:[account.email],reply_to:sender,
          headers:{'Auto-Submitted':'auto-generated'},
          tags:[{name:'project',value:'simulou-passou'},{name:'message_type',value:'purchase-and-access'}],
          subject:'Compra confirmada e seu acesso · Simulou Passou',
          ...renderMessage({baseUrl,title:'Compra confirmada. Seu acesso está pronto.',greeting:'Olá, '+account.name+'.',
            details:[['Produto',product],['Valor pago',currency.format(order.amount/100)],['Seu login (e-mail)',account.email],
              ['Senha',account.password?'Senha provisória: '+account.password:'Use a senha já cadastrada para este e-mail.'],
              ['Validade do acesso',expiry+' (horário de Brasília)']],
            paragraphs:['Seu pagamento foi confirmado. Este e-mail reúne os dados da compra e tudo o que você precisa para entrar na comunidade Simulou Passou.',
              'Você tem um ano de acesso a partir da confirmação do pagamento. Ao vencer o prazo, o acesso ao conteúdo pago é encerrado automaticamente.',
              account.password?'Entre com seu e-mail e a senha provisória abaixo. Você pode escolher uma nova senha agora pelo link deste e-mail ou depois em Meu perfil → Alterar senha.':
                'Este e-mail já possui uma conta. Sua senha atual foi preservada. Se preferir, escolha outra senha pelo link deste e-mail ou em Meu perfil → Alterar senha.'],
            action:'Entrar na comunidade',link:baseUrl+'/#/entrar',
            secondary:{text:'Escolha uma nova senha se quiser. Este link é pessoal, de uso único e tem validade limitada. Se expirar, use Esqueci minha senha na tela de entrada.',label:'Redefinir minha senha agora',link:resetUrl}}),
        };
        encrypted=await rpc('sp_purchase_mail_snapshot',{p_order:order.id,p_claim:order.token,p_cipher:sealPurchaseMessage(message,order,serviceKey)});
      }
      const message=openPurchaseMessage(encrypted,order,serviceKey);
      const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
        headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json','Idempotency-Key':'sp-purchase-combined/'+order.id+'/g'+(order.generation||1)},body:JSON.stringify(message)});
      const sent=await response.json().catch(()=>null);
      if(!response.ok||typeof sent?.id!=='string')return 'resend_'+response.status;
      await rpc('sp_purchase_combined_record',{p_order:order.id,p_claim:order.token,p_id:sent.id});
      return null;
    }catch(error){return error.mailError||'purchase_access_or_mail_failed';}
  };
}

export function createMailAudit({rpc,fetchImpl=fetch,resendKey}){
  return async orderId=>{
    const order=await rpc('sp_purchase_mail_audit',{p_order:orderId});
    if(!order?.email)return {error:'order_unavailable'};
    const response=await fetchImpl('https://api.resend.com/emails?limit=100',{headers:{Authorization:'Bearer '+resendKey},signal:AbortSignal.timeout(10000)});
    if(!response.ok)return {error:'resend_read_'+response.status};
    const emails=(await response.json()).data||[];
    const matched=emails.filter(e=>e.to?.some(to=>to.toLowerCase()===order.email.toLowerCase()));
    for(const email of matched.filter(e=>[order.confirmationId,order.accessId,order.messageId].includes(e.id)))
      await rpc('sp_purchase_delivery_record',{p_order:orderId,p_id:email.id,p_status:email.last_event||'unknown'});
    return {emails:matched.map(e=>({id:e.id,to:e.to,subject:e.subject,createdAt:e.created_at,status:e.last_event})),
      confirmationId:order.confirmationId,accessId:order.accessId,messageId:order.messageId};
  };
}
