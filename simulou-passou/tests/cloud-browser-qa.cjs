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
    const data=seed(),catalog=Object.fromEntries(['preparations','questions','materials','quizzes'].map(k=>[k,data[k]]));
    await db.query('update simulou_passou_private.catalog set body=$1::jsonb',[JSON.stringify(catalog)]);
    await db.exec(`insert into simulou_passou_private.administrators(user_id) values('${m}');set role service_role;`);
    const fetchImpl=async(url,options)=>{
      const u=new URL(url),b=options.body?JSON.parse(options.body):{},token=options.headers.Authorization.slice(7);
      const user=role=>({id:role==='admin'?m:a,email:role+'@example.test',user_metadata:{name:role},created_at:'2026-01-01T00:00:00Z'});
      const reply=(data,status=200)=>new Response(JSON.stringify(data),{status});
      if(u.pathname==='/auth/v1/signup')return reply({user:user('student')});
      if(u.pathname==='/auth/v1/token'){const role=b.email.startsWith('admin')?'admin':'student';return reply({access_token:'token-'+role,refresh_token:'refresh-'+role,user:user(role),expires_in:3600});}
      if(u.pathname==='/auth/v1/user')return token==='token-admin'||token==='token-student'?reply(user(token.slice(6))):reply({},401);
      if(u.pathname==='/auth/v1/logout'||u.pathname==='/auth/v1/recover')return reply({});
      const name=u.pathname.split('/').at(-1),params={sp_runtime_load:['p_actor'],sp_runtime_commit:['p_actor','p_catalog_revision','p_catalog','p_members'],sp_module_access:['p_actor','p_user','p_active']}[name];
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
    gateway=createCloudGateway({supabaseUrl:'https://db.example.test',serviceKey:'server-qa-only',publishableKey:'public-qa',allowedOrigins:[base],fetchImpl});
    browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));const nav=async(route,selector='h1:visible')=>{await page.goto(base+'/simulou-passou/#/'+route);await page.locator(selector).first().waitFor();};
    await nav('entrar');assert.equal(await page.locator('[data-action="demo-master"]').count(),0);assert.match(await page.locator('.local-bar').innerText(),/PRÉ-LANÇAMENTO/);
    await nav('cadastro');await page.getByLabel('Seu nome',{exact:true}).fill('Pessoa de teste');await page.getByLabel('E-mail',{exact:true}).fill('student@example.test');await page.getByLabel('Senha',{exact:true}).fill('Synthetic123!');await page.getByRole('button',{name:'Criar minha conta',exact:false}).click();await page.getByText('Confira seu e-mail para confirmar o cadastro e depois entre na sua conta.',{exact:true}).waitFor();
    await nav('entrar');await page.getByLabel('E-mail',{exact:true}).fill('student@example.test');await page.getByLabel('Senha',{exact:true}).fill('Synthetic123!');await page.getByRole('button',{name:'Entrar na minha conta',exact:false}).click();await page.locator('.workspace-overview').waitFor();
    await nav('anotacoes','.notes-layout');await page.getByLabel('Título',{exact:true}).fill('Nota em nuvem');await page.getByLabel('Sua anotação',{exact:true}).fill('Persistência e isolamento verificados.');await page.getByRole('button',{name:'Salvar anotação',exact:false}).click();await page.locator('.note-list-item').waitFor();await page.reload();await page.locator('.note-list-item').waitFor();
    await nav('checkout','.checkout-grid');assert.equal(await page.locator('[data-action="confirm-payment"]').count(),0);assert.match(await page.locator('main').innerText(),/vendas ainda não estão habilitadas/);
    await page.evaluate(()=>document.activeElement?.blur());await nav('conta','.account-grid');assert.doesNotMatch(await page.locator('main').innerText(),/PRÉVIA LOCAL|dados locais|pagamentos são locais/);await page.locator('.app-header [data-action="menu"]').click();await page.locator('.sidebar [data-action="logout"]').click();await page.locator('.public-header').waitFor();
    await nav('entrar');await page.getByLabel('E-mail',{exact:true}).fill('admin@example.test');await page.getByLabel('Senha',{exact:true}).fill('Synthetic123!');await page.getByRole('button',{name:'Entrar na minha conta',exact:false}).click();await page.locator('.workspace-overview').waitFor();
    await nav('admin','.stats');assert.doesNotMatch(await page.locator('main').innerText(),/PRÉVIA LOCAL|Contas locais|pagamentos simulados/);await nav('admin/pagamentos');assert.match(await page.locator('main').innerText(),/Vendas ainda não habilitadas/);await nav('admin/conteudo','.content-intake-grid');const qa=path.join(__dirname,'../qa');fs.mkdirSync(qa,{recursive:true});await page.screenshot({path:path.join(qa,'cloud-admin-mobile.png'),fullPage:true});
    await nav('anotacoes','.notes-layout');assert.equal(await page.locator('.note-list-item').count(),0);
    for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});for(const route of ['inicio','admin/conteudo','simulados']){await nav(route);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}}
    assert.deepEqual(errors,[]);console.log('CLOUD BROWSER QA PASSED: real PostgreSQL schema, Auth stub, registration, secure-session adapter, notes, isolated administration, disabled checkout, mobile/desktop.');
  }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
