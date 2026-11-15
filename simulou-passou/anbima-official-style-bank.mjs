const items=[];

function add(certification,module,subtopic,context,prompt,answer,others,feedback){
  items.push({
    certification,module,subtopic,context,prompt,
    options:[answer,...others],correct:0,
    feedback:[feedback,...others.map(()=>`A alternativa desconsidera uma informação relevante do caso. ${feedback}`)],
    format:'case',difficulty:'advanced',cognitiveLevel:'application',
    editorialStandard:'anbima-2026',
  });
}

// Questões autorais. Os cadernos oficiais orientam estrutura, domínio cognitivo e
// plausibilidade dos distratores; nenhum enunciado abaixo reproduz questão oficial.
add('cpa',1,'Competências do SFN',
  'Uma fintech pretende oferecer conta de pagamento, intermediar valores mobiliários e distribuir seguros. O parecer interno atribuiu a autorização das três atividades a uma única entidade supervisora.',
  'Ao revisar o parecer, qual correção delimita adequadamente as competências envolvidas?',
  'Separar a supervisão prudencial e de pagamentos, a fiscalização do mercado de valores mobiliários e a supervisão securitária conforme cada atividade.',
  ['Submeter as três atividades à bolsa, porque a negociação eletrônica concentra a supervisão.','Atribuir as três atividades ao órgão que define a meta de inflação, por se tratar de política financeira.','Tratar a autorização da conta de pagamento como suficiente para as demais atividades.'],
  'As atividades pertencem a segmentos regulatórios distintos e exigem o enquadramento perante as autoridades competentes em cada mercado.');

add('cpa',1,'Política monetária',
  'A inflação esperada se afasta da meta e o crédito de curto prazo desacelera. Um relatório comercial conclui que a autoridade monetária deve reduzir a taxa básica apenas porque houve menor concessão de empréstimos no último mês.',
  'Qual análise deve anteceder a recomendação apresentada no relatório?',
  'Avaliar o balanço de riscos para a inflação, as expectativas e o horizonte de transmissão, sem inferir a decisão por um indicador isolado de crédito.',
  ['Usar somente o volume de crédito, pois ele determina mecanicamente a decisão sobre a taxa básica.','Comparar a inflação apenas com a variação da bolsa, sem considerar expectativas.','Substituir a análise monetária pelo resultado fiscal de um único mês.'],
  'Decisões de política monetária consideram um conjunto de informações e seus efeitos prospectivos sobre a inflação.');

add('cpa',1,'Infraestrutura de mercado',
  'Após uma compra de títulos, a ordem foi executada e a câmara apurou as obrigações. O comprador recebeu confirmação da negociação, mas os recursos não estavam disponíveis no horário de liquidação.',
  'Qual leitura identifica corretamente o evento e o risco remanescente?',
  'O negócio foi formado, porém pode ocorrer falha na liquidação financeira, sujeita aos mecanismos e procedimentos do sistema.',
  ['A ausência de recursos cancela retroativamente a execução sem qualquer procedimento.','A compensação transfere os recursos antes de verificar a disponibilidade financeira.','A depositária assume a dívida do comprador e conclui a liquidação com recursos próprios.'],
  'Negociação, compensação e liquidação são etapas distintas; a execução não elimina o risco de descumprimento na liquidação.');

add('cpa',1,'Indicadores econômicos',
  'Uma aplicação rendeu 8,2% em doze meses. No mesmo período, o índice de preços relevante para o objetivo do cliente acumulou 5,4%. O material comercial afirma que o poder de compra aumentou exatamente 2,8%.',
  'Como o profissional deve avaliar essa afirmação?',
  'Calcular a variação real pela razão entre os fatores de rendimento e de preços, que resulta em ganho inferior à simples diferença.',
  ['Confirmar 2,8%, porque taxas acumuladas de naturezas diferentes são sempre subtraídas.','Usar somente 8,2%, porque a inflação não altera o poder de compra do resgate.','Somar 8,2% e 5,4%, porque ambos os percentuais ocorreram no mesmo período.'],
  'A taxa real acumulada decorre da comparação entre fatores, e não da subtração direta das taxas.');

