import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {createApp} from '../server.mjs';

test('prefixo mantém recursos e API dentro de /simulou-passou',async t=>{
  const app=createApp({dataFile:null,basePath:'/simulou-passou/'});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>app.server.close(resolve)));
  const origin='http://127.0.0.1:'+app.server.address().port;
  const redirect=await fetch(origin+'/simulou-passou?v=validacao',{redirect:'manual'});
  assert.equal(redirect.status,308);
  assert.equal(redirect.headers.get('location'),'/simulou-passou/?v=validacao');
  const page=await fetch(origin+'/simulou-passou/');
  const html=await page.text();
  assert.equal(page.status,200);
  for(const file of ['styles.css','mobile.css','app.js']){
    assert.ok(html.includes('"./'+file+'"'));
    assert.equal((await fetch(origin+'/simulou-passou/'+file)).status,200);
  }
  const bootstrap=await fetch(origin+'/simulou-passou/api/bootstrap');
  assert.equal(bootstrap.status,200);
  assert.equal((await bootstrap.json()).local,true);
  for(const path of ['/','/api/bootstrap','/app.js','/simulou-passou-extra/api/bootstrap']){
    assert.equal((await fetch(origin+path)).status,404,path);
  }
  const externalHostStatus=await new Promise((resolve,reject)=>{
    const req=request(origin+'/simulou-passou/api/auth/demo',{
      method:'POST',headers:{Host:'public.example','Content-Type':'application/json'}
    },res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
    req.on('error',reject);req.end('{}');
  });
  assert.equal(externalHostStatus,403);
});

test('prefixo inválido não inicia a aplicação',()=>{
  for(const basePath of ['//outro-dominio','/../','/simulou?','/simulou//passou',42]){
    assert.throws(()=>createApp({dataFile:null,basePath}),/Prefixo/);
  }
});
