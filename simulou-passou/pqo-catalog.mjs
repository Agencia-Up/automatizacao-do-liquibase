import {createHash} from 'node:crypto';
import {appliedCore,appliedSpecialty} from './pqo-certification-bank.mjs';
import {operationsRecertification} from './pqo-recertification-bank.mjs';

const common = [
 ['SFN','Uma corretora precisa conferir quem estabelece diretrizes gerais para o mercado de valores mobiliários e quem fiscaliza as companhias abertas. Qual divisão faz sentido?','O CMN define diretrizes gerais e a CVM regula e fiscaliza o mercado de valores mobiliários.','A CVM define a meta de inflação e o CMN fiscaliza as companhias abertas.','A B3 define as diretrizes e o Banco Central fiscaliza exclusivamente as companhias abertas.','A Ancord define as diretrizes e a B3 atua como autoridade monetária.','CMN e CVM exercem papéis distintos. A CVM atua no mercado de valores mobiliários, que inclui companhias abertas e intermediários.'],
 ['Infraestrutura de mercado','Dois participantes negociam em um ambiente cuja câmara atua como contraparte central. Depois de aceitar a operação, o que muda na exposição direta das partes?','A câmara se interpõe nas obrigações aceitas e administra o risco de contraparte pelas regras do sistema.','O emissor do ativo passa a garantir a operação.','As posições de risco desaparecem após o registro.','O depositário torna-se responsável por todas as obrigações financeiras dos investidores.','A interposição da contraparte central altera a relação de contraparte. O risco remanescente exige margens, limites e outros mecanismos.'],
 ['B3 e infraestrutura','Uma ação foi negociada, compensada, liquidada e registrada na posição do investidor. Qual sequência descreve as funções dessas etapas?','Casar ofertas, apurar obrigações, cumpri-las e manter o controle das posições em depósito.','Registrar custódia, negociar, apurar obrigações e pagar dividendos.','Casar ofertas, pagar dividendos, registrar o emissor e precificar garantias.','Apurar obrigações, registrar custódia, negociar e cancelar o negócio.','A negociação forma o negócio. A compensação apura obrigações, a liquidação as cumpre e a depositária controla as posições.'],
 ['Renda variável','Uma investidora tem 600 ações a R$ 30,00. A companhia realiza um desdobramento de duas ações novas para cada uma anterior. Sem mudança econômica no instante do evento, qual é a posição teórica?','1.200 ações a R$ 15,00.','300 ações a R$ 60,00.','1.200 ações a R$ 30,00.','600 ações a R$ 15,00.','A quantidade dobra e o preço teórico unitário cai pela metade. O valor teórico continua R$ 18.000.'],
 ['Derivativos','Um importador pagará USD 250 mil em 90 dias. Ele quer reduzir o efeito de uma alta do dólar em reais sobre o custo previsto. Qual posição é coerente?','Comprada em futuro de dólar com vencimento e tamanho próximos da exposição.','Vendida em futuro de dólar com vencimento e tamanho próximos da exposição.','Comprada em futuro de taxa de juros sem considerar o câmbio.','Vendida em opção de compra de dólar sem outra cobertura.','Uma alta do dólar encarece o pagamento em reais. Uma posição comprada em dólar tende a compensar parte desse impacto.'],
 ['Renda fixa','Um título prefixado, sem cupom, tem valor de resgate fixo. Mantidos o prazo e o risco de crédito, a taxa exigida pelo mercado aumenta. Como muda seu preço?','Cai, porque o mesmo resgate é descontado a uma taxa maior.','Sobe, porque o resgate passa a incorporar a nova taxa.','Fica constante, porque o valor de resgate é fixo.','Sobe somente quando a negociação ocorre antes do vencimento.','O preço é o valor presente do fluxo futuro. O aumento da taxa de desconto reduz o preço.'],
 ['Câmbio','Uma mesa cota USD/BRL a 5,00 na compra e 5,04 na venda. Ignorando tarifas, quanto paga em reais um cliente que compra USD 10.000 dessa mesa?','R$ 50.400.','R$ 50.000.','R$ 50.200.','R$ 49.600.','O cliente compra à taxa de venda da mesa. USD 10.000 × R$ 5,04 = R$ 50.400.'],
 ['Fundos','O patrimônio líquido de uma classe de fundo é R$ 24 milhões e há 6 milhões de cotas. Antes de novo movimento de mercado, qual o valor patrimonial por cota?','R$ 4,00.','R$ 0,25.','R$ 6,00.','R$ 24,00.','O valor patrimonial unitário é o patrimônio líquido dividido pela quantidade de cotas emitidas.'],
 ['Clubes de investimento','Um grupo reúne recursos em um clube de investimento e aprova a compra de ações para a carteira. Como um participante detém a exposição?','Por meio de cotas do clube, com resultado ligado à carteira coletiva.','Por uma fração individual de cada ação registrada automaticamente em sua conta.','Por um empréstimo garantido à instituição administradora.','Por uma cota com retorno prefixado pelo organizador.','O clube investe coletivamente. O cotista detém cotas do veículo e tem exposição à carteira por meio delas.'],
 ['Outros ativos e serviços','Um investidor empresta ações na posição de doador. Qual é a obrigação econômica central do tomador ao encerrar o contrato?','Devolver ativos equivalentes nas condições pactuadas.','Pagar apenas o valor original das ações em dinheiro.','Devolver os mesmos certificados físicos individualizados.','Comprar uma cota do fundo da contraparte.','Em empréstimo de ativos, a obrigação normalmente envolve devolver ativos da mesma espécie, classe e quantidade, nos termos contratados.'],
 ['Tributação','Em um exemplo hipotético, uma operação tem ganho tributável de R$ 8.000 e alíquota de 15%. Já houve R$ 100 de retenção compensável no mesmo tributo. Qual valor ainda é devido?','R$ 1.100.','R$ 1.200.','R$ 100.','R$ 1.300.','Quinze por cento de R$ 8.000 são R$ 1.200. A retenção indicada é abatida, restando R$ 1.100.'],
 ['Cadastro de residentes','O representante de uma empresa pede que o participante aceite ordens. Seu documento pessoal é válido, mas não há comprovação dos poderes de representação. O que fazer?','Validar poderes e limites de atuação antes de habilitar as ordens.','Liberar as ordens porque a identidade do representante foi validada.','Cadastrar o representante como titular da conta da empresa.','Aceitar a primeira ordem e validar os poderes só se houver prejuízo.','Identidade e capacidade de representar são verificações diferentes. Os poderes devem ser comprovados conforme o cadastro e as regras aplicáveis.'],
 ['Cadastro de não residentes','O sistema recebeu um número fiscal estrangeiro, mas os dados de residência e da estrutura do investidor divergem dos documentos. Qual é a ação apropriada?','Conciliar as informações e validar o enquadramento e os documentos exigíveis antes da habilitação.','Tratar a conta como residente porque o atendimento é feito no Brasil.','Usar apenas a moeda da transferência como prova da residência fiscal.','Ignorar a divergência e esperar a primeira liquidação.','A classificação depende dos dados e do regime aplicável. Divergências devem ser esclarecidas e a evidência registrada.'],
 ['Mercados organizados','Um cliente confunde negociação em bolsa com registro de contrato em mercado de balcão organizado. Qual explicação é adequada?','Ambos podem ser mercados organizados, mas os mecanismos de negociação, registro e regras operacionais podem diferir.','Todo contrato de balcão é negociado em livro central antes do registro.','O balcão organizado não possui entidade administradora.','O registro de balcão garante a liquidez secundária do contrato.','A organização do mercado não torna idênticos seus mecanismos. O registro também não é garantia de liquidez.'],
 ['PLD/FTP','Uma conta recém-aberta recebe várias transferências de terceiros e solicita retirada imediata para um destino sem relação aparente. Qual conduta cabe à equipe?','Encaminhar o caso ao processo interno de análise, documentar os fatos e preservar a confidencialidade.','Informar ao cliente que a operação será comunicada antes de analisar.','Dividir a retirada para ficar abaixo dos limites internos.','Arquivar o alerta porque cada entrada isolada é pequena.','A análise considera o conjunto de indícios e o perfil do cliente. A equipe segue os procedimentos de escalonamento e de confidencialidade.'],
 ['Privacidade','Um prestador precisa dos contatos de uma amostra de clientes para investigar falhas de atendimento. Ele pede a base completa, com documentos e extratos. Qual resposta aplica a minimização?','Fornecer apenas os dados necessários, mediante autorização e controle de acesso adequados.','Fornecer a base inteira porque o prestador assinou contrato.','Trocar os nomes por iniciais e enviar todos os extratos.','Enviar a base pelo e-mail pessoal para evitar atraso.','Limitar volume, campos, destinatários e prazo ao necessário para a finalidade reduz exposição e atende ao princípio da necessidade.'],
 ['Renda fixa','Uma aplicação prefixada rende 1,2% ao mês, por juros compostos. Com R$ 100.000 e sem custos, qual o montante aproximado após três meses?','R$ 103.643,37.','R$ 103.600,00.','R$ 101.200,00.','R$ 112.360,00.','Calcule 100.000 × 1,012³. O montante é aproximadamente R$ 103.643,37.'],
 ['Derivativos','Uma carteira está vendida em cinco contratos futuros. O preço de ajuste sobe 30 pontos e cada ponto vale R$ 10 por contrato. Sem custos, qual o ajuste diário?','Débito de R$ 1.500.','Crédito de R$ 1.500.','Débito de R$ 300.','Crédito de R$ 300.','A alta é desfavorável para a venda. O ajuste é −5 × 30 × R$ 10 = −R$ 1.500.'],
 ['Renda variável','Uma carteira compra 1.000 ações por R$ 22,50 e vende por R$ 23,10. Os custos totais são R$ 90. Qual resultado líquido antes de tributos?','Ganho de R$ 510.','Ganho de R$ 690.','Ganho de R$ 600.','Perda de R$ 510.','A diferença de R$ 0,60 por ação gera R$ 600 brutos. Depois de R$ 90 em custos, restam R$ 510.'],
 ['Fundos','Um fundo tem ativos de R$ 5.000.000, passivos de R$ 400.000 e 2.000.000 de cotas. Qual é o valor patrimonial unitário?','R$ 2,30.','R$ 2,50.','R$ 2,70.','R$ 4,60.','Patrimônio líquido de R$ 4,6 milhões, dividido por 2 milhões de cotas, resulta em R$ 2,30.'],
 ['Câmbio','Um exportador recebe USD 40 mil. Entre o orçamento e a conversão, USD/BRL cai de 5,20 para 5,00. Sem proteção ou taxas, quanto diminui a receita em reais?','R$ 8.000.','R$ 4.000.','R$ 20.000.','R$ 208.000.','A perda é USD 40.000 × R$ 0,20 por dólar = R$ 8.000.'],
 ['Infraestrutura de mercado','Uma obrigação de entrega de títulos está vinculada à confirmação do pagamento no sistema. Que risco esse arranjo busca reduzir diretamente?','Risco de principal por uma parte cumprir sem receber a contrapartida.','Risco de preço antes da negociação.','Risco de o emissor alterar a taxa do título.','Risco de o investidor escolher uma estratégia inadequada.','Entrega contra pagamento condiciona a entrega à liquidação financeira. É uma proteção contra descasamento de principal.'],
 ['Derivativos','Uma opção de compra tem preço de exercício de R$ 40 e prêmio de R$ 3. No vencimento, o ativo está a R$ 48. Sem custos, qual é o lucro unitário do titular?','R$ 5.','R$ 8.','R$ 11.','R$ 3.','O valor intrínseco é R$ 8. Subtraído o prêmio de R$ 3, o lucro é R$ 5.'],
 ['Renda fixa','Um título promete R$ 121.000 em dois anos. A taxa efetiva de desconto é 10% ao ano. Sem cupons e custos, qual é o preço hoje?','R$ 100.000.','R$ 110.000.','R$ 99.000.','R$ 133.100.','Desconte os dois períodos: 121.000 ÷ 1,10² = 100.000.'],
 ['PLD/FTP','Uma pessoa jurídica apresenta cadeia societária com várias camadas, sem evidência de quem exerce controle final. O que ajuda a concluir a diligência?','Obter informações sobre propriedade e controle até identificar o beneficiário final conforme as regras aplicáveis.','Registrar o procurador como beneficiário final em todos os casos.','Presumir que o primeiro sócio listado controla toda a estrutura.','Usar a movimentação do primeiro mês como substituto dos documentos.','O representante não é necessariamente o beneficiário final. O cadastro deve entender a estrutura de propriedade e controle.'],
 ['Privacidade','Um atendente copia dados cadastrais para um arquivo pessoal. Qual controle reduz tanto a recorrência quanto a exposição?','Acesso limitado por função, monitoramento de exportação e canal corporativo com registro.','Permitir exportação desde que o arquivo tenha nome genérico.','Liberar os mesmos privilégios para toda a equipe para evitar exceções.','Confiar apenas na obrigação de confidencialidade.','O controle de acesso reduz alcance, o monitoramento permite detectar abuso e o canal oficial mantém trilha de auditoria.'],
 ['Mercados organizados','Uma ordem aparece como registrada na trilha do intermediário, mas ainda não houve negócio. O que o registro da ordem demonstra?','Que a instrução foi recebida ou registrada conforme a trilha, sem demonstrar execução.','Que o preço de execução já foi fixado pela depositária.','Que a compensação já apurou a obrigação do cliente.','Que a posição do ativo já pertence ao investidor.','Recebimento da instrução e execução são eventos diferentes. A execução depende das condições do mercado e da ordem.'],
 ['Renda variável','Uma companhia distribui proventos de R$ 2 por ação. Imediatamente antes da data ex, a ação vale R$ 30. Sem outros efeitos, qual o preço teórico ex?','R$ 28.','R$ 32.','R$ 30.','R$ 15.','O direito ao provento passa a ser separado da ação. O preço teórico desconta R$ 2 e fica em R$ 28.'],
];
const focused = {
 'ambiente':[
 ['Ambiente de negociação','O livro mostra 100 ações à venda a R$ 20,00 e 200 a R$ 20,10. Um cliente envia compra limitada de 250 ações a R$ 20,00. Se só houver essas ofertas, o que pode acontecer de imediato?','Executar 100 a R$ 20,00 e deixar 150 pendentes, conforme a validade.','Executar 250 a preço médio de R$ 20,06.','Executar 200 a R$ 20,10 e cancelar o saldo.','Executar 250 a R$ 20,00 mesmo sem oferta suficiente.','A ordem de compra limitada impõe preço máximo. A quantidade não executada permanece ou é cancelada conforme as instruções de validade.'],
 ['Ambiente de negociação','Duas compras limitadas têm o mesmo preço, mas horários de entrada diferentes. Em um livro que usa prioridade de preço e tempo, quem tem precedência?','A ordem registrada primeiro nesse preço.','A ordem de maior quantidade.','A ordem registrada por último.','A ordem do investidor com maior volume mensal.','Depois de igualado o preço, a prioridade de tempo determina a precedência, salvo regra específica do mercado.']],
 'suitability':[
 ['Suitability','Uma cliente conservadora precisará usar seus recursos em dois meses. O produto indicado tem alta volatilidade e carência de um ano. O que deve orientar a recomendação?','Compatibilidade entre risco, prazo, necessidade de liquidez e perfil atualizado.','A taxa indicativa do produto, desde que supere a alternativa líquida.','O valor mínimo de aplicação, independentemente do prazo.','O histórico de retorno do último mês, sem considerar a carência.','Prazo, liquidez e capacidade de suportar perdas fazem parte da análise de adequação. Uma rentabilidade indicativa não corrige incompatibilidade.'],
 ['Suitability','Um cliente atualiza os objetivos e declara que os recursos serão usados em breve. Ele pede a mesma indicação anterior. Qual conduta é apropriada?','Reavaliar a indicação à luz do horizonte atualizado e registrar o fundamento.','Manter a indicação porque o cliente já aplicou no passado.','Atualizar o cadastro apenas depois da nova aplicação.','Usar a tolerância ao risco para desconsiderar o horizonte.','Mudanças materiais nas circunstâncias podem alterar a adequação do produto. A recomendação deve considerar o perfil atualizado.']],
 'controles':[
 ['Risco corporativo e controles internos','Uma pessoa lança, aprova e concilia transferências sem revisão independente. Qual mudança trata mais diretamente a fragilidade?','Separar execução e aprovação e manter trilha auditável.','Aumentar o limite que a mesma pessoa pode aprovar.','Substituir a conciliação por um relatório do próprio executor.','Exigir apenas uma justificativa verbal para cada exceção.','A segregação de funções reduz a concentração de controle e facilita detectar erros ou abuso.'],
 ['Risco corporativo e controles internos','Uma falha de processamento duplicou ordens. Depois de conter o incidente, qual evidência ajuda a comprovar que o controle corretivo funciona?','Teste de reprocessamento com a mesma chave e verificação de que o segundo envio não cria outra ordem.','Captura de tela da configuração sem teste do reenvio.','Relatório de quantidade de ordens do mês anterior.','Aprovação informal da equipe sem registrar o cenário.','O teste reproduz o gatilho que gerou a duplicidade e demonstra a eficácia do tratamento de reenvio.']],
 'ilícitos':[
 ['Operações ilícitas','Um operador conhece uma ordem grande ainda não executada e compra antes para se beneficiar da possível alta. Qual conceito descreve o caso?','Front running.','Arbitragem de base.','Formação regular de mercado.','Hedge de carteira.','O comportamento explora informação antecipada sobre ordem de cliente, em benefício próprio e em conflito com os deveres do intermediário.']],
 'risco':[
 ['Risco na câmara','Uma carteira tem obrigação de margem de R$ 160 mil. Depositou um ativo de R$ 180 mil com deságio de 20% para fins de garantia. Quanto falta cobrir?','R$ 16 mil.','R$ 20 mil.','R$ 36 mil.','R$ 0.','O valor elegível é R$ 180 mil × 80% = R$ 144 mil. A insuficiência é R$ 16 mil.'],
 ['Risco na câmara','Uma carteira mantém duas posições cuja correlação se altera em um cenário extremo. Por que o risco pode superar o previsto pelo hedge em condições usuais?','A redução de risco depende da relação entre os preços e essa relação pode falhar no cenário de estresse.','A margem só muda quando há inadimplência consumada.','Posições com sinais opostos sempre anulam a exposição.','O risco é calculado somente sobre o volume negociado.','O teste de estresse avalia perdas em condições adversas, inclusive a ruptura da relação que sustentava a compensação do risco.']],
 'liquidação':[
 ['Câmara B3','Um participante deve R$ 1,2 milhão e tem R$ 950 mil a receber no mesmo ciclo, sob compensação líquida aplicável. Qual obrigação financeira líquida resulta?','Pagar R$ 250 mil.','Receber R$ 250 mil.','Pagar R$ 2,15 milhões.','Receber R$ 950 mil.','A compensação apura o saldo das obrigações elegíveis no ciclo: R$ 1,2 milhão menos R$ 950 mil.'],
 ['Processos da Câmara B3','A conciliação encontra diferença entre a obrigação da câmara e a previsão de caixa antes do prazo. Qual procedimento reduz risco de falha?','Identificar o negócio divergente, revisar alocação e recursos e escalar antes do horário limite.','Fechar a conciliação pela previsão interna e verificar no dia seguinte.','Cancelar todos os negócios do participante sem validar a origem.','Liquidar pela diferença líquida prevista, ignorando o registro da câmara.','Divergências precisam ser resolvidas ou escaladas no prazo. Isso reduz o risco de falta de recursos ou erro de liquidação.']],
 'custódia':[
 ['Central depositária','Após uma transferência sem pagamento, a posição de saída foi debitada, mas a posição de entrada ainda não aparece no relatório interno. Qual primeira medida é apropriada?','Conciliar os dois lados e o status da instrução na depositária antes de duplicar o comando.','Reenviar a transferência imediatamente com outra identificação.','Registrar um crédito manual definitivo sem evidência externa.','Tratar a diferença como pagamento pendente em todos os casos.','A conciliação distingue atraso operacional de erro real e evita duplicidade ou ajuste sem lastro.'],
 ['Processos da depositária','Um evento de proventos será processado para as posições elegíveis da data-base. Qual informação deve ser conciliada primeiro?','Posições elegíveis na data-base e instruções ou bloqueios que afetem o evento.','Posições na data do pagamento, ignorando a data-base.','Último preço de cada ativo, sem conferir os saldos.','Somente o volume negociado no dia do crédito.','A elegibilidade é determinada pelas regras do evento e pela posição na data aplicável. A custódia precisa reconciliar essa posição.']],
 'compliance':[
 ['Segurança da informação','Um suposto fornecedor pede por e-mail a senha de um operador para validar o acesso. Qual resposta é adequada?','Interromper o contato, confirmar o pedido por canal oficial e reportar o incidente sem compartilhar a senha.','Enviar a senha se a assinatura do e-mail corresponder ao fornecedor.','Enviar a senha após remover o nome do usuário.','Compartilhar a credencial apenas se a mensagem for urgente.','Credenciais são pessoais. Solicitações inesperadas devem ser verificadas por canal independente e tratadas como possível phishing.'],
 ['PRSAC','O participante identifica aumento da exposição de sua carteira a eventos climáticos extremos. Que informação ajuda a incorporar o risco aos controles?','Identificação das exposições, cenários, responsabilidades, métricas e acompanhamento periódico.','Uma declaração genérica de sustentabilidade sem relação com a carteira.','Somente o retorno acumulado dos produtos no mês anterior.','Uma classificação única para todos os clientes sem avaliar concentração.','A política orienta a gestão. A avaliação precisa conectar exposição concreta, responsabilidades, monitoramento e ação.']],
 'cadastro':[
 ['Cadastro de clientes','A ficha cadastral e o documento apresentam sobrenomes diferentes. A pessoa diz que mudou de nome recentemente. Qual providência cabe antes de habilitar?','Verificar a alteração com documentação adequada e registrar a atualização.','Aceitar apenas a declaração verbal por ser mudança comum.','Abrir uma segunda conta com o nome antigo.','Usar o endereço como substituto para confirmar o nome.','O cadastro deve manter identificação consistente e trilha da atualização. A divergência precisa ser resolvida com evidência.'],
 ['Cadastro de clientes','Um procurador autorizado a consultar a conta solicita uma transferência. A procuração não prevê movimentação. Qual é a ação correta?','Recusar a instrução até verificar poderes específicos para a movimentação.','Executar porque consulta implica autorização de transferência.','Executar se o procurador for também funcionário do titular.','Converter a autorização de consulta em autorização geral no cadastro.','Os poderes do representante devem cobrir o ato pretendido. Autorização de consulta não equivale a autorização de movimentação.'],
 ['Cadastro de clientes','A equipe recebe alteração de conta bancária em mensagem de origem não autenticada. Qual medida reduz o risco de fraude?','Confirmar a solicitação por canal autenticado e validar a titularidade conforme o procedimento.','Atualizar imediatamente e confirmar com o cliente depois do saque.','Substituir a conta se o valor do primeiro saque for baixo.','Aceitar se o e-mail tiver nome semelhante ao do cliente.','Uma mudança de dados de destino é sensível. Verificação independente, evidência e controle de titularidade reduzem fraude.'],
 ['Cadastro de clientes','O documento de um representante foi substituído e a equipe precisa corrigir o cadastro. O que deve ficar registrado?','Data da mudança, informação atualizada e evidência do procedimento, com acesso controlado.','Somente o documento antigo em uma pasta pública.','A correção sem qualquer histórico para economizar espaço.','Somente a senha usada pelo operador para confirmar a mudança.','A trilha de alteração permite auditoria e rastreabilidade sem expor credenciais ou ampliar acesso indevidamente.'],
 ['Cadastro de clientes','Há dois cadastros ativos para a mesma empresa, com procuradores diferentes. Qual é o tratamento adequado?','Investigar a duplicidade, validar o cadastro legítimo e tratar os registros conforme as regras internas.','Manter ambos ativos indefinidamente para não perder histórico.','Excluir um cadastro ao acaso sem verificar as autorizações.','Combinar todos os procuradores e liberar poderes totais.','A duplicidade pode gerar acessos e instruções inconsistentes. A correção exige validação, governança e preservação do histórico.'],
 ['Cadastro de clientes','Um campo obrigatório está em branco. O sistema oferece um valor genérico para avançar. Qual ação preserva a qualidade cadastral?','Obter a informação válida ou encaminhar a exceção pelo fluxo documentado.','Inserir o valor genérico e registrar como dado verificado.','Copiar o valor de outra conta de perfil semelhante.','Trocar o campo por uma observação sem validação.','Informação incompleta deve ser corrigida ou tratada por exceção formal. Dados fictícios não podem ser registrados como verificados.']],
};

