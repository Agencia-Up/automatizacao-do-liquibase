// Official exam parameters. ANBIMA module proportions are published in each
// programa detalhado. Per-format counts are not asserted.
export const certificationSpecs={
  ancord:{
    name:'ANCORD — Assessor de Investimentos',durationMinutes:150,questionsPerAttempt:80,minimumCorrect:56,
    source:'https://certpessoas.fgv.br/ancord/arquivos/RegulamentoAI.htm',
    formats:['objective'],
    subjectCounts:{
      'Atividade do assessor':12,'PLD/FTP e suitability':4,'Economia':2,'Sistema Financeiro Nacional':3,
      'Instituições e intermediários':3,'Administração de risco':4,'Mercado de capitais':20,
      'Fundos de investimento':4,'Anexos da Resolução CVM 175':2,'Securitização de recebíveis':1,
      'Clubes de investimento':2,'Matemática financeira':4,'Outros produtos financeiros':7,'Derivativos':12,
    },
    subjectMinimums:{'Atividade do assessor':6,'PLD/FTP e suitability':2,'Mercado de capitais':10,'Derivativos':6},
  },
  cpa:{
    name:'CPA — ANBIMA',durationMinutes:150,questionsPerAttempt:50,minimumCorrect:35,
    source:'https://www.anbima.com.br/data/files/6A/52/6F/A1/BED73910B07B2739B82BA2A8/Programa-Detalhado-CPA-ANBIMA.pdf',
    formats:['objective','case','dialogue'],
    moduleProportions:{'Estrutura e dinâmica do SFN':20,'Produtos do mercado financeiro':40,'Relacionamento com o cliente':30,'Inovação e desenvolvimento de mercado':10},
  },
  'c-pro-r':{
    name:'C-Pro R — ANBIMA',durationMinutes:150,questionsPerAttempt:45,minimumCorrect:32,
    source:'https://www.anbima.com.br/data/files/38/52/0D/A1/BED73910B07B2739B82BA2A8/Programa-Detalhado-C-Pro-R-ANBIMA.pdf',
    formats:['objective','case','dialogue'],
    moduleProportions:{'Prospecção e relacionamento':20,'Análise de informações do cliente':20,'Indicação de investimentos':40,'Análise de portfólio e monitoramento':20},
  },
  'c-pro-i':{
    name:'C-Pro I — ANBIMA',durationMinutes:150,questionsPerAttempt:40,minimumCorrect:28,
    source:'https://www.anbima.com.br/data/files/9B/82/78/94/12793910A5947839EA2BA2A8/Programa-Detalhado-C-Pro-I.pdf',
    formats:['objective','case','dialogue'],
    moduleProportions:{'Produtos de investimentos':40,'Investimentos alternativos, digitais e no exterior':15,'Previdência complementar':25,'Gestão de risco, carteiras e performance':20},
  },
};