add('cpa',2,'Classes e patrimônio segregado',
  'Um fundo possui duas classes com patrimônios segregados. Uma delas enfrenta obrigação superior aos seus ativos, enquanto a outra mantém carteira líquida e sem exposição ao evento.',
  'Antes de informar os cotistas da classe saudável, qual verificação é determinante?',
  'Identificar a classe responsável, o patrimônio vinculado e as regras de responsabilidade previstas na estrutura e nos documentos do fundo.',
  ['Consolidar os patrimônios e ratear a obrigação entre todos os cotistas pela quantidade total de cotas.','Transferir a obrigação para a classe com maior liquidez para evitar atraso.','Usar o patrimônio do administrador como primeira fonte de cobertura da obrigação.'],
  'A segregação patrimonial exige atribuir ativos e obrigações à classe correta antes de avaliar efeitos sobre outros investidores.');

add('cpa',2,'Crédito e custo efetivo',
  'Duas propostas financiam o mesmo valor e prazo. A primeira anuncia taxa menor, mas cobra tarifa inicial e seguro financiado; a segunda apresenta taxa maior e não cobra encargos adicionais.',
  'Que procedimento permite comparar o custo econômico das propostas?',
  'Comparar os fluxos completos e o custo efetivo de cada operação, considerando o momento de cobrança dos encargos.',
  ['Escolher a menor taxa anunciada sem incorporar tarifas ao fluxo.','Somar os percentuais informados, sem relacioná-los ao valor e às datas de pagamento.','Escolher a menor prestação inicial, ainda que o número de parcelas seja diferente.'],
  'A comparação precisa incorporar todos os pagamentos e suas datas, pois taxa nominal e prestação isoladas podem ocultar custos.');

add('cpa',3,'Conflito de interesses',
  'A campanha do mês remunera mais a distribuição de um produto com carência longa. Um cliente precisa de parte dos recursos em quatro meses e pede recomendação ao profissional responsável pela meta.',
  'Qual conduta preserva a qualidade do atendimento diante do conflito?',
  'Tratar o incentivo pelos controles internos e recomendar apenas solução compatível com objetivo, liquidez e perfil do cliente.',
  ['Priorizar o produto da campanha e registrar que o cliente aceitou a carência.','Apresentar apenas a rentabilidade projetada, deixando o prazo de saída para a etapa de contratação.','Dividir o aporte igualmente entre o produto incentivado e uma alternativa líquida, sem dimensionar a necessidade.'],
  'Metas comerciais não substituem a análise de adequação nem o tratamento transparente dos conflitos de interesses.');

add('cpa',3,'PLD e monitoramento',
  'Uma conta recém-aberta recebe diversos créditos de terceiros sem relação aparente com a atividade declarada e solicita transferência imediata para outra jurisdição. Cada crédito isolado está abaixo do parâmetro interno de alerta.',
  'Qual providência é tecnicamente adequada diante do padrão observado?',
  'Analisar o conjunto das movimentações, documentar os indícios e seguir o fluxo interno de escalonamento com confidencialidade.',
  ['Arquivar o caso porque cada crédito, examinado separadamente, ficou abaixo do parâmetro.','Informar o cliente de que a operação será comunicada antes da conclusão da análise.','Fracionar a transferência de saída para aproximá-la do padrão histórico da conta.'],
  'O monitoramento considera o comportamento agregado e a compatibilidade com o perfil, preservando os procedimentos e o sigilo.');

add('cpa',3,'Proteção de dados',
  'Um fornecedor investigará falha que atingiu cinquenta clientes. Para acelerar o trabalho, pede a base integral de correntistas, incluindo documentos, renda e extratos sem relação com o incidente.',
  'Como a instituição deve estruturar o acesso necessário à investigação?',
  'Restringir dados, pessoas e prazo ao necessário para a finalidade, com autorização, registro e controle de acesso.',
  ['Enviar a base completa porque a assinatura de contrato substitui a análise de necessidade.','Remover apenas os nomes e manter documentos e extratos de toda a base.','Liberar cópia permanente da base para evitar novo pedido em incidentes futuros.'],
  'A finalidade específica exige minimização, governança de acesso e rastreabilidade do tratamento realizado.');

