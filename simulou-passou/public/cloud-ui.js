export const isMarketPrep=id=>!['pqo-risco','pqo-liquidacao','pqo-custodia'].includes(id);

export function cloudAuthPage(kind,{bar,brand,field,icon,hasSession,hasRecoveryKey}){
  const register=kind==='cadastro',recover=kind==='recuperar',reset=kind==='redefinir';
  const recovering=recover||reset;
  const title=register?'Crie sua conta':recover?'Recupere sua senha':reset?'Defina uma nova senha':'Entre na sua conta';
  const description=register?'Cadastre-se para acessar sua área de simulados.':recover?'Informe o e-mail cadastrado. Se a conta estiver ativa, você receberá um link de recuperação.':reset?'Use pelo menos 8 caracteres e confirme a nova senha.':'Acesse seus simulados, respostas e histórico.';
  const submit=register?'Criar conta':recover?'Enviar link de recuperação':reset?'Salvar nova senha':'Entrar';
  const passwordRules=register||reset?'required minlength="8" maxlength="128" autocomplete="new-password"':'required autocomplete="current-password"';
  const fields=(register?field('name','Seu nome','','text','required autocomplete="name" maxlength="100"'):'')
    +(!reset?field('email','E-mail','','email','required autocomplete="username" maxlength="254"'):'')
    +(!recover?field('password',reset?'Nova senha':'Senha','','password',passwordRules):'')
    +(reset?field('passwordConfirm','Confirme a nova senha','','password',passwordRules):'');
  const form=reset&&!hasSession&&!hasRecoveryKey
    ? `<p>Abra o link de recuperação no seu e-mail para redefinir a senha.</p><a class="btn full" href="#/recuperar">Solicitar novo link</a>`
    : `<p>${description}</p><form data-form="${register?'register':recover?'recover':reset?'reset':'login'}">${fields}<div class="form-error" role="alert"></div><button class="btn full" type="submit">${submit} ${icon('arrow',15)}</button></form>`;
  const logo='<a href="#/" aria-label="Simulou Passou — início"><img class="auth-recovery-logo" src="./simulou-passou-logo.png" width="228" height="56" alt="Simulou Passou"></a>';
  return `${bar()}<main id="main" class="auth-page${recovering?' auth-recovery':''}">
    <aside class="auth-story">${recovering?logo:brand()}
      <div><div class="eyebrow" style="color:#cfb17b">Simulou Passou</div>
      <h1>${recovering?'Volte aos seus simulados.':'Pratique no seu ritmo.'}</h1>
      <p>${recovering?'Recupere seu acesso e retome sua prática de onde parou.':'Faça simulados por certificação, revise o gabarito e retome de onde parou.'}</p></div>
      <p class="small">Simulou Passou · Logos IA</p>
    </aside>
    <section class="auth-panel"><div class="auth-card">
      <a class="auth-back" href="#/">${icon('left',15)} Página inicial</a>
      ${recovering?`<div class="auth-recovery-icon" aria-hidden="true">${icon('lock',21)}</div><div class="eyebrow">Acesso à sua conta</div>`:''}
      <h1>${title}</h1>${form}
      <div id="recovery-result" aria-live="polite"></div>
      <div class="auth-links">${recovering?'<a href="#/entrar">Voltar ao login</a>'+(reset&&(hasSession||hasRecoveryKey)?'<a href="#/recuperar">Solicitar novo link</a>':''):register?'<span>Já tem uma conta?</span><a href="#/entrar">Entrar</a>':'<a href="#/recuperar">Esqueci minha senha</a><a href="#/cadastro">Criar conta</a>'}</div>
    </div></section></main>`;
}
const shortTrackName=track=>track.name.replace(/^PQO · /,'');
export const planModuleField=(tracks,selected,select)=>select('prep','Qual módulo?',tracks.map(track=>[
  track.id,shortTrackName(track),
]),selected.id);