// Each scenario is an original exercise. The official programme anchors its topic.
export const certificationPilot=[
 {certification:'ancord',module:'I',subject:'Atividade do assessor',subtopic:'Ordens e atuação vinculada',difficulty:'intermediária',format:'objective',section:'§ VI.1.3, eixo I',
  prompt:'Um investidor assina um mandato para que seu assessor decida sozinho quais ações comprar e vender na conta, sem novas instruções do cliente. Como o assessor deve proceder?',
  options:['Pode operar se o contrato indicar um limite de perda.','Deve recusar a gestão discricionária e atuar dentro das atribuições de assessor.','Pode operar se usar a conta de seu intermediário em vez da conta do cliente.','Pode operar desde que relate todos os negócios depois do fechamento.'],
  correct:1,feedback:['Um limite de perda não muda a natureza da atividade.','A atuação como assessor permite receber, registrar e transmitir ordens dentro de suas atribuições. Decidir operações discricionariamente pertence à administração de carteiras.','A conta utilizada não concede autorização para gerir a carteira.','Um relatório posterior não equivale à autorização para exercer administração discricionária.']},
 {certification:'cpa',module:'2',subject:'Produtos do mercado financeiro',subtopic:'Liquidez e risco de mercado',difficulty:'intermediária',format:'case',section:'§ 2.1, pp. 11–19',
  context:'Uma família guarda recursos para uma despesa certa em seis meses. O valor precisa estar disponível integralmente nessa data. Na agência, a família compara um título prefixado longo, negociável antes do vencimento, com um produto cujo saldo tem pouca oscilação e resgate compatível.',
  prompt:'Qual característica pesa mais para avaliar o título prefixado longo no cenário?',
  options:['A possibilidade de perda caso o título precise ser vendido antes do vencimento.','A garantia de que o preço antes do vencimento será igual ao valor contratado.','A existência de negociação secundária, que elimina toda oscilação.','A constância da taxa contratada, que fixa qualquer preço de revenda.'],
  correct:0,feedback:['O título pode ser vendido antes do vencimento por preço de mercado, que pode cair com a alta das taxas.','O valor contratado no vencimento não determina o preço de venda em seis meses.','Negociar no mercado secundário dá uma via de saída, mas não elimina o risco de preço.','A taxa de contratação afeta o fluxo contratado. O preço de revenda depende da taxa de mercado e das condições no momento.']},
 {certification:'c-pro-r',module:'2',subject:'Análise de informações do cliente',subtopic:'Objetivo e capacidade de risco',difficulty:'intermediária',format:'dialogue',section:'§§ 2.2–2.4, pp. 9–10',
  prompt:'Conduza a conversa sobre o investimento de uma reserva para uma entrada.',
  start:'entrada',nodes:{
    entrada:{speaker:'Cliente',prompt:'Aceito ver a carteira oscilar, mas vou usar parte dela para pagar uma entrada daqui a cinco meses. Quero aplicar tudo em um produto só.',
     choices:[{text:'Vou levantar quanto você precisa e a data de uso antes de analisar a aplicação.',next:'prazo',correct:true,feedback:'A necessidade concreta de liquidez precisa ser dimensionada.'},{text:'Sua tolerância à oscilação já permite aplicar tudo em um ativo volátil.',next:'contorno',correct:false,feedback:'A tolerância declarada não resolve o risco de faltar dinheiro na data certa.'}]},
    prazo:{speaker:'Cliente',prompt:'Preciso de R$ 40 mil nessa data. O restante pode ficar investido por cinco anos.',
     choices:[{text:'Vou avaliar esses dois objetivos separadamente, incluindo o prazo de saída e o risco de perda.',next:null,correct:true,feedback:'Segmentar objetivos permite avaliar a adequação de cada parcela.'},{text:'Como a maior parte fica cinco anos, vou usar esse horizonte para todo o dinheiro.',next:null,correct:false,feedback:'O compromisso de cinco meses continua valendo para os R$ 40 mil.'}]},
    contorno:{speaker:'Cliente',prompt:'Se o investimento cair perto da compra, não terei renda extra para repor a diferença.',
     choices:[{text:'Vou reavaliar a parte da entrada com foco em liquidez e preservação do capital.',next:null,correct:true,feedback:'A informação adicional muda a capacidade de assumir perda naquela parcela.'},{text:'O perfil arrojado justifica a recomendação inicial mesmo assim.',next:null,correct:false,feedback:'O perfil geral não elimina uma necessidade identificada de preservar capital.'}]},
  }},
 {certification:'c-pro-i',module:'4',subject:'Gestão de risco, carteiras e performance',subtopic:'Relação entre risco, correlação e peso',difficulty:'avançada',format:'case',section:'§§ 4.1–4.4, pp. 31–33',
  context:'Dois ativos têm volatilidade anual de 12% cada. Uma carteira aplica metade em cada ativo. A correlação estimada é 0 e o cálculo usa essas estimativas.',
  prompt:'Qual a volatilidade anual estimada da carteira?',
  options:['0%.','6%.','Aproximadamente 8,49%.','12%.'],
  correct:2,feedback:['Correlação zero elimina o termo cruzado, mas as variâncias individuais permanecem.','Seis por cento é o risco ponderado de apenas uma parcela.','A variância é 0,5² × 0,12² + 0,5² × 0,12². Sua raiz é aproximadamente 8,49%.','Doze por cento ocorreria com correlação perfeitamente positiva, mantidos os demais dados.']},
].map(question=>({...question,source:certificationSpecs[question.certification].source,authoredOn:'2026-11-13',reviewStatus:'draft'}));