add('cpa',4,'IA e validação de informação',
  'Uma ferramenta de inteligência artificial redigiu comparação entre dois investimentos e atribuiu garantia pública a um produto que não possui essa cobertura. O texto está fluente e será enviado em campanha automatizada.',
  'Qual controle deve ser aplicado antes da divulgação?',
  'Validar características, riscos e fontes em documentação confiável e manter revisão humana responsável pelo conteúdo.',
  ['Publicar o texto porque a clareza da linguagem indica confiabilidade técnica.','Retirar o nome da ferramenta e manter a afirmação sobre a garantia.','Enviar a campanha a uma amostra de clientes e corrigir apenas se houver reclamação.'],
  'Conteúdo automatizado pode conter afirmações incorretas; a instituição continua responsável pela validação das informações.');

add('cpa',4,'Open Finance e consentimento',
  'Um aplicativo solicita acesso a saldo, transações e produtos por prazo indeterminado para oferecer uma simulação pontual de orçamento. A tela apresenta uma única opção para autorizar todos os dados.',
  'Qual ajuste torna o pedido coerente com a finalidade apresentada?',
  'Limitar escopo e duração aos dados necessários, informar a finalidade e permitir decisão consciente do cliente.',
  ['Manter acesso indeterminado porque o cliente pode revogar depois.','Acrescentar dados de seguros ao mesmo pedido para ampliar a precisão futura.','Condicionar o uso básico do aplicativo ao compartilhamento integral de todos os dados.'],
  'Consentimento e compartilhamento devem ser específicos, informados e proporcionais à finalidade do serviço.');

add('c-pro-r',1,'Diagnóstico do cliente',
  'Um cliente afirma ter perfil arrojado e pede produto ilíquido. Durante a conversa, revela que a renda varia, não possui reserva de emergência e precisará financiar despesas médicas de um familiar nos próximos meses.',
  'Como o profissional deve conduzir a análise antes de recomendar?',
  'Dimensionar obrigações, fontes de renda, liquidez necessária e capacidade de suportar perda, confrontando-as com a declaração de tolerância.',
  ['Usar apenas o perfil declarado, porque a tolerância ao risco prevalece sobre a situação financeira.','Recomendar o produto e sugerir crédito caso a despesa ocorra antes do vencimento.','Considerar somente a renda média anual, sem avaliar sua sazonalidade e os compromissos próximos.'],
  'A tolerância subjetiva precisa ser analisada junto com a capacidade financeira e os objetivos com data definida.');

add('c-pro-r',1,'Vieses e comunicação',
  'Depois de três ganhos consecutivos, uma investidora concentra a carteira e atribui o resultado exclusivamente à própria habilidade. Ela descarta cenários negativos e quer dobrar a posição.',
  'Qual abordagem ajuda a reduzir o viés sem substituir a decisão da cliente?',
  'Apresentar a contribuição do mercado, cenários de perda e efeito da concentração, verificando se a decisão permanece compatível com os objetivos.',
  ['Confirmar a habilidade demonstrada pelos ganhos e usar o resultado recente como projeção.','Evitar discutir perdas para não interferir na confiança da investidora.','Comparar apenas com outro ativo que também subiu no mesmo período.'],
  'A análise amplia as evidências consideradas e reduz excesso de confiança e viés de resultado recente.');

add('c-pro-r',1,'Relacionamento e adequação',
  'Um empresário pede recomendação idêntica à carteira de um colega. Ambos declaram perfil moderado, mas o empresário concentra renda e patrimônio no próprio setor, enquanto o colega possui renda estável e carteira diversificada.',
  'Qual resposta demonstra uma abordagem consultiva adequada?',
  'Explicar que o mesmo rótulo de perfil não substitui a análise de concentração, objetivos, liquidez e capacidade de perda de cada pessoa.',
  ['Replicar a carteira porque a classificação de perfil é igual.','Usar o retorno obtido pelo colega como evidência suficiente de adequação.','Comparar apenas a idade dos dois clientes antes de copiar a alocação.'],
  'A recomendação depende do contexto financeiro completo; classificações semelhantes podem esconder exposições e necessidades diferentes.');