const tracks = [
 ['operacoes','Operações','Intermediação de ordens, negociação, derivativos e pós-negociação.',['ambiente','controles','suitability','ilícitos','liquidação','custódia']],
 ['comercial','Comercial','Distribuição de produtos, adequação ao perfil e atendimento a investidores.',['suitability','ambiente','controles','ilícitos']],
 ['compliance','Compliance','Controles internos, PLD/FTP, conduta e segurança da informação.',['controles','compliance','risco','ilícitos','suitability','liquidação','custódia']],
 ['risco','Risco','Exposição, margens, controles e risco de mercado e contraparte.',['risco','controles','liquidação','custódia']],
 ['back-office','Back Office','Cadastro, alocação, garantias, liquidação e custódia.',['liquidação','custódia','risco']],
 ['liquidacao','Liquidação','Compensação, fluxo de caixa, garantias e conciliação de obrigações.',['liquidação']],
 ['custodia','Custódia','Posições, movimentação de ativos e eventos da central depositária.',['custódia']],
 ['cadastro','Cadastro de Clientes','Treino de cadastro e diligência cadastral para apoiar a capacitação da ANCORD.',['cadastro']],
];

const commonTopics = common.slice(0, 16).map(([subject]) => subject);
const official = 'https://edu.b3.com.br/educacao-profissional/certificacao-pqo';

