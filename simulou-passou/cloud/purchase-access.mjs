import {createHmac} from 'node:crypto';

export function createPurchaseAccess({supa,rpc,serviceKey}){
  const temporary=id=>'Sp9!'+createHmac('sha256',serviceKey).update('sp-purchase-password-v1:'+id).digest('base64url').slice(0,24);
  return async order=>{
    let account=await rpc('sp_purchase_access',{p_order:order.id,p_claim:order.token});
    if(account.create){
      if(!account.provisional)throw new Error('Another purchase is provisioning this account');
      try{
        await supa('/auth/v1/admin/users',{method:'POST',body:{
          id:account.userId,email:account.authEmail||account.email,password:temporary(account.userId),email_confirm:true,
          user_metadata:{name:account.name},app_metadata:{product_origin:'simulou-passou'},
        }});
      }catch(error){
        if(![400,422].includes(error.status))throw error;
        // A retry or a concurrent signup can legitimately have created the account already.
      }
      account=await rpc('sp_purchase_access',{p_order:order.id,p_claim:order.token});
      if(account.create)throw new Error('Account creation not confirmed');
    }
    return {...account,password:account.provisional?temporary(account.userId):null};
  };
}