add('c-pro-r',2,'Balanço patrimonial pessoal',
  'Uma família possui imóvel de uso próprio, participação minoritária em empresa fechada e pequena reserva líquida. O patrimônio total é elevado, mas as despesas anuais dependem da renda do negócio.',
  'Qual leitura evita superestimar a capacidade de assumir risco?',
  'Separar patrimônio de liquidez, avaliar concentração, estabilidade da renda e recursos disponíveis para compromissos e emergências.',
  ['Usar o patrimônio total como caixa disponível porque todos os ativos têm valor econômico.','Desconsiderar a empresa fechada apenas porque não existe cotação diária.','Classificar a família como alta capacidade de risco com base somente no valor do imóvel.'],
  'Capacidade de risco depende da conversão dos ativos em recursos, da concentração e dos fluxos necessários, não apenas do patrimônio bruto.');

add('c-pro-r',2,'Fluxo de caixa e dívida',
  'Uma profissional autônoma recebe valores sazonais, paga dívida indexada a taxa flutuante e quer investir o excedente médio mensal em produto com carência de dois anos.',
  'Que ajuste deve ser feito no diagnóstico antes de definir o aporte recorrente?',
  'Testar meses de menor receita, variação do serviço da dívida e reserva de liquidez antes de comprometer o excedente médio.',
  ['Usar o melhor mês de receita como base para aumentar o aporte.','Ignorar a indexação da dívida porque as parcelas atuais estão em dia.','Aplicar o excedente médio integral e cobrir meses fracos com nova dívida.'],
  'Médias podem ocultar descasamentos; cenários de baixa renda e aumento do custo da dívida afetam a capacidade de poupança.');

add('c-pro-r',4,'Rebalanceamento e tributação',
  'Uma carteira se afastou dos pesos-alvo após forte valorização de ações. A venda integral do excesso realiza ganho tributável relevante, e haverá novo aporte dentro de quinze dias.',
  'Qual estratégia deve ser comparada com a venda imediata antes de executar o rebalanceamento?',
  'Direcionar o novo aporte às classes abaixo do peso e medir o desvio residual, custos e risco de esperar.',
  ['Manter o desvio sem prazo porque a valorização prova que o peso atual é adequado.','Vender também as classes abaixo do peso para reconstruir toda a carteira em dinheiro.','Calcular somente o imposto da venda, sem avaliar o risco da concentração durante a espera.'],
  'Fluxos de entrada podem reduzir vendas e custos, mas o profissional precisa avaliar o desvio e o risco até o aporte.');

add('c-pro-r',4,'Risco de sequência',
  'Um cliente iniciará retiradas mensais de uma carteira volátil. Duas projeções têm o mesmo retorno médio, mas uma concentra perdas nos primeiros anos e a outra no final do horizonte.',
  'Por que as projeções podem produzir patrimônios finais diferentes?',
  'As retiradas após perdas iniciais reduzem a base capaz de participar da recuperação, tornando a ordem dos retornos relevante.',
  ['O retorno médio deixa de existir quando há qualquer retirada.','Perdas finais consomem necessariamente mais cotas do que perdas iniciais.','A ordem dos retornos só altera o resultado quando não existem retiradas.'],
  'Fluxos de saída interagem com a sequência dos retornos; médias iguais não asseguram o mesmo resultado em desacumulação.');

add('c-pro-r',4,'Monitoramento de objetivos',
  'Uma meta de educação foi atualizada por inflação acima da prevista. A carteira acumulou retorno positivo, mas o valor projetado para a data do pagamento ficou abaixo da nova necessidade.',
  'Qual indicador deve orientar a revisão do plano?',
  'A probabilidade de atingir o valor atualizado no prazo, considerando aportes, risco e liquidez, e não apenas o retorno acumulado.',
  ['O retorno nominal positivo, porque ele demonstra cumprimento da meta.','A posição da carteira em um ranking mensal, sem relação com o passivo.','O preço de aquisição dos ativos, mantido como referência para decidir os próximos aportes.'],
  'Monitorar objetivos exige comparar recursos projetados com o passivo atualizado e a data em que o dinheiro será necessário.');

add('c-pro-i',1,'Liquidez de renda variável',
  'Uma carteira temática de ações de menor capitalização sofreu queda do volume negociado, aumento do spread e maior participação da própria ordem no volume diário. A tese fundamental permanece válida.',
  'Que conjunto de medidas reduz o risco de execução sem abandonar a estratégia?',
  'Definir limites por volume e prazo de zeragem, suspender entradas nos nomes deteriorados e usar veículo mais líquido para novos aportes.',
  ['Aumentar ordens nos papéis de spread maior para capturar o prêmio de iliquidez.','Manter o mesmo ritmo de entradas e apenas ampliar o horizonte divulgado aos clientes.','Substituir limites de execução por maior número de ações, sem medir volume e spread.'],
  'Risco de liquidez requer limites de participação, monitoramento e alternativas de implementação compatíveis com o mercado.');

