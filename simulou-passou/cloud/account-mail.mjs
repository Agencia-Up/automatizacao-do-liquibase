const escapeHtml=value=>String(value).replace(/[&<>"']/g,character=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
})[character]);

export const recoveryKeyPattern=/^[A-Za-z0-9_-]{32,160}$/;

function accountEmail({baseUrl,resetUrl,access,name}){
  const subject=access?'Simulou Passou: defina sua senha de acesso':'Simulou Passou: redefinição de senha';
  const title=access?'Defina sua senha de acesso':'Redefina sua senha';
  const greeting=name?'Olá, '+name+'.':'Olá!';
  const details=access
    ? 'O suporte liberou o acesso à sua conta do Simulou Passou. Use este link para escolher uma senha e entrar na plataforma.'
    : 'Foi solicitada uma nova senha para sua conta do Simulou Passou. Use este link para escolher a nova senha.';
  const action='Definir nova senha';
  const note=access?'O link é pessoal, de uso único e tem validade limitada.':'O link é de uso único e tem validade limitada. Se você não solicitou a redefinição, ignore este e-mail.';
  const url=escapeHtml(resetUrl);
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f4f4ee;color:#19363a;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4ee"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #dce4da;border-radius:14px">
  <tr><td style="padding:24px 28px;background:#17383f;border-radius:13px 13px 0 0">
  <img src="${escapeHtml(baseUrl)}/simulou-passou-logo.png" width="228" height="56" alt="Simulou Passou" style="display:block;max-width:100%;height:auto;color:#fff;font-size:22px;font-weight:bold">
  </td></tr><tr><td style="padding:28px">
  <h1 style="margin:0 0 18px;font:normal 30px/1.16 Georgia,serif">${title}</h1>
  <p style="margin:0 0 8px;font-size:15px;line-height:1.6">${escapeHtml(greeting)}</p>
  <p style="margin:0 0 22px;font-size:15px;line-height:1.6">${details}</p>
  <table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#f4d48b" style="border-radius:7px">
  <a href="${url}" style="display:inline-block;padding:14px 20px;color:#17383f;font-size:15px;font-weight:bold;text-decoration:none">${action}</a>
  </td></tr></table>
  <p style="margin:20px 0 0;color:#4c6258;font-size:12px;line-height:1.6">${note}</p>
  </td></tr><tr><td style="padding:16px 28px;background:#eef2ec;border-radius:0 0 13px 13px;color:#40574e;font-size:12px;line-height:1.6">Simulou Passou · Logos IA<br>suporte@logosiabrasil.com</td></tr>
  </table></td></tr></table></body></html>`;
  return {subject,html,text:`${greeting}\n\n${title}\n\n${details}\n\n${action}: ${resetUrl}\n\n${note}\n\nSimulou Passou · Logos IA`};
}

export function createAccountMail({supa,fetchImpl=fetch,baseUrl,resendKey,fault}){
  return async ({email,access=false,name=''})=>{
    const generated=await supa('/auth/v1/admin/generate_link',{
      method:'POST',body:{type:'recovery',email,redirect_to:baseUrl+'/'},
    });
    const key=generated.hashed_token||generated.properties?.hashed_token;
    if(!recoveryKeyPattern.test(key||''))throw fault(503,'O link de recuperação não pôde ser gerado.');
    const resetUrl=baseUrl+'/#/redefinir?'+new URLSearchParams({chave:key});
    const response=await fetchImpl('https://api.resend.com/emails',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
      headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json'},
      body:JSON.stringify({
        from:'Simulou Passou <suporte@logosiabrasil.com>',to:[email],reply_to:'suporte@logosiabrasil.com',
        headers:{'Auto-Submitted':'auto-generated'},
        tags:[{name:'project',value:'simulou-passou'},{name:'message_type',value:access?'account-access':'password-reset'}],
        ...accountEmail({baseUrl,resetUrl,access,name}),
      }),
    });
    const sent=await response.json().catch(()=>null);
    if(!response.ok||typeof sent?.id!=='string')throw fault(503,'O serviço de e-mail não confirmou o envio.');
    return sent.id;
  };
}