// Source: Guia Por Dentro da B3, quadro de certificação (pp. 9–10).
const specialistChapters = {
  'Ambiente de negociação':['operacoes','comercial'],
  'Suitability':['operacoes','comercial','compliance'],
  'Operações ilícitas':['operacoes','comercial','compliance'],
  'Risco corporativo e controles internos':['operacoes','comercial','compliance','risco'],
  'Risco na câmara':['compliance','risco','back-office'],
  'Câmara B3':['operacoes','compliance','risco','back-office','liquidacao'],
  'Processos da Câmara B3':['back-office','liquidacao'],
  'Central depositária':['operacoes','compliance','risco','back-office','custodia'],
  'Processos da depositária':['back-office','custodia'],
  'Segurança da informação':['compliance'],
  'PRSAC':['compliance'],
};
const digest=value=>createHash('sha256').update(value).digest('hex');
const recertificationId='pqo-recertificacao-operacoes';

function addOperationsRecertification(catalog){
  const prepId=recertificationId;
  const name='Recertificação - PQO Operações';
  const questions=operationsRecertification.map(([subject,prompt,answer,b,c,d,explanation])=>{
    const id=prepId+'-q-'+digest(prompt).slice(0,16);
    const options=[answer,b,c,d].sort((left,right)=>digest(id+left).localeCompare(digest(id+right)));
    return {id,prepId,subject,type:'objective',prompt,options,correct:String(options.indexOf(answer)),explanation,points:1,status:'published'};
  }).sort((left,right)=>left.id.localeCompare(right.id));
  const subjects=[...new Set(operationsRecertification.map(([subject])=>subject))];
  catalog.preparations.push({
    id:prepId,name,description:'Prepare-se para renovar o PQO de Operações com questões baseadas no quadro de recertificação do Guia Por Dentro da B3.',
    status:'published',demo:false,color:'blue',track:'pqo',training:false,subjects,
  });
  catalog.materials.push({
    id:prepId+'-guia',prepId,module:'Recertificação PQO',title:'Guia Por Dentro da B3 · quadro de recertificação (p. 11)',
    format:'link',body:'https://edu.b3.com.br/documents/d/guest/guia_por_dentro_da_b3_compactado-final1?download=true',status:'published',
  });
  catalog.questions.push(...questions);
  catalog.quizzes.push({
    id:prepId,prepId,name,
    description:'Simulado autoral com 30 questões, 3 horas, quatro alternativas por questão e mínimo de 60% de acertos. Conteúdo baseado no quadro de recertificação de Operações da B3.',
    questionIds:questions.map(question=>question.id),durationMinutes:180,passPercent:60,maxAttempts:null,review:true,calculator:true,status:'published',
  });
}

