import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

// Public sample items are kept apart from the paid question banks.
const bank=[
 ['Se uma compra limitada aceita no máximo R$ 24,10, qual oferta de venda pode executar de imediato?', ['R$ 24,15','R$ 24,25','R$ 24,05','R$ 24,50'],2,'Uma compra limitada só aceita o preço máximo definido ou um preço inferior.'],
 ['Em um livro com prioridade de preço e tempo, duas vendas têm o mesmo preço. Qual tem prioridade?', ['A mais antiga','A mais recente','A de maior volume','A do cliente com maior saldo'],0,'Entre ofertas no mesmo preço, a mais antiga tem prioridade nesse modelo.'],
 ['Uma ordem executou 80 das 200 ações pedidas. Quando o cancelamento do saldo é confirmado, quantas foram compradas?', ['0','120','200','80'],3,'As 80 ações já executadas permanecem compradas. O cancelamento alcança o saldo de 120.'],
 ['No call de abertura, uma nova oferta altera o preço teórico. O que esse preço representa antes do encerramento?', ['A garantia de execução de todas as ofertas','Uma estimativa sujeita às ofertas e regras do leilão','O preço de todos os negócios do dia','O valor de liquidação financeira'],1,'O preço teórico reflete as ofertas consideradas naquele momento e pode mudar até o fechamento do call.'],
 ['Qual é o objetivo da entrega contra pagamento?', ['Fixar a cotação do ativo','Dispensar a compensação','Reduzir o risco de entregar o ativo sem receber a contrapartida','Evitar toda perda de mercado'],2,'A entrega vinculada ao pagamento reduz o risco de cumprimento unilateral.'],
 ['Num ciclo de compensação, um participante deve pagar R$ 240 mil e tem créditos elegíveis de R$ 90 mil. Qual o saldo líquido?', ['Pagar R$ 150 mil','Receber R$ 150 mil','Pagar R$ 330 mil','Receber R$ 90 mil'],0,'Subtraia os R$ 90 mil a receber dos R$ 240 mil a pagar.'],
 ['Qual registro comprova que uma oferta virou negócio?', ['A mera previsão de caixa','O estado inicial da oferta no livro','O extrato de outro cliente','A confirmação de execução vinculada à oferta'],3,'A confirmação de execução identifica o negócio formado e o vincula à oferta.'],
 ['Em que etapa se apuram as obrigações que serão liquidadas?', ['Negociação','Compensação','Prospecção','Divulgação da cotação'],1,'A compensação apura obrigações elegíveis. A liquidação é o seu cumprimento.'],
 ['Uma falha de comunicação deixa incerto se uma ordem chegou ao mercado. O que se deve fazer antes de reenviar?', ['Reenviar três vezes','Enviar outra ordem com novo identificador','Consultar o status da ordem original','Considerar que a primeira ordem nunca chegou'],2,'A confirmação do status reduz o risco de duplicar uma ordem já recebida.'],
 ['A mesma pessoa insere uma alteração em uma ordem e aprova a própria alteração. Qual controle reduz o risco?', ['Separar a execução da aprovação e registrar ambas','Eliminar o registro para diminuir retrabalho','Aumentar a alçada da mesma pessoa','Conferir somente se houver reclamação'],0,'A aprovação independente e a trilha de alteração tornam a revisão verificável.'],
 ['O cliente precisa resgatar a reserva em seis meses. O produto só permite resgate em dois anos. Qual aspecto entra na análise de adequação?', ['Só a rentabilidade passada','Só o nome comercial do produto','Só o valor nominal da aplicação','A incompatibilidade entre prazo de resgate e objetivo de liquidez'],3,'A liquidez precisa permitir o uso do dinheiro dentro do prazo declarado.'],
 ['Uma operação liquida normalmente, mas integra um padrão atípico de movimentações. Qual é a ação mais adequada?', ['Arquivar porque houve liquidação','Analisar o padrão e registrar o encaminhamento pelo procedimento interno','Avisar o cliente sobre qualquer possível comunicação antes da análise','Analisar apenas a menor movimentação'],1,'A atipicidade depende do contexto. A liquidação não substitui a análise de PLD/FTP.'],
 ['Um prestador precisa confirmar o horário de duas ordens. Qual envio segue a minimização de dados?', ['A base de todos os clientes','A posição integral dos titulares','Somente os dados necessários pelo canal autorizado','O arquivo mensal por um link aberto'],2,'A finalidade delimita os dados e os destinatários necessários.'],
 ['A mesa usa informação sobre uma grande ordem de cliente ainda não executada para negociar antes dela em conta própria. Que prática o caso ilustra?', ['Front running','Entrega contra pagamento','Arbitragem cambial','Compensação líquida'],0,'Usar antecipadamente a informação da ordem do cliente em benefício próprio caracteriza a situação de front running.'],
 ['Uma conta tem 1.000 ações em depósito, 300 em garantia e 150 reservadas para entrega, sem sobreposição. Qual é o saldo livre?', ['700','850','450','550'],3,'O saldo livre é 1.000 menos 300 e menos 150, igual a 550.'],
 ['Uma oferta é rejeitada pelo túnel de rejeição aplicável. Qual é o efeito?', ['O ativo é transferido para a depositária','A oferta fica impedida de entrar no livro','O negócio ocorre ao último preço','A oferta vira uma execução obrigatória'],1,'O túnel de rejeição atua sobre o ingresso da oferta no livro.'],
 ['Um intermediário compara registro em balcão organizado com garantia de revenda. Qual conclusão é adequada?', ['Todo registro garante recompra','O preço fica congelado até a saída','Registrar a operação não garante liquidez para revender','A revenda sempre é feita no livro de ações'],2,'A saída depende do contrato, de contraparte e das condições de mercado.'],
 ['Uma ordem imediata admite execução parcial e cancela o saldo. A oferta encontra 200 unidades elegíveis de um total de 350. Qual o efeito?', ['Executa 200 e cancela 150','Executa 200 e mantém 150','Cancela as 350','Executa 350 a qualquer preço'],0,'A validade aceita execução parcial imediata e cancela as unidades restantes.'],
 ['Um cliente revogou os poderes do representante, mas a informação ainda não chegou a um sistema. Qual é a conduta diante de nova instrução?', ['Executar se o valor for baixo','Substituir o nome do representante pelo nome do cliente','Esperar o fim do pregão para verificar','Verificar os poderes antes de aceitar e atualizar os controles aplicáveis'],3,'A validade dos poderes deve ser confirmada antes de aceitar a instrução.'],
 ['Uma negociação foi executada, mas a posição ainda não aparece no depósito. Qual status deve ser conferido primeiro?', ['O perfil do cliente','A liquidação do negócio','O preço teórico do próximo leilão','A ordem de prioridade das ofertas'],1,'Execução e liquidação são etapas diferentes. Verificar a liquidação ajuda a explicar a ausência da posição.'],
];
const DAY=86400_000;
const COUNT=5;
const sign=(secret,value)=>createHmac('sha256',secret).update('public-demo:'+value).digest('base64url');
function tokenData(secret,token,now){
  if(!/^[\w-]{24}\.\d{13}\.[\w-]{43}$/.test(token??''))return null;
  const index=token.lastIndexOf('.'),value=token.slice(0,index);
  if(!timingSafeEqual(Buffer.from(sign(secret,value)),Buffer.from(token.slice(index+1))))return null;
  const expires=Number(value.split('.')[1]);
  return expires>now&&expires<=now+DAY?{value,expires}:null;
}
export function publicDemo({path,method,body,cookie,secret,now,issueCookie}){
  if(method!=='POST'||!['/api/sample/start','/api/sample/finish'].includes(path))return null;
  let session=tokenData(secret,cookie,now);
  const start=path.endsWith('/start');
  if(!session){
    if(!start)return {status:409,data:{error:'A demonstração expirou. Inicie novamente.'}};
    const value=randomBytes(18).toString('base64url')+'.'+(now+DAY);
    session={value,expires:now+DAY};
    issueCookie(value+'.'+sign(secret,value),86400);
  }
  const ids=bank.map((_,id)=>id).sort((a,b)=>sign(secret,session.value+':'+a).localeCompare(sign(secret,session.value+':'+b))).slice(0,COUNT);
  const questions=ids.map(id=>({id,prompt:bank[id][0],options:bank[id][1]}));
  if(start)return {status:200,data:{questions}};
  const answers=body?.answers;
  if(!answers||typeof answers!=='object'||Array.isArray(answers)||Object.keys(answers).length!==COUNT||
    !ids.every(id=>Object.hasOwn(answers,id)&&Number.isInteger(answers[id])&&answers[id]>=0&&answers[id]<4))
    return {status:400,data:{error:'Responda às cinco questões antes de finalizar.'}};
  const review=questions.map(q=>({...q,answer:answers[q.id],correct:bank[q.id][2],explanation:bank[q.id][3]}));
  return {status:200,data:{review,score:review.filter(q=>q.answer===q.correct).length}};
}
