const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
  const {PGlite}=await import('@electric-sql/pglite');
  const {createApp}=await import('../server.mjs'),{createCloudGateway}=await import('../cloud/gateway.mjs'),{seed}=await import('../seed.mjs');
  const db=new PGlite(),a='11111111-1111-4111-8111-111111111111',m='22222222-2222-4222-8222-222222222222';
  let browser,server;
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${a}'),('${m}');`);
    await db.exec(fs.readFileSync(path.join(__dirname,'../cloud/schema.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(__dirname,'../cloud/checkout.sql'),'utf8'));
    const data=seed(),catalog=Object.fromEntries(['preparations','questions','materials','quizzes'].map(k=>[k,data[k]]));
    await db.query('update simulou_passou_private.catalog set body=$1::jsonb',[JSON.stringify(catalog)]);
    execFileSync(process.execPath,[path.join(__dirname,'../cloud/build-pqo-import.mjs')]);
    const imported=fs.readFileSync(path.join(__dirname,'../dist/pqo-import.sql'),'utf8');
    await db.exec(imported);
    const rev=(await db.query('select revision from simulou_passou_private.catalog')).rows[0].revision;
    await db.exec(imported);
    assert.equal((await db.query('select revision from simulou_passou_private.catalog')).rows[0].revision,rev);
    await db.exec(`insert into simulou_passou_private.administrators(user_id) values('${m}');set role service_role;`);
    const secret='sandbox-webhook-testing-only-0000000';
    const checkoutId='sandbox-checkout-id',paymentId='pay_synthetic_2026';
    let checkoutCreates=0,providerStatus='PENDING';
    const fetchImpl=async(url,options)=>{
      const u=new URL(url),b=options.body?JSON.parse(options.body):{},token=options.headers.Authorization?.slice(7);
      const user=role=>({id:role==='admin'?m:a,email:role+'@example.test',user_metadata:{name:role},created_at:'2026-01-01T00:00:00Z'});
      const reply=(data,status=200)=>new Response(JSON.stringify(data),{status});
      if(u.origin==='https://api-sandbox.asaas.com'){
        assert.equal(options.headers.access_token,'sandbox-provider-test-only');
        if(u.pathname==='/v3/checkouts'){
          checkoutCreates++;
          assert.deepEqual(b.billingTypes,['PIX','CREDIT_CARD']);
          assert.equal(b.items[0].value,29.9);
          return reply({id:checkoutId});
        }
        if(u.pathname==='/v3/payments/'+paymentId)return reply({checkoutSession:checkoutId,status:providerStatus,value:29.9,billingType:'PIX'});
      }
      if(u.pathname==='/auth/v1/signup')return reply({user:user('student')});
      if(u.pathname==='/auth/v1/token'){const role=(b.email||b.refresh_token||'').includes('admin')?'admin':'student';return reply({access_token:'token-'+role,refresh_token:'refresh-'+role,user:user(role),expires_in:3600});}
      if(u.pathname==='/auth/v1/user'&&options.method==='PUT'){assert.equal(b.password,'NewSynthetic123!');return reply(user('student'));}
      if(u.pathname==='/auth/v1/user')return token==='token-admin'||token==='token-student'?reply(user(token.slice(6))):reply({},401);
      if(u.pathname==='/auth/v1/logout'||u.pathname==='/auth/v1/recover')return reply({});
      const name=u.pathname.split('/').at(-1),params={sp_runtime_load:['p_actor'],sp_runtime_commit:['p_actor','p_catalog_revision','p_catalog','p_members'],sp_module_access:['p_actor','p_user','p_active'],sp_checkout_claim:['p_actor','p_prep','p_mode'],sp_checkout_attach:['p_order','p_provider','p_url'],sp_checkout_event:['p_provider','p_mode','p_event','p_state','p_amount']}[name];
      if(!params)throw Error('Unknown mock endpoint');
      try{const result=await db.query(`select public.${name}(${params.map((_,i)=>'$'+(i+1)).join(',')}) as result`,params.map(k=>b[k]&&typeof b[k]==='object'?JSON.stringify(b[k]):b[k]));return reply(result.rows[0].result);}
      catch(e){return reply({code:e.code},e.code==='40001'?409:400);}
    };
    const staticApp=createApp({dataFile:null,basePath:'/simulou-passou'});let gateway;
    server=http.createServer(async(req,res)=>{
      if(!req.url.startsWith('/simulou-passou/api/'))return staticApp.handler(req,res);
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const r=await gateway(new Request('http://127.0.0.1:'+server.address().port+req.url,{method:req.method,headers:req.headers,body:chunks.length?Buffer.concat(chunks):undefined}));
      // Loopback-only QA harness: production keeps Secure cookies over HTTPS.
      const headers=Object.fromEntries(r.headers);headers['set-cookie']=r.headers.getSetCookie().map(s=>s.replace('; Secure;',';'));res.writeHead(r.status,headers);res.end(Buffer.from(await r.arrayBuffer()));
    });
    await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
    gateway=createCloudGateway({supabaseUrl:'https://db.example.test',serviceKey:'server-qa-only',publishableKey:'public-qa',allowedOrigins:[base],fetchImpl,checkoutConfig:{mode:'sandbox',apiKey:'sandbox-provider-test-only',webhookToken:secret}});
    const cloudRequest=(path,body,headers={})=>gateway(new Request(base+'/simulou-passou/api'+path,{method:body?'POST':'GET',headers:{origin:base,cookie:'sp_access=token-student',...headers},body:body?JSON.stringify(body):undefined}));
    assert.equal((await cloudRequest('/orders',{prepId:'pqo'})).status,503);
    await db.exec('update simulou_passou_private.settings set checkout_enabled=true where id;');
    const order=await (await cloudRequest('/orders',{prepId:'pqo'})).json();
    assert.match(order.url,/checkoutSession/);
    assert.deepEqual(await (await cloudRequest('/orders',{prepId:'pqo-risco'})).json(),order);
    assert.equal(checkoutCreates,1);
    const event={id:'qa-confirmed',event:'PAYMENT_CONFIRMED',payment:{id:paymentId}};
    assert.equal((await cloudRequest('/payments/asaas',event,{'asaas-access-token':'invalid'})).status,403);
    const notify=(body)=>cloudRequest('/payments/asaas',body,{origin:'https://asaas.example.test','asaas-access-token':secret});
    assert.equal((await notify(event)).status,200);
    assert.equal((await (await cloudRequest('/bootstrap')).json()).user.hasAccess,false);
    providerStatus='CONFIRMED';
    assert.equal((await notify(event)).status,200);
    assert.equal((await notify(event)).status,200);
    assert.equal((await (await cloudRequest('/bootstrap')).json()).user.hasAccess,true);
    assert.deepEqual(await (await cloudRequest('/orders',{prepId:'pqo-risco'})).json(),{owned:true});
    assert.equal((await cloudRequest('/attempts',{quizId:'pqo-treino-risco'})).status,200);
    providerStatus='REFUNDED';
    assert.equal((await notify({...event,id:'qa-refunded',event:'PAYMENT_REFUNDED'})).status,200);
    assert.equal((await (await cloudRequest('/bootstrap')).json()).user.hasAccess,false);
    await db.exec('update simulou_passou_private.settings set checkout_enabled=false where id;');
    browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));const nav=async(route,selector='h1:visible')=>{await page.goto(base+'/simulou-passou/#/'+route);await page.locator(selector).first().waitFor();};
    await nav('entrar');
    const password=page.getByLabel('Senha',{exact:true});
    await password.fill('Synthetic123!');
    await page.getByRole('button',{name:'Mostrar',exact:true}).click();
    assert.equal(await password.getAttribute('type'),'text');
    await page.getByRole('button',{name:'Ocultar',exact:true}).click();
    assert.equal(await password.getAttribute('type'),'password');
    await password.clear();
    await page.screenshot({path:path.join(__dirname,'../qa/pqo-login-mobile.png')});
    assert.equal(await page.locator('[data-action="demo-master"]').count(),0);assert.match(await page.locator('.local-bar').innerText(),/PRÉ-LANÇAMENTO/);
    await nav('recuperar');await page.getByLabel('E-mail',{exact:true}).fill('student@example.test');
    await page.getByRole('button',{name:'Enviar link de recuperação'}).click();
    await page.getByText(/Confira sua caixa de entrada/).waitFor();
    await page.goto(base+'/simulou-passou/#access_token=token-student&refresh_token=refresh-student&type=recovery');
    await page.getByLabel('Nova senha',{exact:true}).fill('NewSynthetic123!');
    await page.getByLabel('Confirme a nova senha',{exact:true}).fill('WrongSynthetic123!');
    await page.getByRole('button',{name:'Salvar nova senha'}).click();
    await page.getByText('As senhas não coincidem.').waitFor();
    await page.getByLabel('Confirme a nova senha',{exact:true}).fill('NewSynthetic123!');
    await page.getByRole('button',{name:'Salvar nova senha'}).click();
    await page.getByRole('heading',{name:'Entre na sua conta'}).waitFor();
    await nav('cadastro');await page.getByLabel('Seu nome',{exact:true}).fill('Pessoa de teste');await page.getByLabel('E-mail',{exact:true}).fill('student@example.test');await page.getByLabel('Senha',{exact:true}).fill('Synthetic123!');await page.getByRole('button',{name:'Criar conta',exact:true}).click();await page.getByText('Confira seu e-mail para confirmar o cadastro e depois entre na sua conta.',{exact:true}).waitFor();
    await nav('entrar');await page.getByLabel('E-mail',{exact:true}).fill('student@example.test');await page.getByLabel('Senha',{exact:true}).fill('Synthetic123!');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('.workspace-overview').waitFor();
    await nav('anotacoes','.notes-layout');await page.getByLabel('Título',{exact:true}).fill('Nota em nuvem');await page.getByLabel('Sua anotação',{exact:true}).fill('Persistência e isolamento verificados.');await page.getByRole('button',{name:'Salvar anotação',exact:false}).click();await page.locator('.note-list-item').waitFor();await page.reload();await page.locator('.note-list-item').waitFor();
    await nav('checkout','.checkout-grid');assert.equal(await page.locator('[data-action="confirm-payment"]').count(),0);assert.match(await page.locator('main').innerText(),/Compras ainda indisponíveis/);assert.equal(await page.locator('select[name=prep] option').count(),8);
    await page.evaluate(()=>document.activeElement?.blur());await nav('conta','.account-grid');assert.doesNotMatch(await page.locator('main').innerText(),/PRÉVIA LOCAL|dados locais|pagamentos são locais/);await page.locator('.app-header [data-action="menu"]').click();await page.locator('.sidebar [data-action="logout"]').click();await page.locator('.public-header').waitFor();
    await nav('entrar');await page.getByLabel('E-mail',{exact:true}).fill('admin@example.test');await page.getByLabel('Senha',{exact:true}).fill('Synthetic123!');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('.workspace-overview').waitFor();
    await nav('simulado/pqo-treino-operacoes');
    await page.locator('[data-action="start-quiz"]').click();
    await page.locator('.exam-shell').waitFor();
    await page.getByRole('button',{name:'Marcar para revisão',exact:true}).click();
    await page.getByRole('button',{name:'Riscar alternativa A'}).click();
    await page.evaluate(()=>{
      const prompt=document.querySelector('.question-prompt');
      const range=document.createRange();
      range.setStart(prompt.firstChild,0);
      range.setEnd(prompt.firstChild,12);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    });
    await page.getByRole('button',{name:'Marca-texto',exact:true}).click();
    await page.locator('.question-prompt mark').waitFor();
    await page.getByRole('button',{name:'Calculadora',exact:true}).click();
    await page.getByLabel('Períodos (n)',{exact:true}).fill('12');
    await page.getByLabel('Taxa por período (%)',{exact:true}).fill('1');
    await page.getByLabel('Valor presente (PV)',{exact:true}).fill('-1000');
    await page.getByRole('button',{name:'Calcular',exact:true}).click();
    assert.match(await page.locator('.exam-finance output').innerText(),/1.126,82503/);
    await page.getByText('Teclado RPN',{exact:true}).click();
    for(const key of ['9','ENTER','3','÷'])await page.getByRole('button',{name:key,exact:true}).click();
    assert.equal(await page.locator('[data-rpn-output]').innerText(),'3');
    await page.keyboard.press('Escape');
    await page.locator('.exam-option input').nth(1).check();
    await page.getByText('1/30 respondidas').waitFor();
    await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent.trim()==='Respostas salvas');
    await page.reload();
    await page.locator('.question-prompt mark').waitFor();
    assert.equal(await page.getByRole('button',{name:'Restaurar alternativa A'}).count(),1);
    await page.screenshot({path:path.join(__dirname,'../qa/pqo-simulado-mobile.png'),fullPage:true});
    for(const width of [320,390,1440]){
      await page.setViewportSize({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    }
    await page.screenshot({path:path.join(__dirname,'../qa/pqo-simulado-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Finalizar tentativa',exact:true}).click();
    await page.locator('.modal').getByRole('button',{name:'Finalizar tentativa',exact:true}).click();
    await page.locator('#only-errors').check();
    assert.equal(await page.locator('[data-review-correct="true"]:visible').count(),0);
    await nav('admin','.stats');assert.doesNotMatch(await page.locator('main').innerText(),/PRÉVIA LOCAL|Contas locais|pagamentos simulados|Perfil master de demonstração/);await nav('admin/pagamentos');assert.match(await page.locator('main').innerText(),/Vendas ainda não habilitadas/);await nav('admin/conteudo','.content-intake-grid');const qa=path.join(__dirname,'../qa');fs.mkdirSync(qa,{recursive:true});await page.screenshot({path:path.join(qa,'cloud-admin-mobile.png'),fullPage:true});
    await nav('anotacoes','.notes-layout');assert.equal(await page.locator('.note-list-item').count(),0);
    for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});for(const route of ['inicio','admin/conteudo','simulados']){await nav(route);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}}
    assert.deepEqual(errors,[]);console.log('CLOUD BROWSER QA PASSED: real PostgreSQL schema, Auth stub, registration, secure-session adapter, notes, isolated administration, disabled checkout, mobile/desktop.');
  }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
