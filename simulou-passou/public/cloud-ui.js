export function cloudAuthPage(kind,{bar,brand,field,icon,hasSession}){
  const register=kind==='cadastro',recover=kind==='recuperar',reset=kind==='redefinir';
  const title=register?'Crie sua conta':recover?'Recupere sua senha':reset?'Defina uma nova senha':'Entre na sua conta';
  const description=register?'Cadastre-se para acessar sua área de simulados.':recover?'Informe o e-mail cadastrado. Se a conta estiver ativa, você receberá um link de recuperação.':reset?'Use pelo menos 8 caracteres e confirme a nova senha.':'Acesse seus simulados, respostas e histórico.';
  const submit=register?'Criar conta':recover?'Enviar link de recuperação':reset?'Salvar nova senha':'Entrar';
  const passwordRules=register||reset?'required minlength="8" maxlength="128" autocomplete="new-password"':'required autocomplete="current-password"';
  const fields=(register?field('name','Seu nome','','text','required autocomplete="name" maxlength="100"'):'')
    +(!reset?field('email','E-mail','','email','required autocomplete="username" maxlength="254"'):'')
    +(!recover?field('password',reset?'Nova senha':'Senha','','password',passwordRules):'')
    +(reset?field('passwordConfirm','Confirme a nova senha','','password',passwordRules):'');
  const form=reset&&!hasSession
    ? `<p>Abra o link de recuperação no seu e-mail para redefinir a senha.</p><a class="btn full" href="#/recuperar">Solicitar novo link</a>`
    : `<p>${description}</p><form data-form="${register?'register':recover?'recover':reset?'reset':'login'}">${fields}<div class="form-error" role="alert"></div><button class="btn full" type="submit">${submit} ${icon('arrow',15)}</button></form>`;
  return `${bar()}<main id="main" class="auth-page"><aside class="auth-story">${brand()}<div><div class="eyebrow" style="color:#cfb17b">Simulou Passou</div><h1>Pratique no seu ritmo.</h1><p>Faça simulados por certificação, revise o gabarito e retome de onde parou.</p></div><p class="small">Simulou Passou · Logos IA</p></aside><section class="auth-panel"><div class="auth-card"><a class="auth-back" href="#/">${icon('left',15)} Página inicial</a><h1>${title}</h1>${form}<div id="recovery-result" aria-live="polite"></div><div class="auth-links">${recover||reset?'<a href="#/entrar">Voltar ao login</a>':register?'<span>Já tem uma conta?</span><a href="#/entrar">Entrar</a>':'<a href="#/recuperar">Esqueci minha senha</a><a href="#/cadastro">Criar conta</a>'}</div></div></section></main>`;
}
const shortTrackName=track=>track.name.replace(/^PQO · /,'');
export const planModuleField=(tracks,selected,select)=>select('prep','Qual módulo?',tracks.map(track=>[
  track.id,track.id==='pqo-cadastro'?'Cadastro':shortTrackName(track),
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
    {id:'all',label:'Pacote completo',title:'Todos os módulos',scope:tracks.length>1?'Simulados e materiais das '+tracks.length+' trilhas.':'Simulados e materiais de todo o catálogo.'},
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
    <p class="pricing-payment">Pagamento único · Acesso vitalício · Pix ou cartão</p>
    <div class="pricing-benefits">
      <h3>Incluído nos dois planos</h3>
      <ul>${['Gabarito comentado','Caderno de erros','Histórico e anotações'].map(text=>`<li>${icon('check',15)} ${text}</li>`).join('')}</ul>
    </div>
    ${selected?planContents(data,tracks,selected,backToPackage,{E,icon}):''}
  </div>`;
}

export function cloudCheckout(data,{bar,brand,link,notice,E,select,money,icon},query){
  const choices=data.preparations.filter(p=>p.track==='pqo'&&p.status==='published');
  const selected=choices.find(p=>p.id===query.get('prep'))||choices[0];
  const offer=query.get('offer')==='all'?'all':'module';
  const prices=data.offers||{module:2990,all:4990};
  const owns=plan=>!!data.user&&(data.user.allModules===true
    ||(plan==='module'&&data.user.moduleIds?.includes(selected?.id)===true)
    ||(data.user.allModules===undefined&&data.user.hasAccess));
  const feedback=query.get('pagamento');
  const status=feedback==='retorno'?notice(owns(offer)?'Pagamento confirmado. Seu acesso está liberado.':'Aguardando a confirmação do pagamento. Atualize esta página para acompanhar.'):feedback==='cancelado'?notice('A sessão de pagamento foi encerrada. Você pode iniciar outra quando quiser.'):'';
  const form=plan=>{
    const all=plan==='all';
    const moduleField=all?`<input type="hidden" name="prep" value="${E(selected.id)}">`
      :planModuleField(choices,selected,select);
    const goTo=all?'#/simulados':'#/simulados?prep='+encodeURIComponent(selected.id);
    const cta=owns(plan)?link('Abrir simulados',goTo,'pricing-cta')
      :data.checkoutEnabled?`<button class="btn pricing-cta" type="submit">${all?'Comprar pacote':'Comprar módulo'}</button>`
      :'<p class="pricing-unavailable">Compra indisponível</p>';
    return `<form class="pricing-action" data-form="checkout-select"><input type="hidden" name="offer" value="${plan}">${moduleField}<div class="form-error" role="alert"></div>${cta}</form>`;
  };
  const backToPackage=`<a class="btn pricing-bundle-cta" href="#preco-all" data-scroll="preco-all">Voltar ao pacote de ${money(prices.all)} ${icon('arrow',15)}</a>`;
  const comparison=selected?planComparison({data,tracks:choices,selected,prices,actions:{module:form('module'),all:form('all')},money,icon,E,backToPackage,selectedOffer:query.has('offer')||query.has('prep')?offer:null})
    :notice('O catálogo estará disponível no lançamento.');
  const unavailable=selected&&!data.checkoutEnabled?`<div class="pricing-status">${notice('Compras ainda indisponíveis. Você já pode criar sua conta.')}${!data.user?link('Criar conta','#/cadastro','secondary'):''}</div>`:'';
  return `${bar()}
    <header class="public-header">${brand()}${link(data.user?'Meu painel':'Entrar',data.user?'#/inicio':'#/entrar','secondary compact')}</header>
    <main id="main" class="public-wrap pricing-page">
      <div class="pricing-heading"><div class="eyebrow">Simulou Passou</div><h1>Escolha seu acesso</h1><p>Compare os planos e escolha quais simulados quer liberar.</p></div>
      ${status?`<div class="pricing-status">${status}</div>`:''}
      ${comparison}
      ${unavailable}
    </main>`;
}
export function cloudLegal(kind){
  return kind==='privacy'?`<p>O Simulou Passou é um módulo da Logos IA. O cadastro utiliza seu nome e e-mail para identificar a conta e enviar mensagens de confirmação e recuperação de acesso.</p><p>Anotações, planejamento, registros de foco e tentativas são salvos na sua conta. O navegador também mantém rascunhos temporários para recuperar alterações durante uma interrupção de conexão. Administradores do módulo gerenciam acessos, conteúdo e correções de provas; as telas administrativas não exibem suas notas pessoais.</p><p>A infraestrutura utiliza Supabase para autenticação e armazenamento e a hospedagem da Logos para servir a aplicação. A senha é processada pelo serviço de autenticação; ela não aparece nas telas de administração.</p><p>Para tratar de acesso, correção ou exclusão de dados, utilize os canais oficiais da Logos IA. O aviso completo com identificação do responsável e canal específico será apresentado antes da abertura de vendas.</p>`:`<p>Esta versão está em pré-lançamento. O cadastro e as ferramentas pessoais estão disponíveis; não há cobrança automática ou compra habilitada.</p><p>O catálogo atual contém exemplos demonstrativos. Ele não representa uma preparação completa, um vínculo com certificadoras ou garantia de aprovação. As porcentagens hipotéticas da calculadora são inventadas para demonstração e não estimam sua chance real no exame.</p><p>Os simulados podem ter regras próprias de duração, revisão e limite de tentativas. Consulte essas regras antes de iniciar. Os termos comerciais definitivos, suporte e condições de cancelamento serão disponibilizados antes da abertura de vendas.</p>`;
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
