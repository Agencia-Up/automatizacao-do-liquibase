const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
  const {PGlite}=await import('@electric-sql/pglite');
  const {createApp}=await import('../server.mjs'),{createCloudGateway}=await import('../cloud/gateway.mjs'),{seed}=await import('../seed.mjs');
  const {pqoCatalog}=await import('../pqo-catalog.mjs');
  const db=new PGlite(),a='11111111-1111-4111-8111-111111111111',m='22222222-2222-4222-8222-222222222222';
  let browser,server;
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${a}'),('${m}');`);
    await db.exec(fs.readFileSync(path.join(__dirname,'../cloud/schema.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(__dirname,'../cloud/checkout.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(__dirname,'../cloud/checkout-offers.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(__dirname,'../cloud/checkout-provider.sql'),'utf8'));
    const data=seed(),catalog=Object.fromEntries(['preparations','questions','materials','quizzes'].map(k=>[k,data[k]]));
    await db.query('update simulou_passou_private.catalog set body=$1::jsonb',[JSON.stringify(catalog)]);
    const practice=pqoCatalog({practice:true});
    await db.query("update simulou_passou_private.catalog set body=jsonb_set(jsonb_set(jsonb_set(body,'{preparations}',(body->'preparations')||($1::jsonb->'preparations')),'{questions}',(body->'questions')||($1::jsonb->'questions')),'{quizzes}',(body->'quizzes')||($1::jsonb->'quizzes'))",[JSON.stringify({...practice,preparations:practice.preparations.filter(p=>p.id!=='pqo')})]);
    execFileSync(process.execPath,[path.join(__dirname,'../cloud/build-pqo-import.mjs'),'pqo']);
    const upgrade=fs.readFileSync(path.join(__dirname,'../dist/pqo-upgrade-pqo.sql'),'utf8');
    await db.exec(upgrade);
    const beforeFullImport=(await db.query("select (q->>'durationMinutes')::int minutes, jsonb_array_length(q->'questionIds') questions from simulou_passou_private.catalog cross join lateral jsonb_array_elements(body->'quizzes') q where q->>'id'='pqo-treino-operacoes'")).rows;
    assert.deepEqual(beforeFullImport,[{minutes:180,questions:60}]);
    execFileSync(process.execPath,[path.join(__dirname,'../cloud/build-pqo-import.mjs')]);
    const imported=fs.readFileSync(path.join(__dirname,'../dist/pqo-import.sql'),'utf8');
    await db.exec(imported);
    const rev=(await db.query('select revision from simulou_passou_private.catalog')).rows[0].revision;
    await db.exec(imported);
    assert.equal((await db.query('select revision from simulou_passou_private.catalog')).rows[0].revision,rev);
    await db.exec(`insert into simulou_passou_private.administrators(user_id) values('${m}');set role service_role;`);
    const secret='sandbox-webhook-testing-only-0000000';
    const payments=new Map();
    const checkoutCases=[
      {id:'pay_synthetic_pix',offer:'module',value:29.9,billingType:'PIX'},
      {id:'pay_synthetic_card',offer:'all',value:49.9,billingType:'CREDIT_CARD'},
      {id:'pay_synthetic_card_module',offer:'module',value:29.9,billingType:'CREDIT_CARD'},
      {id:'pay_synthetic_pix_all',offer:'all',value:49.9,billingType:'PIX'},
    ];
    let checkoutCreates=0, checkoutLookups=0;
    const fetchImpl=async(url,options)=>{
      const u=new URL(url),b=options.body?JSON.parse(options.body):{},token=options.headers.Authorization?.slice(7);
      const user=role=>({id:role==='admin'?m:a,email:role+'@example.test',user_metadata:{name:role},created_at:'2026-01-01T00:00:00Z'});
      const reply=(data,status=200)=>new Response(JSON.stringify(data),{status});
      if(u.origin==='https://api-sandbox.asaas.com'){
        assert.equal(options.headers.access_token,'sandbox-provider-test-only');
        if(u.pathname==='/v3/checkouts'){
          checkoutCreates++;
          const checkoutId='sandbox-checkout-'+checkoutCreates;
          assert.deepEqual(b.billingTypes,['PIX','CREDIT_CARD']);
          const {id,offer,value,billingType}=checkoutCases[checkoutCreates-1];
          assert.equal(b.items[0].value,value);
          assert.match(b.items[0].name,offer==='all'?/Todos os módulos/:/Operações/);
          payments.set(id,{checkoutSession:checkoutId,status:'PENDING',value,billingType});
          return reply({id:checkoutId});
        }
        if(u.pathname.startsWith('/v3/payments/'))return reply(payments.get(u.pathname.split('/').at(-1)));
        if(u.pathname==='/v3/payments'){
          checkoutLookups++;
          return reply({data:[...payments.values()].filter(payment=>payment.checkoutSession===u.searchParams.get('checkoutSession'))});
        }
      }
      if(u.pathname==='/auth/v1/signup')return reply({user:user('student')});
      if(u.pathname==='/auth/v1/token'){const role=(b.email||b.refresh_token||'').includes('admin')?'admin':'student';return reply({access_token:'token-'+role,refresh_token:'refresh-'+role,user:user(role),expires_in:3600});}
      if(u.pathname==='/auth/v1/user'&&options.method==='PUT'){assert.equal(b.password,'NewSynthetic123!');return reply(user('student'));}
      if(u.pathname==='/auth/v1/user')return token==='token-admin'||token==='token-student'?reply(user(token.slice(6))):reply({},401);
      if(u.pathname==='/auth/v1/logout'||u.pathname==='/auth/v1/recover')return reply({});
      const name=u.pathname.split('/').at(-1),params={sp_runtime_load:['p_actor'],sp_runtime_commit:['p_actor','p_catalog_revision','p_catalog','p_members'],sp_module_access:['p_actor','p_user','p_active'],sp_checkout_claim_offer:['p_actor','p_prep','p_mode','p_offer'],sp_checkout_attach:['p_order','p_provider','p_url'],sp_checkout_event:['p_provider','p_mode','p_event','p_state','p_amount'],sp_checkout_known:['p_provider','p_mode']}[name];
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
    let timeShift=0;
    gateway=createCloudGateway({supabaseUrl:'https://db.example.test',serviceKey:'server-qa-only',publishableKey:'public-qa',allowedOrigins:[base],fetchImpl,now:()=>Date.now()+timeShift,checkoutConfig:{mode:'sandbox',apiKey:'sandbox-provider-test-only',webhookToken:secret}});
    const cloudRequest=(path,body,headers={})=>gateway(new Request(base+'/simulou-passou/api'+path,{method:body?'POST':'GET',headers:{origin:base,cookie:'sp_access=token-student',...headers},body:body?JSON.stringify(body):undefined}));
    assert.equal((await cloudRequest('/orders',{prepId:'pqo',offer:'module'})).status,503);
    await db.exec('update simulou_passou_private.settings set checkout_enabled=true where id;');
    const order=await (await cloudRequest('/orders',{prepId:'pqo',offer:'module',amount:1})).json();
    assert.match(order.url,/checkoutSession/);
    assert.deepEqual(await (await cloudRequest('/orders',{prepId:'pqo',offer:'module'})).json(),order);
    assert.equal((await cloudRequest('/orders',{prepId:'pqo-risco',offer:'module'})).status,409);
    assert.equal((await cloudRequest('/orders',{prepId:'pqo',offer:'all'})).status,409);
    assert.equal(checkoutCreates,1);
    const event={id:'qa-confirmed',event:'PAYMENT_CONFIRMED',payment:{id:'pay_synthetic_pix'}};
    assert.equal((await cloudRequest('/payments/asaas',event,{'asaas-access-token':'invalid'})).status,403);
    const notify=(body)=>cloudRequest('/payments/asaas',body,{origin:'https://asaas.example.test','asaas-access-token':secret});
    assert.equal((await notify({id:'qa-unrelated',event:'CHECKOUT_PAID',checkout:{id:'outside-simulou-passou'}})).status,200);
    assert.equal(checkoutLookups,0);
    const currentUser=async()=> (await (await cloudRequest('/bootstrap')).json()).user;
    assert.equal((await notify(event)).status,200);
    assert.equal((await currentUser()).hasAccess,false);
    const pix=payments.get('pay_synthetic_pix');
    pix.status='RECEIVED';
    assert.equal((await notify(event)).status,200);
    assert.equal((await notify(event)).status,200);
    const moduleUser=await currentUser();
    assert.equal(moduleUser.hasAccess,true);
    assert.equal(moduleUser.allModules,false);
    assert.deepEqual(moduleUser.moduleIds,['pqo']);
    assert.deepEqual(await (await cloudRequest('/orders',{prepId:'pqo',offer:'module'})).json(),{owned:true});
    const catalogInfo=await (await cloudRequest('/bootstrap')).json();
    const operationsQuiz=catalogInfo.quizzes.find(q=>q.prepId==='pqo').id;
    assert.equal((await cloudRequest('/attempts',{quizId:operationsQuiz})).status,200);
    assert.equal((await cloudRequest('/attempts',{quizId:'pqo-treino-risco'})).status,403);

    const cardOrder=await (await cloudRequest('/orders',{prepId:'pqo-risco',offer:'all',amount:1})).json();
    assert.match(cardOrder.url,/checkoutSession/);
    assert.notEqual(cardOrder.url,order.url);
    assert.equal(checkoutCreates,2);
    const cardEvent={...event,id:'qa-card-confirmed',payment:{id:'pay_synthetic_card'}};
    const card=payments.get('pay_synthetic_card');
    assert.equal((await notify(cardEvent)).status,200);
    assert.equal((await currentUser()).allModules,false);
    card.status='CONFIRMED';
    card.value=29.9;
    assert.equal((await notify(cardEvent)).status,400);
    assert.equal((await currentUser()).allModules,false);
    card.value=49.9;
    assert.equal((await notify(cardEvent)).status,200);
    assert.equal((await currentUser()).allModules,true);
    assert.equal(catalogInfo.quizzes.length,8);
    let otherAttempt;
    for(const quiz of catalogInfo.quizzes){
      const attempt=await cloudRequest('/attempts',{quizId:quiz.id});
      assert.equal(attempt.status,200,quiz.name);
      const started=await attempt.json();
      assert.ok(started.id);
      if(quiz.id==='pqo-treino-risco')otherAttempt=started;
    }
    for(const material of catalogInfo.materials){
      assert.equal((await cloudRequest('/materials/'+material.id)).status,200,material.title);
    }
    card.status='CHARGEBACK_REQUESTED';
    assert.equal((await notify({...cardEvent,id:'qa-card-chargeback',event:'PAYMENT_CHARGEBACK_REQUESTED'})).status,200);
    assert.equal((await currentUser()).allModules,false);
    assert.equal((await currentUser()).hasAccess,true);
    assert.equal((await cloudRequest('/attempts/'+otherAttempt.id)).status,403);
    pix.status='REFUNDED';
    assert.equal((await notify({...event,id:'qa-refunded',event:'PAYMENT_REFUNDED'})).status,200);
    assert.equal((await currentUser()).hasAccess,false);
    for(const {id,offer,billingType} of checkoutCases.slice(2)){
      const created=await cloudRequest('/orders',{prepId:'pqo',offer});
      assert.equal(created.status,200);
      assert.match((await created.json()).url,/checkoutSession/);
      const payment=payments.get(id);
      const bySession=billingType==='PIX';
      const confirmation=bySession
        ?{id:id+'_confirmed',event:'CHECKOUT_PAID',checkout:{id:payment.checkoutSession}}
        :{id:id+'_confirmed',event:'PAYMENT_CONFIRMED',payment:{id,checkoutSession:payment.checkoutSession}};
      assert.equal((await notify(confirmation)).status,bySession?503:200);
      assert.equal((await currentUser()).hasAccess,false);
      payment.status=billingType==='PIX'?'RECEIVED':'CONFIRMED';
      assert.equal((await notify(confirmation)).status,200);
      const buyer=await currentUser();
      assert.equal(buyer.hasAccess,true);
      assert.equal(buyer.allModules,offer==='all');
      assert.deepEqual(buyer.moduleIds,offer==='module'?['pqo']:[]);
      assert.equal((await cloudRequest('/attempts',{quizId:'pqo-treino-risco'})).status,offer==='all'?200:403);
      payment.status='REFUNDED';
      assert.equal((await notify({id:id+'_refunded',event:'PAYMENT_REFUNDED',payment:{id,checkoutSession:payment.checkoutSession}})).status,200);
      assert.equal((await currentUser()).hasAccess,false);
    }
    assert.equal(checkoutCreates,checkoutCases.length);
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
    await nav('checkout?offer=all','.pricing-grid');
    assert.equal(await page.locator('[data-action="confirm-payment"]').count(),0);
    assert.match(await page.locator('main').innerText(),/Compras ainda indisponíveis/);
    assert.equal(await page.locator('select[name=prep] option').count(),8);
    assert.equal(await page.locator('.pricing-card--all.is-selected').count(),1);
    const verifyPlanLayout=async()=>{
      for(const width of [320,390,1440]){
        await page.setViewportSize({width,height:900});
        const layout=await page.locator('.pricing-grid').evaluate(grid=>{
          const [left,right]=[...grid.children].map(card=>card.getBoundingClientRect());
          const prices=[...grid.querySelectorAll('.pricing-price')];
          const buttons=[...grid.querySelectorAll('.pricing-cta')].map(el=>el.getBoundingClientRect());
          return {sameRow:left.y===right.y&&left.right<right.left,
            pricesAligned:prices[0].getBoundingClientRect().y===prices[1].getBoundingClientRect().y,
            fits:document.documentElement.scrollWidth<=innerWidth+1&&prices.every(el=>el.scrollWidth<=el.clientWidth+1),
            buttonsAligned:buttons.length===2&&buttons[0].bottom===buttons[1].bottom};
        });
        assert.deepEqual(layout,{sameRow:true,pricesAligned:true,fits:true,buttonsAligned:true},'Planos em '+width+' px');
      }
    };
    await db.exec('update simulou_passou_private.settings set checkout_enabled=true where id;');
    await nav('','.pricing-grid');
    await page.reload();
    await page.locator('.pricing-grid').waitFor();
    await verifyPlanLayout();
    await page.getByLabel('Qual módulo?').selectOption('pqo-custodia');
    const preview=page.locator('#conteudo-individual [data-plan-module]:visible');
    assert.match(await preview.innerText(),/Custódia · Simulado de certificação/);
    assert.match(await preview.innerText(),/Guia oficial e manual do PQO/);
    assert.match(await page.getByRole('link',{name:'Escolher módulo',exact:true}).getAttribute('href'),/prep=pqo-custodia/);
    const bundle=page.locator('#conteudo-pacote');
    assert.equal(await bundle.locator('.pricing-track').count(),8);
    assert.match(await bundle.innerText(),/Treino de cadastro/);
    await page.getByRole('link',{name:'Escolher pacote',exact:true}).click();
    await page.getByRole('heading',{name:'Escolha seu acesso',exact:true,level:1}).waitFor();
    const individual=page.getByRole('article',{name:'Um módulo',exact:true});
    const packageAll=page.getByRole('article',{name:'Todos os módulos',exact:true});
    assert.match(await individual.innerText(),/29,90/);
    assert.match(await packageAll.innerText(),/49,90/);
    await individual.getByRole('button',{name:'Comprar módulo'}).waitFor();
    await packageAll.getByRole('button',{name:'Comprar pacote'}).waitFor();
    await verifyPlanLayout();
    await page.screenshot({path:path.join(__dirname,'../qa/planos-checkout-desktop.png')});
    await bundle.screenshot({path:path.join(__dirname,'../qa/planos-conteudo-pacote.png')});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(__dirname,'../qa/planos-checkout-mobile.png')});
    const purchaseRequests=[];
    await page.route('**/api/orders',async route=>{
      assert.equal(route.request().method(),'POST');
      purchaseRequests.push(route.request().postDataJSON());
      await route.fulfill({status:400,json:{error:'Pedido interceptado pela verificação local.'}});
    });
    await page.getByLabel('Qual módulo?').selectOption('pqo-risco');
    await page.waitForURL('**/checkout?offer=module&prep=pqo-risco');
    await preview.getByRole('heading',{name:'Risco',exact:true}).waitFor();
    await individual.getByRole('button',{name:'Comprar módulo'}).click();
    await individual.getByRole('alert').filter({hasText:'Pedido interceptado'}).waitFor();
    await packageAll.getByRole('button',{name:'Comprar pacote'}).click();
    await packageAll.getByRole('alert').filter({hasText:'Pedido interceptado'}).waitFor();
    assert.deepEqual(purchaseRequests,[{prepId:'pqo-risco',offer:'module'},{prepId:'pqo-risco',offer:'all'}]);
    assert.equal(checkoutCreates,checkoutCases.length);
    await page.unroute('**/api/orders');
    const guest=await browser.newPage({viewport:{width:390,height:844}});
    try{
      await guest.goto(base+'/simulou-passou/#/checkout?offer=all');
      await guest.getByRole('button',{name:'Comprar pacote'}).click();
      await guest.getByRole('heading',{name:'Entre na sua conta'}).waitFor();
      await guest.getByLabel('E-mail',{exact:true}).fill('student@example.test');
      await guest.getByLabel('Senha',{exact:true}).fill('Synthetic123!');
      await guest.getByRole('button',{name:'Entrar',exact:true}).click();
      await guest.locator('.pricing-card--all.is-selected').getByRole('button',{name:'Comprar pacote'}).waitFor();
      assert.equal(checkoutCreates,checkoutCases.length);
    }finally{await guest.close();}
    await db.exec('update simulou_passou_private.settings set checkout_enabled=false where id;');
    await page.evaluate(()=>document.activeElement?.blur());await nav('conta','.account-grid');assert.doesNotMatch(await page.locator('main').innerText(),/PRÉVIA LOCAL|dados locais|pagamentos são locais/);await page.locator('.app-header [data-action="menu"]').click();await page.locator('.sidebar [data-action="logout"]').click();await page.locator('.public-header').waitFor();
    await nav('entrar');await page.getByLabel('E-mail',{exact:true}).fill('admin@example.test');await page.getByLabel('Senha',{exact:true}).fill('Synthetic123!');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('.workspace-overview').waitFor();
    await nav('simulado/pqo-treino-operacoes');
    await page.getByText('180 minutos a partir do início').waitFor();
    const opening=page.waitForResponse(r=>r.url().endsWith('/api/attempts')&&r.request().method()==='POST');
    await page.locator('[data-action="start-quiz"]').click();
    const opened=await opening;
    assert.equal(opened.status(),200,opened.ok()?undefined:await opened.text());
    const activeExam=await opened.json();
    assert.equal(activeExam.questions.length,60);
    assert.ok(activeExam.questions.every(q=>!('correct' in q)&&!('explanation' in q)));
    await page.locator('.exam-shell').waitFor({timeout:8000}).catch(async error=>{
      throw new Error((await page.locator('main').innerText()).slice(0,800)+' | '+errors.join('; '),{cause:error});
    });
    await page.locator('#timer').filter({hasText:/^0[23]:[05][09]:/}).waitFor();
    assert.equal(await page.locator('.question-map button').count(),60);
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
    const full=pqoCatalog(),firstId=full.quizzes.find(q=>q.id==='pqo-treino-operacoes').questionIds[0],first=full.questions.find(q=>q.id===firstId);
    const wrong=[1,2,3].find(i=>String(i)!==first.correct);
    await page.locator('.exam-option input').nth(wrong).check();
    await page.getByText('1/60 respondidas').waitFor();
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
    const missed=page.locator('.review-item').first();
    assert.match(await missed.innerText(),/Incorreta/);
    assert.ok((await missed.innerText()).includes(first.options[wrong]));
    assert.ok((await missed.innerText()).includes(first.explanation));
    await page.getByText('Por onde revisar:').waitFor();
    await nav('simulado/pqo-treino-operacoes');
    await page.clock.install();
    await page.locator('[data-action="start-quiz"]').click();
    await page.locator('.exam-shell').waitFor();
    await page.locator('.exam-option input').nth(Number(first.correct)).check();
    await page.waitForFunction(()=>document.querySelector('#save-state')?.textContent.trim()==='Respostas salvas');
    timeShift=180*60000+2000;
    await page.clock.fastForward(180*60000+3000);
    await page.getByText('Tempo esgotado. Foram corrigidas as respostas recebidas até o prazo.').waitFor();
    const expired=await page.evaluate(async()=>await (await fetch('./api/attempts/'+location.hash.split('/').at(-1))).json());
    assert.equal(expired.finishReason,'timeout');
    assert.equal(expired.elapsedSeconds,10800);
    assert.equal(expired.result.correct,1);
    assert.equal(expired.result.blank,59);
    const late=await page.evaluate(async id=>(await fetch('./api/attempts/'+id+'/save',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,expired.id);
    assert.equal(late,409);
    timeShift=0;
    await nav('admin','.stats');assert.doesNotMatch(await page.locator('main').innerText(),/PRÉVIA LOCAL|Contas locais|pagamentos simulados|Perfil master de demonstração/);await nav('admin/pagamentos');assert.match(await page.locator('main').innerText(),/Vendas ainda não habilitadas/);await nav('admin/conteudo','.content-intake-grid');const qa=path.join(__dirname,'../qa');fs.mkdirSync(qa,{recursive:true});await page.screenshot({path:path.join(qa,'cloud-admin-mobile.png'),fullPage:true});
    await nav('anotacoes','.notes-layout');assert.equal(await page.locator('.note-list-item').count(),0);
    for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});for(const route of ['inicio','admin/conteudo','simulados']){await nav(route);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}}
    assert.deepEqual(errors,[]);console.log('CLOUD BROWSER QA PASSED: real PostgreSQL schema, Auth stub, registration, secure-session adapter, notes, isolated administration, disabled checkout, mobile/desktop.');
  }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
