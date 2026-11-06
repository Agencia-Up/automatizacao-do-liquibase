const {createRequire}=require('node:module');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
  const {createApp}=await import('../server.mjs');const app=createApp({dataFile:null});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+app.server.address().port;
  const qa=path.resolve(__dirname,'../qa');fs.mkdirSync(qa,{recursive:true});
  let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    const page=await context.newPage();const errors=[];const overflow=[];
    page.on('pageerror',e=>errors.push(e.message));
    const nav=async(route,selector='h1:visible')=>{await page.goto(origin+'/#/'+route);await page.locator(selector).first().waitFor();await page.waitForTimeout(120);};
    const shot=async name=>{await page.waitForTimeout(300);return page.screenshot({path:path.join(qa,name+'.png'),fullPage:true});};
    await nav('');await shot('01-vendas-desktop');
    await page.setViewportSize({width:390,height:844});await shot('02-vendas-celular');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.setViewportSize({width:1440,height:1000});
    await nav('cadastro');await page.getByLabel('Seu nome',{exact:true}).fill('Sofia · teste de interface');await page.getByLabel('E-mail',{exact:true}).fill('sofia@teste.local');await page.getByLabel('Senha',{exact:true}).fill('ValidacaoLocal123!');
    await page.getByRole('button',{name:'Criar minha conta',exact:false}).click();await page.locator('.workspace-overview').waitFor();await nav('checkout','[data-action="create-order"]');
    await page.locator('[data-action="create-order"]').click();await page.locator('[data-action="decline-payment"]').waitFor();
    await page.locator('[data-action="decline-payment"]').click();await page.getByRole('heading',{name:'O acesso continua bloqueado.'}).waitFor();
    await page.locator('[data-action="create-order"]').click();await page.locator('[data-action="confirm-payment"]').waitFor();await page.locator('[data-action="confirm-payment"]').click();await page.getByRole('heading',{name:'Todos os simulados publicados, na sua conta.'}).waitFor();
    await nav('inicio','.continue-card');await shot('03-aluno-desktop');
    await nav('material/m2','article');await page.locator('[data-action="complete-material"]').click();await page.getByText('Leitura concluída',{exact:true}).waitFor();
    await nav('simulado/s2','[data-action="start-quiz"]');await page.locator('[data-action="start-quiz"]').click();await page.locator('.question-card').waitFor();
    await page.getByRole('radio').nth(1).check();await page.locator('[data-action="next-question"]').click();await page.getByRole('radio').nth(1).check();await page.locator('[data-action="next-question"]').click();await page.locator('#essay-answer').fill('Juros simples usam base fixa. Juros compostos incorporam os juros ao capital a cada período.');
    await page.waitForResponse(r=>r.url().endsWith('/save')&&r.status()===200);await page.waitForTimeout(200);
    await page.reload();await page.locator('.question-card').waitFor();await page.locator('[data-action="jump-question"][data-index="2"]').click();assert.match(await page.locator('#essay-answer').inputValue(),/base fixa/);
    await page.setViewportSize({width:390,height:844});await shot('04-simulado-celular');
    await page.locator('[data-action="ask-finish"]').first().click();await page.locator('[data-action="finish-attempt"]').click();await page.locator('.result-header').waitFor();assert.match(await page.locator('.result-header').innerText(),/Aguardando correção/);await shot('05-resultado-pendente-celular');
    await page.setViewportSize({width:1440,height:1000});await nav('desempenho','.table-wrap');await shot('06-historico');
    await page.locator('[data-action="logout"]').first().click();await page.locator('.public-header').waitFor();await nav('entrar');await page.locator('[data-action="demo-master"]').click();await page.locator('.admin-tabs').waitFor();await shot('07-admin-desktop');
    await nav('admin/correcoes','form[data-form="grade"]');await page.getByLabel('Nota (0 a 2)',{exact:true}).fill('2');await page.getByLabel('Feedback para o aluno',{exact:true}).fill('Você distinguiu corretamente a base fixa e a capitalização.');await page.getByRole('button',{name:'Salvar correção',exact:true}).click();await page.getByRole('heading',{name:'Tudo revisado por aqui.'}).waitFor();
    await nav('admin/preparacoes','.admin-row');await page.locator('[data-action="edit-item"][data-type="preparations"]').first().click();await page.getByLabel('Nome da preparação',{exact:true}).fill('Preparação editorial de teste');await page.getByLabel('Descrição',{exact:true}).fill('Rascunho criado pelo teste de interface.');await page.getByRole('button',{name:'Salvar preparação',exact:true}).click();await page.getByRole('heading',{name:'Preparação editorial de teste',exact:false}).waitFor();
    await page.setViewportSize({width:390,height:844});
    for(const route of ['inicio','preparacoes','materiais','simulados','desempenho','conta','admin','admin/preparacoes','admin/materiais','admin/questoes','admin/simulados','admin/correcoes','admin/alunos','admin/pagamentos']){
      await nav(route);const hasOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(hasOverflow)overflow.push(route);
    }
    await nav('admin','h1');await shot('08-admin-celular');await page.locator('.app-header [data-action="menu"]').click();assert.equal(await page.locator('#sidebar').evaluate(el=>el.classList.contains('open')),true);await page.locator('nav.app-nav a[href="#/materiais"]').click();await page.getByRole('heading',{name:'Materiais para reforçar sua prática.'}).waitFor();
    await page.setViewportSize({width:1440,height:1000});await page.locator('[data-action="logout"]').first().click();await page.locator('.public-header').waitFor();await nav('entrar');await page.getByLabel('E-mail',{exact:true}).fill('sofia@teste.local');await page.getByLabel('Senha',{exact:true}).fill('ValidacaoLocal123!');await page.getByRole('button',{name:'Entrar na minha conta',exact:false}).click();await page.locator('.continue-card').waitFor();
    const a=app.db.attempts.find(a=>!a.isTest);await nav('tentativa/'+a.id,'.result-header');assert.match(await page.locator('.result-header').innerText(),/Meta alcançada/);await shot('09-resultado-corrigido-desktop');
    assert.deepEqual(errors,[],'Erros de JavaScript no navegador');assert.deepEqual(overflow,[],'Páginas com transbordamento horizontal');
    fs.writeFileSync(path.join(qa,'browser-report.json'),JSON.stringify({passed:true,consoleErrors:errors,horizontalOverflow:overflow,flows:['cadastro','checkout pendente e recusado','confirmação de compra','marcar material concluído','simulado misto','rascunho após recarregar','resultado parcial','correção master','resultado final','cadastro editorial','14 páginas em 390px','menu móvel'],screenshots:fs.readdirSync(qa).filter(p=>p.endsWith('.png'))},null,2));
    console.log('BROWSER QA PASSED. Screenshots:',qa);
  }finally{if(browser)await browser.close();await new Promise(r=>app.server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