add('c-pro-i',2,'Crédito estruturado',
  'Uma cota sênior de FIDC possui subordinação elevada, mas o lastro está concentrado em poucos devedores expostos ao mesmo setor. O relatório conclui que a subordinação elimina o risco de crédito.',
  'Qual correção técnica deve constar da análise?',
  'A proteção é limitada; concentração, correlação entre devedores, qualidade do lastro e mecanismos da estrutura continuam relevantes.',
  ['A cota sênior passa a ter risco apenas de mercado, pois a subordinação cobre inadimplência.','A concentração melhora a diversificação quando os devedores pertencem ao mesmo setor.','A existência de subordinação substitui a necessidade de acompanhar o desempenho do lastro.'],
  'Subordinação absorve perdas até seus limites e não remove riscos de concentração, deterioração do lastro ou estrutura.');

add('c-pro-i',2,'Ativos digitais e custódia',
  'Um fundo acessará criptoativos por duas estruturas: custódia direta com chaves segregadas e veículo estrangeiro com custodiante e contraparte centralizados. Os retornos esperados são semelhantes.',
  'Que análise diferencia adequadamente os riscos operacionais das estruturas?',
  'Mapear controle e recuperação de chaves, segregação, dependências de contraparte, jurisdição e procedimentos em incidentes.',
  ['Comparar apenas a volatilidade do criptoativo, porque a forma de guarda não altera o risco.','Escolher a estrutura com maior número de intermediários, sem avaliar responsabilidades.','Tratar o custodiante centralizado como garantia do valor de mercado do ativo.'],
  'A forma de acesso muda riscos de guarda, contraparte, recuperação e governança, mesmo com exposição econômica semelhante.');

add('c-pro-i',2,'Investimento no exterior',
  'Uma carteira brasileira compra título estrangeiro e protege apenas metade da exposição cambial. No período, o título se valoriza em moeda local e essa moeda se desvaloriza frente ao real.',
  'Como deve ser feita a atribuição do resultado em reais?',
  'Separar retorno do título, efeito cambial da parcela aberta e resultado do instrumento usado na proteção parcial.',
  ['Aplicar a variação cambial ao valor total e desconsiderar o hedge.','Usar somente o retorno do título porque a carteira possui alguma proteção.','Somar os percentuais do título e do câmbio sem considerar pesos nem composição.'],
  'A proteção parcial deixa exposição residual; a atribuição precisa decompor ativo, câmbio e hedge na proporção efetiva.');

add('c-pro-i',3,'Custos de previdência',
  'Dois planos VGBL têm a mesma política de investimento. Um reduz cada aporte por carregamento e cobra administração menor; o outro não cobra carregamento, mas aplica administração maior sobre o saldo durante vinte anos.',
  'Qual comparação permite identificar a estrutura potencialmente mais eficiente?',
  'Projetar fluxos líquidos e saldo ao longo do horizonte, incorporando o efeito recorrente da administração e a redução inicial dos aportes.',
  ['Comparar apenas a taxa de carregamento do primeiro aporte.','Escolher o plano sem carregamento sem calcular o efeito da administração sobre o saldo.','Somar as taxas informadas como se incidissem sobre a mesma base e no mesmo momento.'],
  'As taxas incidem sobre bases e momentos diferentes; a administração recorrente pode ter efeito composto relevante no longo prazo.');

add('c-pro-i',3,'Regime regressivo e lotes',
  'Um plano recebeu aportes anuais por oito anos e fará resgate parcial. O sistema apresenta apenas a data de abertura do plano e o saldo total, sem identificar a antiguidade dos recursos resgatados.',
  'Que informação precisa ser recuperada para calcular corretamente a retenção no regime regressivo?',
  'A idade dos aportes ou lotes alcançados pelo resgate, conforme o critério aplicável, além da base tributável da modalidade.',
  ['Somente a data de abertura, aplicando uma única faixa a todo o saldo.','A rentabilidade do último mês, que define a faixa tributária do resgate.','O valor do primeiro aporte, independentemente dos lotes efetivamente resgatados.'],
  'No regime regressivo, a antiguidade dos recursos resgatados influencia a faixa; o plano pode conter lotes com prazos diferentes.');