function chooseExam(id){
  const specialist=[...Object.values(focused).flat(),...appliedSpecialty].filter(([subject])=>specialistChapters[subject]?.includes(id));
  const coreByTopic=new Map(commonTopics.map(subject=>[subject,[...common,...appliedCore].filter(row=>row[0]===subject)]));
  const selected=[...specialist];
  // Interleave the common chapters to retain coverage even for the tracks
  // with more specialist material. This is our distribution, not official weights.
  while(selected.length<60){
    const before=selected.length;
    for(const pool of coreByTopic.values())if(pool.length&&selected.length<60)selected.push(pool.shift());
    if(before===selected.length)throw new Error('Banco insuficiente para '+id);
  }
  return selected.map(row=>[digest(id+'|'+row[1]),row]).sort(([a],[b])=>a.localeCompare(b)).map(([,row])=>row);
}

export function pqoCatalog({practice=false}={}){
  const catalog={preparations:[],materials:[],questions:[],quizzes:[]};
  for(const [id,name,description,modules] of tracks){
    const prepId=id==='operacoes'?'pqo':'pqo-'+id;
    const training=id==='cadastro';
    const specialist=modules.flatMap(module=>focused[module]);
    const applicable=specialist.filter(([subject])=>
      (subject!=='Processos da Câmara B3'||['back-office','liquidacao'].includes(id))
      &&(subject!=='Processos da depositária'||['back-office','custodia'].includes(id))
    );
    const cadastral=[11,12,14,15,24,25].map(index=>common[index]);
    // Keep each common chapter represented, then include all applicable specialist topics.
    const rows=training?[...cadastral,...applicable]:[...common.slice(0,16),...applicable,...common.slice(16)].slice(0,30);
    const exam=training||practice?null:chooseExam(id);
    const subjects=[...new Set(exam?exam.map(([subject])=>subject):[...(training?cadastral.map(([subject])=>subject):commonTopics),...applicable.map(([subject])=>subject)])];
    const prepName='PQO · '+name;
    catalog.preparations.push({id:prepId,name:prepName,description,status:'published',demo:false,color:'blue',track:'pqo',training,subjects});
    catalog.materials.push({id:'pqo-guia-'+id,prepId,module:'Programa da B3',title:'Guia oficial e manual do PQO',format:'link',body:official,status:'published'});
    const questions=rows.map(([subject,prompt,answer,b,c,d,explanation],index)=>{
      const offset=(index*7+name.length+Math.floor(index/5))%4;
      const options=[b,c,d];
      options.splice(offset,0,answer);
      return {id:'pqo-'+id+'-q'+(index+1),prepId,subject,type:'objective',prompt,options,correct:String(offset),explanation,points:1,status:'published'};
    });
    catalog.questions.push(...questions);
    const examQuestions=exam?.map(row=>{
      const existing=rows.indexOf(row);
      if(existing>=0)return questions[existing];
      const [subject,prompt,answer,b,c,d,explanation]=row;
      const key=digest(id+'|'+prompt);
      const options=[answer,b,c,d].map(option=>[digest(key+'|'+option),option]).sort(([a],[b])=>a.localeCompare(b)).map(([,option])=>option);
      const question={id:'pqo-'+id+'-cert-'+key.slice(0,16),prepId,subject,type:'objective',prompt,options,correct:String(options.indexOf(answer)),explanation,points:1,status:'published'};
      catalog.questions.push(question);
      return question;
    });
    catalog.quizzes.push({id:'pqo-treino-'+id,prepId,name:training?'Treino de cadastro':name+(exam?' · Simulado de certificação':' · Simulado de prática'),description:training?'Questões autorais de apoio à capacitação.':exam?'60 questões autorais, organizadas pelos capítulos do guia da B3. Formato de certificação: 3 horas, quatro alternativas por questão e nota mínima de 60%.':'30 questões autorais para praticar os temas da certificação. O exame de certificação tem 60 questões.',questionIds:(examQuestions||questions).map(q=>q.id),durationMinutes:training?30:exam?180:90,passPercent:training?null:60,maxAttempts:null,review:true,calculator:!training,status:'published'});
  }
  if(!practice)addOperationsRecertification(catalog);
  return catalog;
}

export const archivedExamples={
  preparations:[['ancord','name','ANCORD'],['proxima','name','Nova preparação']],
  quizzes:[['s1','name','Fundamentos · prática objetiva'],['s2','name','Revisão · objetiva e discursiva'],['s3','name','Operações · exercícios de demonstração']],
  materials:[['m1','title','Como organizar sua preparação'],['m2','title','Capital, juros e montante'],['m3','title','Uma rotina de conferência']],
};

export function installPqoCatalog(catalog){
  const next=pqoCatalog();
  for(const [key,items] of Object.entries(next)){
    const existing=new Map(catalog[key].map(item=>[item.id,item]));
    for(const item of items){
      if(!existing.has(item.id))existing.set(item.id,item);
      else if(key==='preparations'&&item.id==='pqo'&&!existing.get(item.id).track)existing.set(item.id,{...existing.get(item.id),...item});
    }
    catalog[key]=[...existing.values()];
  }
  for(const [collection,examples] of Object.entries(archivedExamples)){
    for(const [id,field,label] of examples){
      const record=catalog[collection].find(item=>item.id===id&&item[field]===label);
      if(record)record.status='draft';
    }
  }
  return catalog;
}
