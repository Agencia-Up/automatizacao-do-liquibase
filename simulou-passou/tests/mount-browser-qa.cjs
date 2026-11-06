const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
  const {createApp}=await import('../server.mjs');
  const app=createApp({dataFile:null,basePath:'/simulou-passou'});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+app.server.address().port;
  const failures=[];let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    for(const width of [390,1440]){
      const context=await browser.newContext({viewport:{width,height:900}});
      const page=await context.newPage();
      page.on('pageerror',e=>failures.push(e.message));
      page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)failures.push(r.status()+' '+r.url());});
      await page.goto(origin+'/simulou-passou?validacao=prefixo');
      await page.getByRole('link',{name:/Simulou Passou — início/}).first().waitFor();
      assert.ok(page.url().startsWith(origin+'/simulou-passou/'));
      await page.goto(origin+'/simulou-passou/#/entrar');
      await page.getByRole('button',{name:'Explorar como aluno'}).click();
      await page.waitForURL('**/#/inicio');
      await page.getByRole('heading',{name:/Seu próximo passo|Seu painel|Bom|Olá|Vamos|Tudo começa|Sua preparação/}).first().waitFor({timeout:10000}).catch(async()=>{
        assert.ok((await page.locator('body').innerText()).includes('Meu painel'));
      });
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const state=await context.request.get(origin+'/simulou-passou/api/bootstrap');
      assert.equal((await state.json()).user.role,'student');
      await context.close();
    }
    assert.deepEqual(failures,[]);
    console.log('Prefixo validado no navegador em 390 e 1440 px, com login e API no mesmo caminho.');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>app.server.close(resolve));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