add('c-pro-i',3,'Renda e risco atuarial',
  'Duas rendas previdenciárias usam o mesmo saldo e taxa financeira. Uma é vitalícia simples e a outra prevê continuidade ao beneficiário após o falecimento do titular.',
  'Por que os valores iniciais das rendas podem ser diferentes?',
  'A reversão amplia os pagamentos contingentes e altera o cálculo atuarial conforme idades, cobertura e hipóteses biométricas.',
  ['A reversão aumenta o saldo acumulado antes da conversão em renda.','A renda simples inclui automaticamente pagamentos ao beneficiário.','As hipóteses biométricas deixam de ser usadas quando existe beneficiário.'],
  'A forma de renda define eventos e duração possíveis dos pagamentos, afetando o valor atuarial para o mesmo saldo.');

add('c-pro-i',4,'Risco ativo',
  'Duas carteiras superam o benchmark em 2% ao ano. A primeira replica de perto os pesos do índice; a segunda mantém desvios setoriais amplos e instáveis.',
  'Que medida distingue melhor a eficiência do retorno excedente entre as carteiras?',
  'Comparar o retorno ativo ao tracking error e examinar a consistência das exposições que produziram o resultado.',
  ['Comparar somente a volatilidade total, sem relação com o benchmark.','Usar o beta isoladamente como medida completa do retorno ativo.','Escolher a carteira com mais ativos, sem medir os desvios em relação ao índice.'],
  'O retorno relativo deve ser analisado por unidade de risco ativo e pela origem das exposições frente ao benchmark.');

add('c-pro-i',4,'Risco de cauda',
  'Dois fundos apresentam retorno e volatilidade semelhantes. Um distribui perdas de forma aproximadamente simétrica; o outro registra ganhos pequenos frequentes e perdas raras de grande magnitude.',
  'Qual conjunto de métricas evita tratar os fundos como equivalentes?',
  'Combinar drawdown, medidas de perda extrema, assimetria, liquidez e comportamento em cenários de estresse.',
  ['Usar apenas o retorno médio, porque ele incorpora todos os riscos relevantes.','Comparar somente o número de meses positivos.','Usar apenas a volatilidade histórica, sem examinar a distribuição das perdas.'],
  'Volatilidade pode não revelar assimetria e perdas de cauda; métricas complementares mostram magnitude e persistência das quedas.');

add('c-pro-i',4,'Hedge por sensibilidade',
  'Uma carteira prefixada perde valor quando as taxas sobem. O futuro disponível tem vencimento diferente, mas sua sensibilidade monetária a um ponto-base é conhecida.',
  'Como dimensionar uma proteção de primeira ordem para a exposição?',
  'Comparar o DV01 da carteira com o DV01 por contrato e escolher quantidade e sinal que reduzam a sensibilidade líquida.',
  ['Igualar o valor nocional do futuro ao valor de mercado da carteira.','Comprar contratos porque a carteira perde com a alta das taxas.','Usar o prazo médio aritmético como substituto da sensibilidade monetária.'],
  'O hedge de taxa precisa relacionar mudanças monetárias para a mesma variação de juros e ajustar o sinal da posição.');

add('c-pro-i',4,'Atribuição de performance',
  'Um fundo recebeu aporte relevante no último dia do mês. O patrimônio final aumentou, embora os ativos tenham perdido valor antes do aporte. O relatório atribuiu todo o crescimento patrimonial à gestão.',
  'Qual correção separa performance de fluxo externo?',
  'Calcular o retorno por cotas ou metodologia que neutralize aportes e resgates e depois atribuir os efeitos de mercado e alocação.',
  ['Subtrair o patrimônio inicial do final e usar a diferença como retorno.','Tratar o aporte como ganho de seleção de ativos.','Excluir o dia do aporte e manter o crescimento patrimonial como medida de desempenho.'],
  'Aportes alteram patrimônio sem representar retorno; a metodologia precisa neutralizar fluxos externos antes da atribuição.');

export const anbimaOfficialStyleItems=items;
