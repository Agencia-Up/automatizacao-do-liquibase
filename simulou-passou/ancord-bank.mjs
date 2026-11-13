import {certificationPilot,certificationSpecs} from './certification-specs.mjs';

const conceptSet={
 'Atividade do assessor':[
 ['Um assessor pede a senha pessoal da conta para transmitir ordens com agilidade. Como deve proceder?','Usar o canal autorizado do intermediário, sem solicitar credenciais do cliente.','O acesso à conta com senha pessoal extrapola a atuação autorizada e compromete a identificação da ordem.','Compartilhar a senha apenas com a mesa.','Registrar a senha no cadastro.','Usá-la com autorização verbal.'],
 ['Um cliente pergunta se o assessor pode assinar uma ordem em seu nome como procurador. Qual orientação cabe?','O assessor deve receber e transmitir a instrução pelo canal autorizado, sem assumir a posição de procurador do cliente perante o intermediário.','A atuação de preposto do intermediário não autoriza representar o cliente como procurador para operar.','Pode, se o cliente for qualificado.','Pode, se o instrumento tiver firma reconhecida.','Pode, sempre que haja uma ordem por escrito.'],
 ['Um assessor grava uma apresentação sobre produto oferecido pela instituição. Como deve identificar seu papel?','Deixar claro o vínculo e a instituição pela qual atua.','Identificar o vínculo esclarece a responsabilidade do intermediário e a natureza da atividade.','Apresentar-se como gestor autônomo da carteira.','Omitir a instituição até depois da compra.','Apresentar-se como representante da CVM.'],
 ['Um cliente pede a emissão de relatório público com preços-alvo, como serviço independente do intermediário. Qual distinção importa?','A elaboração profissional de relatório de análise pertence a atividade regulada distinta.','Prestar informação no contexto da distribuição difere de exercer a atividade de analista.','Todo assessor pode exercer análise pela mesma certificação.','A análise é automaticamente autorizada quando o relatório é gratuito.','Preços-alvo transformam o relatório em simples registro de ordem.'],
 ['Um assessor pretende iniciar atividades antes de concluir o credenciamento. Qual a conduta adequada?','Aguardar os requisitos de credenciamento, registro aplicável e vínculo antes de exercer a atividade.','A aprovação em prova integra o processo e não substitui as condições para o exercício profissional.','Iniciar apenas para conhecidos.','Atender clientes enquanto aguarda a documentação.','Transmitir ordens em nome de outro assessor.'],
 ['Uma corretora terceiriza a captação para assessores. Quem responde pela atuação como preposto no âmbito da distribuição?','O intermediário, conforme os deveres de supervisão aplicáveis.','O vínculo com assessor não elimina o dever do intermediário de supervisionar sua atividade.','Somente o emissor do produto.','Somente a instituição que liquida as ordens.','O cliente, por escolher o canal.'],
 ['Um assessor identifica que sua remuneração é maior em um produto comparado. Qual providência preserva a qualidade da orientação?','Seguir as regras de transparência e avaliação de conflitos, considerando a adequação ao cliente.','A remuneração pode gerar conflito. A avaliação precisa considerar o perfil e os deveres de transparência.','Omitir a remuneração para evitar influenciar o cliente.','Recomendar o produto que mais remunera a distribuição.','Substituir a análise por uma comparação de marcas.'],
 ['Um cliente entrega dinheiro em espécie ao assessor para aplicação no dia seguinte. Qual orientação cabe?','Recusar o recebimento e indicar o canal oficial do intermediário.','A recepção de ordens não autoriza o assessor a receber diretamente numerário de clientes.','Aceitar se emitir recibo.','Aceitar se depositar em conta própria no mesmo dia.','Aceitar se o valor não for material.'],
 ['Um cliente transmite ordem de compra e depois questiona a quantidade efetivamente enviada. Qual evidência é mais relevante?','O registro da instrução original e a confirmação de transmissão ao intermediário.','Os registros permitem reconstruir a instrução, seus parâmetros e a execução ou recepção.','A cotação de fechamento.','O folder do produto.','A nota de uma operação de outro cliente.'],
 ['Um assessor se desvincula de um intermediário. O cliente acredita que suas posições passaram automaticamente a outra instituição. Qual esclarecimento cabe?','O vínculo do assessor e a transferência de posições são eventos distintos.','Posições e contas seguem os procedimentos de custódia e as instruções válidas do cliente.','A posição sempre acompanha o assessor.','O primeiro intermediário deve liquidar toda posição na data da mudança.','A mudança retroage às ordens já liquidadas.'],
 ['Um assessor apresenta dois intermediários com os quais atua. O que ajuda o investidor a entender uma ordem específica?','Identificar o intermediário, o canal aplicável e os serviços vinculados àquela ordem.','A transparência do vínculo e do canal deixa clara a instituição responsável pela execução pretendida.','Omitir o intermediário até a liquidação.','Usar um canal pessoal para os dois.','Usar ordens de um intermediário na conta do outro.'],
 ['Uma pessoa pede uma análise de toda a carteira e delega ao assessor a prestação de consultoria independente. Como delimitar o atendimento?','Explicar o alcance da atividade de assessor e encaminhar atividades reguladas distintas ao profissional habilitado.','O escopo do assessor decorre do vínculo de distribuição. A consultoria independente tem requisitos próprios.','Oferecer consultoria independente usando a certificação de assessor.','Atender enquanto não houver cobrança.','Transformar a cobrança em comissão para dispensar a habilitação.'],
 ],
 'PLD/FTP e suitability':[
 ['Uma conta opera por meio de terceiros sem justificativa aparente. Qual providência é adequada?','Registrar e encaminhar os indícios para revisão conforme o fluxo de PLD/FTP.','A análise deve considerar o perfil, a finalidade e o padrão observado.','Avisar a contraparte antes de registrar.','Arquivar porque as operações liquidaram.','Examinar somente a última transferência.'],
 ['Uma nova recomendação depende de prazo de resgate. O perfil informa necessidade de liquidez imediata. O que deve ser avaliado?','Se a disponibilidade e o risco do produto atendem ao objetivo e ao perfil.','Prazo e liquidez são relevantes à adequação.','Apenas o retorno projetado.','Somente a taxa de administração.','Apenas o patrimônio total.'],
 ['Na análise de uma entidade, o procurador foi confundido com quem exerce o controle final. O que revisar?','A estrutura de propriedade e controle com base na documentação aplicável.','Representação por mandato e controle final são relações distintas.','Somente a carteira de investimentos.','A ordem de assinatura dos documentos.','O saldo da conta no último dia.'],
 ['Um investidor se torna pessoa exposta politicamente. Qual encaminhamento é adequado?','Atualizar a avaliação e adotar os procedimentos de diligência aplicáveis ao risco.','A condição integra a análise e não implica uma conclusão automática sobre a licitude das operações.','Encerrar toda conta automaticamente.','Ignorar a condição se o cadastro for antigo.','Comunicar as suspeitas diretamente ao cliente.'],
 ],
 'Economia':[
 ['A taxa nominal foi de 8% e a inflação de 5%. Qual expressão dá o retorno real exato?','1,08 ÷ 1,05 − 1.','O retorno real desconta a inflação pelo quociente de fatores.','0,08 + 0,05.','0,08 × 0,05.','1,05 ÷ 1,08 − 1.'],
 ['Em igualdade das demais condições, qual efeito inicial sinaliza uma elevação da taxa básica de juros?','Crédito tende a encarecer e a demanda tende a perder impulso.','Juros mais altos aumentam o custo financeiro e podem desestimular consumo e investimento.','O custo do crédito cai automaticamente.','A oferta agregada sobe de imediato.','A meta de inflação sobe na mesma proporção.'],
 ],
 'Sistema Financeiro Nacional':[
 ['Qual órgão estabelece diretrizes gerais de política monetária e de crédito?','Conselho Monetário Nacional.','O CMN exerce a função normativa geral nessa esfera.','CVM.','B3.','FGC.'],
 ['Quem supervisiona o mercado de valores mobiliários segundo sua competência legal?','CVM.','A CVM regula e fiscaliza atividades no mercado de valores mobiliários.','Tesouro Nacional.','ANBIMA.','Ministério da Fazenda isoladamente.'],
 ['Qual função está associada ao Sistema de Pagamentos Brasileiro?','Permitir transferências e liquidação de obrigações nos sistemas pertinentes.','O SPB reúne entidades, sistemas e procedimentos para transferências e liquidações.','Definir a alíquota de imposto de renda.','Determinar ofertas em pregão.','Administrar a política de dividendos das companhias.'],
 ],
 'Instituições e intermediários':[
 ['Qual característica distingue a atividade de uma corretora de valores mobiliários?','Intermediar operações dos clientes nos mercados em que está autorizada a atuar.','A corretora atua como intermediária dentro das autorizações e regras aplicáveis.','Emitir moeda.','Conceder obrigatoriamente garantia de recompra.','Definir a meta nacional de inflação.'],
 ['Em uma cooperativa de crédito, qual relação caracteriza o quadro social?','Os associados são também participantes da sociedade cooperativa.','Uma cooperativa é organizada em torno de seus associados e segue regras próprias.','Os clientes são acionistas da B3.','Os depositantes se tornam automaticamente servidores públicos.','O capital é subscrito exclusivamente pelo Tesouro.'],
 ['Na comparação entre banco comercial e intermediário de bolsa, qual atividade é típica do banco comercial?','Captar depósitos à vista e operar crédito conforme suas autorizações.','A captação de depósitos à vista e a concessão de crédito são atividades típicas de banco comercial.','Formar o livro central de ofertas.','Fixar margens de futuros da B3.','Publicar o gabarito de certificação.'],
 ],
 'Administração de risco':[
 ['Um fundo concentra posição em um ativo pouco negociado. O resgate exige venda rápida. Qual risco aparece de forma mais direta?','Liquidez.','A venda rápida pode exigir desconto ou não encontrar contraparte.','Crédito soberano exclusivamente.','Risco de câmbio necessariamente.','Risco de cupom fixo.'],
 ['Por que a diversificação entre emissores reduz parte do risco de uma carteira?','Porque reduz a exposição a eventos específicos de um só emissor.','Diversificação atenua riscos idiossincráticos. Eventos sistêmicos podem afetar vários ativos.','Porque elimina todas as perdas.','Porque fixa a taxa de retorno.','Porque elimina a correlação entre todos os ativos.'],
 ['O VaR é informado para um horizonte e um nível de confiança. Como interpretá-lo?','Como limite estimado que pode ser superado nas condições de cauda.','O VaR é quantil estimado da perda e depende do horizonte, do nível e do modelo.','Como perda máxima possível.','Como garantia contratual de rentabilidade.','Como perda média exatamente igual em todos os dias.'],
 ['Um sistema duplica uma instrução após falha de processamento. Qual risco se materializou?','Operacional.','A falha de processo ou sistema é fonte de risco operacional.','Mercado, exclusivamente.','Crédito soberano.','Cambial, independentemente do ativo.'],
 ],
 'Fundos de investimento':[
 ['Qual o efeito direto de elevação do passivo de uma classe, com ativos e número de cotas constantes?','Cai o valor patrimonial por cota.','O patrimônio líquido é ativo menos passivo.','Sobe o valor da cota.','O patrimônio líquido permanece fixo.','A quantidade de cotas dobra.'],
 ['Qual diferença caracteriza um fundo de gestão passiva atrelado a um índice?','Busca acompanhar o índice de referência dentro da política.','A estratégia procura replicar ou acompanhar um referencial.','Garante retorno superior ao índice.','Proíbe qualquer variação da cota.','Escolhe os ativos apenas para superar o índice.'],
 ['Qual documento ajuda a conferir os limites e a política de investimento de uma classe?','O regulamento e os documentos da classe aplicáveis.','A política e os limites estão formalizados na documentação do fundo e da classe.','A nota de corretagem de um cotista.','O código de negociação das ações investidas.','O extrato de outra classe.'],
 ['Por que prazo de cotização e prazo de pagamento de um resgate precisam ser identificados separadamente?','Porque um define a conversão da cota e o outro a disponibilização dos recursos.','Os prazos têm funções distintas e afetam a liquidez do investimento.','Porque todo pagamento ocorre antes da cotização.','Porque a cotização determina a taxa básica de juros.','Porque todo fundo usa os mesmos prazos.'],
 ],
 'Anexos da Resolução CVM 175':[
 ['Qual veículo tem a aplicação em direitos creditórios como característica central?','FIDC.','O Fundo de Investimento em Direitos Creditórios tem esse tipo de ativo como objeto característico.','ETF de ações.','Clube de investimento.','Fundo cambial simples.'],
 ['Qual veículo é voltado à participação em sociedades e ao acompanhamento das investidas, conforme seus requisitos?','FIP.','O Fundo de Investimento em Participações investe nos instrumentos elegíveis e observa o papel nas investidas previsto na norma.','Fundo de renda fixa referenciado ao CDI.','CDB.','Fundo cambial.'],
 ],
 'Securitização de recebíveis':[
 ['Uma companhia transforma uma carteira de recebíveis em lastro para valores mobiliários. Qual risco deve ser analisado?','A qualidade e o fluxo dos créditos que servem de lastro.','A capacidade de pagar os títulos depende da estrutura e do desempenho dos recebíveis.','A cotação de qualquer empresa do mesmo setor.','A garantia universal de pagamento pela B3.','A eliminação automática do risco de inadimplência.'],
 ],
 'Clubes de investimento':[
 ['De que forma um participante de clube tem exposição às ações da carteira?','Por sua participação em cotas do clube.','O clube investe coletivamente. O participante detém cotas.','Pela aquisição automática de cada ação na própria conta.','Por um título prefixado emitido pela administradora.','Por ter garantia de recompra pelo emissor das ações.'],
 ['Um clube deseja operar fora das regras do seu regulamento. O que deve orientar o administrador?','O regulamento e os limites da regulamentação aplicável.','A decisão coletiva deve respeitar a estrutura e os limites normativos do clube.','Somente a preferência do cotista com maior retorno.','Somente o preço da cota.','A estratégia de um fundo de outro administrador.'],
 ],
 'Outros produtos financeiros':[
 ['Em um título prefixado sem cupom, o que ocorre com o preço se a taxa exigida aumenta e o fluxo futuro não muda?','O preço cai.','A taxa maior reduz o valor presente do mesmo fluxo.','O preço sobe.','O preço permanece sempre no valor de resgate.','O fluxo contratado aumenta automaticamente.'],
 ['Qual é a função econômica de um CDB para o banco emissor?','Captar recursos, assumindo obrigação de remunerar o investidor conforme o título.','O CDB é instrumento de captação bancária.','Emitir participação societária no banco.','Substituir o livro de ordens da bolsa.','Entregar ao investidor uma cota de fundo imobiliário.'],
 ['Um título indexado à inflação combina índice de preços e taxa real contratada. Qual risco permanece se houver venda antecipada?','Marcação a mercado.','Mudanças nas taxas exigidas afetam o valor de negociação antes do vencimento.','Perda automática do valor nominal por usar um índice.','Ausência de contraparte em qualquer cenário.','Garantia de preço igual ao da compra.'],
 ['Qual instrumento representa obrigação emitida pelo Tesouro Nacional, dentro do conjunto de títulos públicos federais?','Tesouro Selic.','O Tesouro Selic é título público federal.','CDB.','Letra Financeira bancária.','Cota de fundo de renda fixa.'],
 ['Uma empresa tem compromisso em dólares e já dispõe de parte da moeda. Qual valor constitui exposição líquida dessa obrigação?','A parcela do compromisso ainda sem cobertura na moeda.','Recursos disponíveis na mesma moeda e no mesmo prazo reduzem a exposição efetiva.','O compromisso bruto mais os dólares em caixa.','A diferença entre as taxas de compra e venda do banco.','O total do patrimônio da empresa em reais.'],
 ['Até o vencimento, qual risco diferencia depósitos de emissores distintos com a mesma taxa contratada?','A capacidade de pagamento do emissor e as proteções aplicáveis ao instrumento.','Taxas iguais não igualam riscos de crédito.','A ordem alfabética dos emissores.','A cotação da ação de instituição não relacionada.','A quantidade de casas decimais da taxa.'],
 ['Em uma cotação de câmbio, por que o cliente que compra moeda usa normalmente a taxa de venda da instituição?','Porque a instituição está vendendo a moeda ao cliente.','A nomenclatura de compra e venda é da perspectiva da instituição que forma a cotação.','Porque a instituição compra a moeda do cliente.','Porque a taxa de venda é sempre a média das duas.','Porque as duas taxas são obrigatoriamente iguais.'],
 ],
};
const sections={
 'Atividade do assessor':'I','PLD/FTP e suitability':'III','Economia':'IV','Sistema Financeiro Nacional':'V',
 'Instituições e intermediários':'VI','Administração de risco':'VII','Mercado de capitais':'VIII','Fundos de investimento':'IX',
 'Anexos da Resolução CVM 175':'X','Securitização de recebíveis':'XI','Clubes de investimento':'XII','Matemática financeira':'XIII',
 'Outros produtos financeiros':'XIV','Derivativos':'XV',
};
const concept=(subject,[prompt,correct,explanation,...other])=>({subject,prompt,correct,explanation,other});
const models=Object.entries(conceptSet).flatMap(([subject,entries])=>entries.map(row=>concept(subject,row)));
models.push(...certificationPilot.filter(q=>q.certification==='ancord').map(q=>({
  subject:q.subject,prompt:q.prompt,correct:q.options[q.correct],explanation:q.feedback[q.correct],other:q.options.filter((_,i)=>i!==q.correct),
})));
const money=value=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function add(subject,prompt,correct,explanation,other){models.push({subject,prompt,correct,explanation,other});}
for(const [company,shares,cost,sale,fees] of [['Ônix',250,24,26,70],['Duna',400,18,17,60],['Arco',180,42,45,90],['Aurora',320,27,29,80],['Cedro',550,12,11,55],['Ipê',600,31,32,120],['Orla',200,34,38,50],['Rio',500,13,15,100]]){
 const gross=shares*(sale-cost),net=gross-fees;
 add('Mercado de capitais',`Uma operação à vista em ${company} começa com compra de ${shares} ações a ${money(cost)} e termina com venda a ${money(sale)} por ação. Os custos somam ${money(fees)}. Qual é o resultado líquido antes de tributos?`,money(net),
  `Calcule a diferença por ação, multiplique por ${shares} e deduza os custos. O resultado líquido é ${money(net)}.`,[money(gross),money(gross+fees),money(-net)]);
}
for(const [company,qty,cents] of [['Amparo',1100,60],['Serra',800,125],['Norte',1350,40],['Vila',1600,75],['Ponte',350,160],['Brisa',2250,88]]){
 add('Mercado de capitais',`Na data-base do dividendo de ${company}, uma conta tem ${qty} ações elegíveis. A companhia paga ${money(cents/100)} por ação. Qual é o crédito bruto?`,money(qty*cents/100),
  `Multiplique a posição elegível de ${qty} ações pelo valor unitário do dividendo.`,[money((qty+200)*cents/100),money((qty-200)*cents/100),money(qty)]);
}
const marketConcepts=[
 ['Uma companhia realiza sua primeira emissão de ações e recebe os recursos captados. Em qual mercado ocorre essa captação?','Primário.','Os recursos da colocação inicial da emissão são direcionados à companhia.','Secundário.','Interbancário de câmbio.','Derivativos exclusivamente.'],
 ['Dois investidores compram e vendem entre si ações já emitidas em bolsa. Quando a companhia capta recursos com esse negócio?','A negociação entre investidores não destina recursos à companhia emissora.','Negócios no secundário transferem a posição entre investidores.','Em toda venda feita em bolsa.','A cada vez que a cotação sobe.','Somente se o comprador usar ordem limitada.'],
 ['Qual instrumento representa participação no capital social de companhia aberta?','Ação.','Ações representam frações do capital social.','Debênture.','CDB.','Contrato futuro de dólar.'],
 ['Um cliente já possui uma ordem de venda limitada. O que o limite indica para essa venda?','O menor preço aceito na operação.','A ordem de venda pode executar no limite ou em preço mais favorável.','O maior preço aceito.','A garantia de execução total imediata.','O preço de fechamento da ação.'],
 ['Em um livro com prioridade preço-tempo, quais vendas precedem as demais para uma compra compatível?','Primeiro as de menor preço e, no mesmo preço, as mais antigas.','O melhor preço de venda vem antes. O tempo desempata no mesmo nível.','Primeiro todas as ordens antigas, quaisquer que sejam os preços.','Primeiro as de maior preço.','Sempre as de maior quantidade.'],
 ['Uma compra já foi executada, mas a entrega financeira e do ativo ainda não ocorreu. Qual etapa falta cumprir?','Liquidação.','A liquidação materializa o cumprimento das obrigações do negócio.','Descoberta de preço.','Captação primária.','Emissão de nova ação.'],
 ['Para que serve a Câmara quando atua como contraparte central?','Interpor-se às obrigações aceitas e administrar o risco segundo suas regras.','A interposição altera a relação de contraparte e vem acompanhada de controles.','Fixar preço de todos os negócios de bolsa.','Distribuir todos os dividendos das companhias por conta própria.','Eliminar toda possibilidade de falha.'],
 ['O acionista quer identificar sua exposição a uma companhia estrangeira por certificado negociado no Brasil. Qual instrumento descreve esse acesso?','BDR.','O BDR é certificado negociável no Brasil lastreado em valores mobiliários elegíveis no exterior.','CDB.','Tesouro Selic.','LCA.'],
 ['Uma investidora compara ação ordinária e debênture da mesma companhia. Qual distinção básica se aplica?','A ação representa participação societária e a debênture representa dívida.','Os instrumentos conferem direitos econômicos e jurídicos distintos.','Ambas são ações com voto.','A debênture representa sempre o capital social.','A ação é dívida prefixada da companhia.'],
 ['Uma sessão de leilão forma o preço antes de executar o conjunto de ofertas elegíveis. Qual informação o preço teórico fornece enquanto aberto?','Uma estimativa que pode mudar até o fechamento.','O preço teórico varia quando a composição das ofertas altera os critérios de formação.','A garantia de execução de toda oferta.','A cotação garantida para a sessão inteira.','A data da entrega física do ativo.'],
];
models.push(...marketConcepts.map(row=>concept('Mercado de capitais',row)));
for(const [capital,rate,months] of [[5000,2,3],[7800,1.5,4],[12000,2.5,2]]){
 const simple=capital*rate/100*months;
 add('Matemática financeira',`Calcule os juros simples sobre ${money(capital)} a ${rate.toLocaleString('pt-BR')}% ao mês por ${months} meses.`,money(simple),`J = capital × taxa mensal × prazo = ${money(simple)}.`,[money(capital*rate/100),money(capital+simple),money(capital*((1+rate/100)**months-1))]);
}
for(const [capital,rate,months] of [[9500,1,2],[16000,2,3],[6000,3,4]]){
 const compound=capital*(1+rate/100)**months;
 add('Matemática financeira',`Um capital de ${money(capital)} rende ${rate}% ao mês por juros compostos durante ${months} meses. Qual é o montante aproximado?`,money(compound),`Multiplique o principal pelo fator mensal elevado ao número de períodos. O montante é ${money(compound)}.`,[money(capital*(1+rate/100*months)),money(compound-capital),money(capital)]);
}
for(const [strike,premium,spot] of [[30,2,37],[65,3,77],[120,6,132],[15,1,20]]){
 const net=spot-strike-premium;
 add('Derivativos',`Uma opção de compra tem exercício a ${money(strike)} e prêmio de ${money(premium)}. No vencimento, o ativo vale ${money(spot)}. Sem custos adicionais, qual é o lucro do titular por unidade?`,money(net),`O valor de exercício é ${money(spot-strike)}. Deduzido o prêmio, sobra ${money(net)}.`,[money(spot-strike),money(-net),money(spot-strike+premium)]);
}
for(const [contracts,delta,point] of [[5,120,2],[8,65,10],[2,250,1],[11,80,5]]){
 const value=contracts*delta*point;
 add('Derivativos',`Uma posição comprada tem ${contracts} contratos futuros. O ajuste cai ${delta} pontos, e cada ponto vale ${money(point)} por contrato. Qual ajuste financeiro decorre desse movimento?`,`Débito de ${money(value)}.`,`A queda gera débito para o comprado. Multiplique os pontos pelo valor por ponto e pela quantidade de contratos.`,[`Crédito de ${money(value)}.`,`Débito de ${money(delta*point)}.`,`Débito de ${money(contracts*point)}.`]);
}
const derivativeConcepts=[
 ['Uma exportadora espera receber dólares e teme queda da moeda frente ao real. Que posição futura reduz esse risco?','Venda de futuro de dólar dimensionada à exposição.','A perda na conversão pode ser compensada por ganho na posição vendida, sujeito a diferenças entre preço e exposição.','Compra de futuro de dólar.','Compra de futuro de taxa de juros sem relação com o câmbio.','Venda de opção de venda sem outra cobertura.'],
 ['Que característica diferencia titular e lançador de opção?','O titular adquire um direito e o lançador assume obrigação perante o exercício.','O prêmio é pago pelo titular pela aquisição do direito.','Ambos adquirem direito idêntico de exercício.','O lançador sempre paga o prêmio ao titular.','O titular sempre é obrigado a exercer.'],
 ['Que efeito é típico dos ajustes diários de futuros?','Reconhecer ganhos e perdas das posições ao longo da vigência conforme o preço de ajuste.','O resultado é marcado e ajustado, sem esperar somente pelo vencimento.','Pagar todo o resultado apenas na montagem.','Transformar o contrato em uma opção.','Eliminar o risco de variação.'],
 ['Uma empresa tem passivo indexado ao CDI e quer trocar essa exposição por taxa prefixada. Qual instrumento permite troca de fluxos de índices?','Swap.','O swap permite trocar exposições conforme as pontas e condições contratadas.','Ação ordinária.','Cota de clube.','BDR.'],
 ['Num futuro, a posição vendida teve ajuste favorável. O que ocorreu com o preço de ajuste, mantidos os demais elementos?','Caiu.','O vendido ganha com a queda do preço de ajuste, mantida a posição.','Subiu necessariamente.','Ficou sempre igual.','A direção é independente do lado da posição.'],
 ['Uma proteção futura cobre quantidade próxima, mas o ativo local e o futuro não se movem na mesma intensidade. Que risco resta?','Risco de base.','Diferenças no comportamento dos preços podem reduzir a efetividade do hedge.','Risco de não existir vencimento.','Risco de cupom obrigatório.','Risco de voto societário.'],
 ];
models.push(...derivativeConcepts.map(row=>concept('Derivativos',row)));
const moduleMinimums=certificationSpecs.ancord.subjectCounts;
for(const [subject,minimum] of Object.entries(moduleMinimums)){
 if(models.filter(q=>q.subject===subject).length<minimum)throw Error('Banco ANCORD incompleto em '+subject);
}
export const ancordItems=models.map(q=>({...q,module:sections[q.subject],section:'§ VI.1.3, eixo '+sections[q.subject]}));
