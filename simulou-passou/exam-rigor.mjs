const polish=value=>String(value)
  .replace(/\?\s*\./g,'?')
  .replace(/,\s*\./g,'.')
  .replace(/\s+([,.;:!?])/g,'$1')
  .replace(/\s{2,}/g,' ')
  .trim();

const clause=value=>polish(value).replace(/[?.!]\s*$/,'').trim();

function factsAndCommand(prompt){
  const source=polish(prompt);
  const match=source.match(/^(.*?)(?:\s+)(Qual|Quanto|Quantas|Quem|Que|Como|Em qual|Calcule|Determine)(.*)$/i)
    ||source.match(/^(Qual|Quanto|Quantas|Quem|Que|Como|Em qual|Calcule|Determine)(.*)$/i);
  if(!match)return null;
  if(match.length===3)return {facts:'',question:(match[1]+match[2]).replace(/^Calcule\b/i,'Determine').trim()};
  return {facts:clause(match[1]),question:(match[2]+match[3]).replace(/^Calcule\b/i,'Determine').trim()};
}

function rewriteKnownFamily(prompt){
  const text=polish(prompt);
  const simple=factsAndCommand(text);

  if(/^Uma classe de fundo tem ativos/i.test(text)&&simple){
    return `O balancete de uma classe informa ${clause(simple.facts.replace(/^Uma classe de fundo tem\s*/i,''))}. Qual valor patrimonial deve ser atribuído a cada cota?`;
  }
  if(/^Um ativo estrangeiro sobe/i.test(text)&&simple){
    return `${clause(simple.facts.replace(/^Um ativo estrangeiro\s*/i,'Um ativo da carteira internacional '))}. A posição não possui proteção cambial. Qual retorno deve ser registrado depois da conversão para reais?`;
  }
  if(/^Em um VGBL,/i.test(text)&&simple){
    return `Em um pedido de resgate, ${clause(simple.facts.replace(/^Em um VGBL,\s*/i,''))}. Qual valor deve ser retido?`;
  }
  if(/^Calcule os juros simples sobre/i.test(text)){
    const terms=clause(text.replace(/^Calcule os juros simples sobre\s*/i,''));
    return `Uma operação de crédito foi contratada sobre ${terms}. O encargo de cada período não é incorporado ao saldo dos períodos seguintes. Qual é o encargo financeiro acumulado?`;
  }
  if(/juros simples/i.test(text)&&simple?.facts){
    return `${clause(simple.facts.replace(/^Calcule\s*/i,''))}. O contrato determina crescimento linear, sem incorporação dos rendimentos ao saldo. Qual encargo financeiro foi acumulado?`;
  }
  if(/juros compostos/i.test(text)&&simple?.facts){
    const facts=clause(simple.facts.replace(/^Um capital\s*/i,'O saldo inicial ').replace(/,?\s*por juros compostos/ig,''));
    return `${facts}. Cada rendimento mensal integra a base do período seguinte. Qual saldo deve constar ao final do prazo?`;
  }
  if(/^Uma opção de compra tem exercício/i.test(text)&&simple){
    return `${simple.facts}. No vencimento, o titular encerra a posição e o prêmio desembolsado não é devolvido. Qual é o resultado líquido por unidade?`;
  }
  if(/^Uma posição comprada tem .*contratos futuros/i.test(text)&&simple){
    return `${simple.facts}. A liquidação diária reconhece integralmente o movimento informado. Qual lançamento deve ser feito na conta da posição?`;
  }
  if(/^Qual é o montante aproximado de/i.test(text)){
    return `Uma aplicação recebeu ${clause(text.replace(/^Qual é o montante aproximado de\s*/i,'').replace(/,?\s*com juros compostos/ig,''))}. Os rendimentos de cada mês permanecem aplicados até o fim. Qual saldo deve ser conciliado?`;
  }
  if(/^O cliente toma /i.test(text)&&simple){
    return `${simple.facts}. O contrato não prevê outros pagamentos além dos itens informados. Qual é a saída total de caixa?`;
  }
  if(/^Quantas cotas são emitidas/i.test(text)){
    return `Uma aplicação de ${clause(text.replace(/^Quantas cotas são emitidas, aproximadamente, na aplicação de\s*/i,''))} não possui taxa de entrada. Quantas cotas inteiras devem ser creditadas?`;
  }
  if(/^Sem custos, quanto vale no vencimento um CDB/i.test(text)){
    return `Um CDB recebe ${clause(text.replace(/^Sem custos, quanto vale no vencimento um CDB de\s*/i,'').replace(/,?\s*com capitalização composta/ig,''))}. Os rendimentos mensais permanecem aplicados e não há retiradas intermediárias. Qual saldo deve ser liquidado no vencimento?`;
  }
  if(/capacidade mensal de poupança|sobra mensal antes/i.test(text)&&simple){
    return `O demonstrativo apresenta ${clause(simple.facts.replace(/^Com\s*/i,''))}. Sem usar renda eventual nem reduzir despesas já contratadas, qual aporte recorrente máximo preserva o caixa mensal?`;
  }
  if(/^Uma operação à vista em/i.test(text)&&simple){
    return `${simple.facts}. Antes de classificar o tratamento fiscal, qual resultado econômico líquido deve entrar na apuração mensal?`;
  }
  return null;
}

export function hardenCertificationRow(cert,row){
  if(row.format==='dialogue')return {...row};
  const rewritten=rewriteKnownFamily(row.prompt);
  if(row.context&&!rewritten)return {...row,context:polish(row.context),prompt:polish(row.prompt)};
  return {
    ...row,
    prompt:polish(rewritten||row.prompt),
    context:rewritten?undefined:row.context,
    difficulty:row.difficulty||(rewritten?'advanced':'intermediate'),
    cognitiveLevel:row.cognitiveLevel||(rewritten?'application':'knowledge'),
  };
}

export function hardenCatalogQuestion(question){
  if(question.type==='dialogue')return {...question};
  const rewritten=rewriteKnownFamily(question.prompt);
  return {
    ...question,
    prompt:polish(rewritten||question.prompt),
    context:rewritten?undefined:question.context?polish(question.context):question.context,
    difficulty:question.difficulty||(rewritten?'advanced':'intermediate'),
    cognitiveLevel:question.cognitiveLevel||(rewritten?'application':'knowledge'),
  };
}