function planContents(data,tracks,selected,backToPackage,{E,icon}){
  const catalog=tracks.map(track=>({
    ...track,
    quizzes:data.quizzes.filter(quiz=>quiz.prepId===track.id),
    materials:data.materials.filter(material=>material.prepId===track.id),
  }));
  if(!catalog.length)return '';
  const contents=track=>{
    const quizzes=track.quizzes.map(quiz=>{
      const details=[quiz.count!=null?`${quiz.count} questões`:'',quiz.durationMinutes?`${quiz.durationMinutes} min`:''].filter(Boolean).join(' · ');
      return `<li>${icon('list',16)}<div><span>${E(quiz.name)}</span>${details?`<small>${E(details)}</small>`:''}</div></li>`;
    });
    const materials=track.materials.map(material=>`<li>${icon('book',16)}<div><span>${E(material.title)}</span><small>Material de apoio</small></div></li>`);
    const items=[...quizzes,...materials];
    return items.length?`<ul class="pricing-items">${items.join('')}</ul>`:'<p class="small muted">Conteúdo a publicar.</p>';
  };
  const quizCount=catalog.reduce((total,track)=>total+track.quizzes.length,0);
  return `<section class="pricing-catalog" aria-labelledby="pricing-catalog-title">
    <header class="pricing-catalog-heading">
      <div class="eyebrow">Simulados e materiais</div>
      <h2 id="pricing-catalog-title">Veja o que você vai acessar</h2>
    </header>
    <section id="conteudo-individual" class="pricing-catalog-individual">
      <h3>Conteúdo do plano individual</h3>
      <div aria-live="polite">
        ${catalog.map(track=>`<div class="pricing-track-preview" data-plan-module="${E(track.id)}"${track.id===selected.id?'':' hidden'}>
          <h4>${E(shortTrackName(track))}</h4>
          ${contents(track)}
        </div>`).join('')}
      </div>
    </section>
    <section id="conteudo-pacote" class="pricing-catalog-bundle">
      <div class="pricing-bundle-heading">
        <div class="eyebrow">Pacote completo</div>
        <h3>Todos os simulados e materiais</h3>
        <p>${catalog.length} ${catalog.length===1?'trilha':'trilhas'} · ${quizCount} ${quizCount===1?'simulado':'simulados'}. Confira o conteúdo de cada trilha.</p>
      </div>
      <ul class="pricing-catalog-grid">${catalog.map(track=>`<li class="pricing-track">
        <h4>${E(shortTrackName(track))}</h4>
        ${contents(track)}
      </li>`).join('')}</ul>
      ${backToPackage}
    </section>
  </section>`;
}

export function planComparison({data,tracks,selected,prices,actions,money,icon,E,selectedOffer,backToPackage}){
  const plans=[
    {id:'module',label:'Individual',title:'Um módulo',scope:'Simulados e materiais da trilha escolhida.'},
    {id:'all',label:'Pacote completo',title:'Todos os módulos',scope:'Um ano de acesso aos simulados e materiais de todo o catálogo.'},
  ];
  return `<div class="pricing-comparison">
    <div class="pricing-grid">${plans.map(plan=>`
      <article id="preco-${plan.id}" class="pricing-card pricing-card--${plan.id}${selectedOffer===plan.id?' is-selected':''}" aria-labelledby="plan-${plan.id}-title">
        <div class="pricing-label">${plan.label}</div>
        <h3 id="plan-${plan.id}-title">${plan.title}</h3>
        <p class="pricing-price">${money(prices[plan.id])}</p>
        <p class="pricing-scope">${plan.scope}</p>
        ${selected?`<a class="pricing-details-link" href="#${plan.id==='all'?'conteudo-pacote':'conteudo-individual'}" data-scroll="${plan.id==='all'?'conteudo-pacote':'conteudo-individual'}">${plan.id==='all'?'Ver todas as trilhas':'Ver conteúdo do módulo'} ${icon('right',12)}</a>`:''}
        ${actions[plan.id]}
      </article>`).join('')}</div>
    <p class="pricing-payment">Pagamento único · Pix ou cartão</p>
    <div class="pricing-benefits">
      <h3>Incluído nos dois planos</h3>
      <ul>${['Gabarito comentado','Caderno de erros','Histórico e anotações'].map(text=>`<li>${icon('check',15)} ${text}</li>`).join('')}</ul>
    </div>
    ${selected?planContents(data,tracks,selected,backToPackage,{E,icon}):''}
  </div>`;
}

export function cloudCheckout(data,{bar,brand,link,notice,E,select,money,icon},query){
  const choices=data.preparations.filter(p=>p.track==='pqo'&&p.status==='published'&&p.salesEnabled!==false&&isMarketPrep(p.id));
  const prep=query.get('prep');
  const selected=(query.has('pagamento')?data.preparations:choices).find(p=>p.id===prep)||(!prep?choices[0]:null);
  const offer=query.get('offer')==='all'?'all':'module';
  const all=offer==='all';
  const prices=data.offers||{module:2990,all:4990};
  const owns=plan=>!!data.user&&(data.user.allModules===true
    ||(plan==='module'&&data.user.moduleIds?.includes(selected?.id)===true)
    ||(data.user.allModules===undefined&&data.user.hasAccess));
  const feedback=query.get('pagamento');
  const guest=data.guestCheckoutEnabled&&!data.user;
  const guestReturn=guest&&feedback==='retorno';
  let status='';
  if(guestReturn){
    status=`${notice('Entre ou crie sua conta com o mesmo e-mail informado na compra. O acesso aparece assim que o pagamento e o e-mail forem confirmados.')}
      <div class="actions">
        <button type="button" class="btn" data-action="checkout-account" data-destination="cadastro">Criar conta para acessar</button>
        <button type="button" class="btn secondary" data-action="checkout-account" data-destination="entrar">Já tenho conta</button>
      </div>`;
  }else if(feedback==='retorno'){
    status=owns(offer)?notice('Pagamento confirmado. Seu acesso está liberado.')
      :`${notice('Aguardando a confirmação do pagamento. Confira se entrou com o mesmo e-mail informado na compra.')}
        <button type="button" class="btn secondary" data-action="retry">Atualizar situação</button>`;
  }else if(feedback==='cancelado'){
    status=notice('A sessão de pagamento foi encerrada. Você pode iniciar outra quando quiser.');
  }
  const header=`${bar()}<header class="public-header">${brand()}${link(data.user?'Meu painel':'Entrar',data.user?'#/inicio':'#/entrar','secondary compact')}</header>`;
  const bundleUrl='#/checkout?offer=all';
  if(!query.has('offer')&&!prep&&!feedback){
    const comparison=selected?planComparison({data,tracks:choices,selected,prices,money,icon,E,actions:{
      module:`<div class="pricing-action pricing-picker" data-pricing-picker>${planModuleField(choices,selected,select)}${link('Comprar módulo','#/checkout?offer=module&prep='+encodeURIComponent(selected.id),'pricing-cta')}</div>`,
      all:link('Comprar pacote',bundleUrl,'pricing-cta pricing-action'),
    },backToPackage:link('Comprar pacote · '+money(prices.all),bundleUrl,'pricing-bundle-cta')})
      :notice('O catálogo estará disponível em breve.');
    return `${header}<main id="main" class="public-wrap pricing-page">
      <div class="pricing-heading"><h1>Escolha seu acesso</h1><p>Compare os planos e escolha quais simulados quer liberar.</p></div>${comparison}
    </main>`;
  }

  const back=`<a class="back-link" href="#/checkout">${icon('left',15)} Voltar aos planos</a>`;
  if(!selected)return `${header}<main id="main" class="public-wrap purchase-page">${back}${notice('Esse módulo não está disponível. Volte aos planos para escolher outro.')}</main>`;
  const title=all?'Pacote completo':selected.name;
  const quizCount=data.quizzes.filter(q=>q.status==='published'&&(all?choices.some(p=>p.id===q.prepId):q.prepId===selected.id)).length;
  const active=owns(offer);
  const goTo=all?'#/simulados':'#/simulados?prep='+encodeURIComponent(selected.id);
  const form=`<form class="purchase-form" data-form="checkout-select">
    <input type="hidden" name="offer" value="${offer}"><input type="hidden" name="prep" value="${E(selected.id)}">
    <section aria-labelledby="purchase-contact-title">
      <h2 id="purchase-contact-title">Seus dados</h2>
      <div class="field"><label for="purchase-name">Nome completo</label><input id="purchase-name" name="name" autocomplete="name" required minlength="2" maxlength="100" value="${E(data.user?.name||'')}"></div>
      <div class="purchase-contact-grid">
        <div class="field"><label for="purchase-email">E-mail</label><input id="purchase-email" name="email" type="email" autocomplete="email" required maxlength="254" value="${E(data.user?.email||'')}" ${data.user?'readonly':''} aria-describedby="purchase-email-help"></div>
        <div class="field"><label for="purchase-phone">Telefone com DDD</label><input id="purchase-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="(11) 99999-9999" required maxlength="25"></div>
      </div>
      <p class="purchase-help" id="purchase-email-help">Use este e-mail para acessar seus simulados depois da compra.</p>
    </section>
    <fieldset class="purchase-methods">
      <legend>Forma de pagamento</legend>
      <label class="purchase-method"><input type="radio" name="method" value="PIX" required checked><span><strong>Pix</strong><small>QR Code ou Pix Copia e Cola</small></span></label>
      <label class="purchase-method"><input type="radio" name="method" value="CREDIT_CARD" required><span><strong>Cartão de crédito</strong><small>Pagamento à vista</small></span></label>
    </fieldset>
    <div class="form-error" role="alert"></div>
    <button class="btn full purchase-pay" type="submit">Ir para o pagamento ${icon('arrow',16)}</button>
    <p class="purchase-secure">${icon('lock',15)} Pagamento processado pelo Asaas</p>
  </form>`;
  const payment=feedback==='retorno'?status+(active?link('Abrir simulados',goTo,'full'):'')
    :active?notice('Este acesso já está liberado para a sua conta.')+link('Abrir simulados',goTo,'full')
    :!data.checkoutEnabled?notice('Compras indisponíveis no momento.')
    :(!data.user&&!guest)?link('Entrar para continuar','#/entrar','full')
    :(status?'<div class="purchase-feedback">'+status+'</div>':'')+form;
  return `${header}<main id="main" class="public-wrap purchase-page">
    ${back}
    <h1>${feedback==='retorno'?'Acompanhe seu pedido':'Finalize sua compra'}</h1>
    <div class="purchase-layout">
      <aside class="purchase-summary" aria-labelledby="purchase-summary-title">
        <h2 id="purchase-summary-title">Resumo do pedido</h2>
        <div class="purchase-product"><span class="purchase-product-icon">${icon('book',23)}</span><div><span>Simulou Passou</span><h3>${E(title)}</h3></div></div>
        <p>${all?`Todos os módulos · ${quizCount} simulados`:'Acesso ao módulo selecionado'}</p>
        <ul><li>${icon('check',15)} ${all?'Um ano de acesso':'Acesso ao módulo selecionado'}</li><li>${icon('check',15)} Gabarito comentado e materiais do plano</li></ul>
        <div class="purchase-total"><div><strong>Total</strong><small>Pagamento único</small></div><strong>${money(prices[offer])}</strong></div>
      </aside>
      <section class="purchase-panel" aria-label="Pagamento">${payment}</section>
    </div>
  </main>`;
}
export function cloudLegal(kind){
  return kind==='privacy'?`<p>O Simulou Passou é um módulo da Logos IA. O cadastro utiliza seu nome e e-mail para identificar a conta e enviar mensagens de confirmação e recuperação de acesso.</p><p>Em uma compra, usamos seu nome, telefone e e-mail para identificar o pedido e liberar seu acesso. O Asaas processa o pagamento.</p><p>Anotações, planejamento, registros de foco e tentativas são salvos na sua conta. O navegador também mantém rascunhos temporários para recuperar alterações durante uma interrupção de conexão. Administradores do módulo gerenciam acessos, conteúdo e correções de provas; as telas administrativas não exibem suas notas pessoais.</p><p>A infraestrutura utiliza Supabase para autenticação e armazenamento e a hospedagem da Logos para servir a aplicação. A senha é processada pelo serviço de autenticação; ela não aparece nas telas de administração.</p><p>Para tratar de acesso, correção ou exclusão de dados, utilize os canais oficiais da Logos IA. O aviso completo com identificação do responsável e canal específico será apresentado antes da abertura de vendas.</p>`:`<p>Esta versão está em pré-lançamento. O cadastro e as ferramentas pessoais estão disponíveis; não há cobrança automática ou compra habilitada.</p><p>O catálogo atual contém exemplos demonstrativos. Ele não representa uma preparação completa, um vínculo com certificadoras ou garantia de aprovação. As porcentagens hipotéticas da calculadora são inventadas para demonstração e não estimam sua chance real no exame.</p><p>Os simulados podem ter regras próprias de duração, revisão e limite de tentativas. Consulte essas regras antes de iniciar. Os termos comerciais definitivos, suporte e condições de cancelamento serão disponibilizados antes da abertura de vendas.</p>`;
}
export function cloudAccount(data,h){
  const {heading,field,E,notice,button,link}=h,u=data.user;
  return `${heading('Sua conta','Tudo em um só lugar.','Gerencie seus dados e confira a situação do seu acesso.')}<div class="account-grid"><section class="card"><h3>Dados pessoais</h3><form data-form="profile">${field('name','Nome',u.name,'text','required autocomplete="name"')}${field('email','E-mail',u.email,'email','disabled')}<p class="fine">O e-mail identifica sua conta da Logos IA.</p><div class="form-error" role="alert"></div><button class="btn" type="submit">Salvar alterações</button></form></section><section class="card"><h3>Seu acesso</h3>${notice(u.role==='master'?'Você tem administração do Simulou Passou.':u.allModules?'Seu acesso a todos os módulos está liberado.':u.hasAccess?'Módulos liberados: '+E(data.preparations.filter(p=>u.moduleIds?.includes(p.id)).map(p=>p.name).join(', '))+'.':'Seu painel pessoal está ativo. O acesso aos simulados ainda depende de liberação.')}<p>Suas anotações, atividades e tentativas ficam vinculadas à sua conta.</p>${u.hasAccess?'':data.checkoutEnabled?link('Ver acesso','#/checkout','compact'):'<p class="fine">Compras ainda indisponíveis.</p>'}<div class="actions">${link(u.hasAccess?'Meus simulados':'Meu painel',u.hasAccess?'#/simulados':'#/inicio','secondary compact')}${link('Alterar senha','#/recuperar','secondary compact')}${button('Sair','logout','secondary compact')}</div></section></div>`;
}
export function cloudAdminOverview(d,h,checkoutEnabled){
  const {stat,link,notice}=h;
  return `<div class="grid-3 stats">${stat('Contas no módulo',d.users.length,'Contas que já acessaram o Simulou Passou','user')}${stat('Simulados publicados',d.quizzes.filter(q=>q.status==='published').length,'Catálogo disponível para contas liberadas','book')}${stat('Correções pendentes',d.pending.length,'Respostas discursivas aguardando avaliação','edit')}</div><div class="grid-2"><section class="card"><h3>Administre o catálogo</h3><p>Gerencie trilhas, materiais, questões e regras de cada simulado.</p><div class="actions">${link('Conteúdo a enviar','#/admin/conteudo','secondary compact')}${link('Gerenciar simulados','#/admin/simulados','secondary compact')}</div></section><section class="card"><h3>Acesso e acompanhamento</h3><p>Gerencie as contas do módulo, libere acessos e acompanhe as tentativas. As permissões são verificadas no servidor e não dependem de botões de demonstração.</p>${notice(checkoutEnabled?'Compras disponíveis via Pix e cartão.':'As vendas ainda estão desativadas.')}<div class="actions">${link('Contas e acessos','#/admin/alunos','secondary compact')}${link('Correções','#/admin/correcoes','secondary compact')}</div></section></div>`;
}
export function cloudPayments(data,checkoutEnabled,{notice,link,E,date,money,badge}){
  const states={pending:'Pendente',paid:'Confirmado',refunded:'Estornado',cancelled:'Cancelado',declined:'Recusado'};
  const orders=[...data.orders].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return `<div class="page-heading"><div class="eyebrow">Financeiro do módulo</div><h2>${checkoutEnabled?'Pagamentos':'Vendas ainda não habilitadas'}</h2></div>
  <section class="card">${!checkoutEnabled?notice('O checkout está fechado para novas compras.'):''}
  ${orders.length?`<div class="table-wrap"><table><thead><tr><th>Aluno</th><th>Data</th><th>Valor</th><th>Situação</th><th>Ambiente</th></tr></thead><tbody>
    ${orders.map(order=>`<tr><td>${E(data.users.find(user=>user.id===order.userId)?.name||'Aluno')}</td><td>${date(order.createdAt)}</td><td>${money(order.amount)}</td><td>${badge(states[order.status]||'Indefinido',order.status==='paid'?'green':'gray')}</td><td>${order.providerMode==='sandbox'?'Teste Asaas':'Produção'}</td></tr>`).join('')}
  </tbody></table></div>`:'<p>Nenhum pedido registrado.</p>'}
  ${link('Gerenciar acessos','#/admin/alunos','secondary compact')}</section>`;
}
