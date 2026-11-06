# Simulou Passou · Simulador de provas — validação local

O módulo agora também inclui o adaptador de produção, o schema isolado e a configuração do serviço. Consulte [`cloud/OPERACAO.md`](cloud/OPERACAO.md). As instruções abaixo continuam descrevendo o modo local; nesse modo, login e compra permanecem simulados.

Versão navegável criada a partir do texto fornecido em 06/11/2026. A finalidade desta entrega é validar a estrutura e a experiência **antes** da integração ao painel principal, GitHub, Supabase e pagamentos.

## Abrir

- Com o servidor ativo: http://127.0.0.1:4178
- Para iniciar novamente: dê dois cliques em **Abrir Simulou Passou.cmd** nesta pasta.
- Pelo terminal: `node server.mjs` (Node.js 24 ou posterior). Nenhuma instalação de dependências é necessária para executar a aplicação.

O serviço escuta somente em `127.0.0.1`. Não disponibilize esta versão na internet. O launcher reutiliza a prévia já ativa; caso contrário inicia o servidor local e abre o navegador.

## Posicionamento

Simulou Passou é uma plataforma de simulação de provas e certificações disponíveis no catálogo. Os simulados, a revisão de respostas e o acompanhamento do desempenho são a experiência principal. Materiais são apoio à prática. O nome da marca não representa garantia de aprovação ou vínculo oficial com certificadoras.

## Calculadora e pesquisas

A página inclui um planejador interativo com exemplos de 1, 10 e 1.000 simulações, quantidade de respostas, tempo de realização e revisão, distribuição por dias e diferença entre acerto informado e meta pessoal em pontos percentuais.

As fontes consultadas não validam uma função que transforme quantidade de simulados em probabilidade pessoal de aprovação. Por isso, a interface não produz porcentagens de aprovação, não extrapola efeitos para 1.000 tentativas e não calcula quantas tentativas garantiriam passar. Os valores iniciais são exemplos editáveis de planejamento, não uma prescrição científica.

Fontes, consultadas em 06/11/2026:

- [Yang et al. (2021)](https://pubmed.ncbi.nlm.nih.gov/33683913/): meta-análise sobre prática com testes e desempenho acadêmico. O efeito padronizado não é uma porcentagem de aprovação.
- [Sotola e Crede (2021)](https://link.springer.com/article/10.1007/s10648-020-09563-9): associação entre quizzes e desempenho/aprovação em disciplinas. A razão de chances não é multiplicador de probabilidade pessoal nem ganho por tentativa.
- [Rawson e Dunlosky (2022)](https://journals.sagepub.com/doi/full/10.1177/09637214221100484): revisão sobre reaprendizagem em sessões espaçadas, sem quantidade universal de provas para aprovação.

O Simulou Passou e suas certificações demonstrativas não foram avaliados nessas pesquisas. A página oferece links e explica a diferença de contexto.

Verificação específica: `node --test --test-isolation=none tests/planner.test.mjs`. O relatório de navegador está em `qa/planner-report.json`; as capturas da calculadora ficam na mesma pasta.

## Cenário fictício de evolução

A pedido do usuário, a calculadora também oferece um modo demonstrativo com percentuais inventados, selecionado inicialmente. O aviso aparece nos controles e no resultado. O resultado é chamado de **Porcentagem hipotética de aprovação**, com aviso visível de que o número é inventado, sem validação e não corresponde à chance real no exame.

O modelo de interface usa `índice = 95 − 75 × exp(−0,12 × simulações)`. Todos os parâmetros são arbitrários: ponto inicial 20, limite 95 e taxa 0,12. Eles não vieram das pesquisas, de desempenho de alunos ou de validação em certificações. A meta fictícia é editável entre 21 e 94.

O total de simulações até a meta resulta da inversa dessa curva inventada. O prazo usa as simulações restantes e a capacidade de sessões completas por dia, incluindo revisão. Aumentar o tempo diário pode reduzir o prazo; fazer a mesma quantidade mais rápido não aumenta o índice. O modo de planejamento de volume e tempo continua disponível no seletor.

Este recurso serve à avaliação da interface local e não deve ser publicado como previsão, estatística científica ou promessa de aprovação. Testes: `tests/illustrative.test.mjs`; verificação visual: `qa/illustrative-report.json`.

## O que validar

### Painel pessoal e prioridade mobile

Depois do cadastro ou login, a conta abre **Meu painel**. A conta comum não recebe o papel master. Anotações, plano e modo foco podem ser usados antes da ativação; materiais, simulados e revisão de questões pagas continuam condicionados ao acesso confirmado.

- **Anotações:** criar, editar, fixar, buscar e excluir notas privadas; rascunho preservado no navegador e gravação explícita na conta. Ctrl/Cmd+S salva quando o editor está aberto.
- **Meu plano:** atividades com data, tipo, vínculo opcional a um simulado, conclusão e reabertura; objetivo de certificação, data planejada e meta semanal editáveis.
- **Caderno de erros:** objetivas incorretas ou em branco de tentativas encerradas com revisão permitida; criar anotação vinculada, agendar revisão e marcar como revisada sem alterar a nota original.
- **Modo foco:** duração escolhida pelo usuário, pausa/retomada, navegação entre telas e registro explícito de minutos. Os blocos são registros pessoais e não uma medida automática de aprendizado.
- **Simulados:** vários modelos por certificação e novas tentativas separadas no histórico. Os exemplos iniciais estão sem limite configurado de tentativas; gabaritos e regras ficam preservados em cada versão.
- **Administração → Conteúdo a enviar:** contagens reais do catálogo local e roteiro para enviar provas, matérias, materiais, questões e regras.

O layout foi revisado com prioridade para o celular: campos com fonte de 16 px, áreas de toque maiores, navegação inferior, menu com foco controlado e Escape para fechar, formulários empilhados, notas com botão de salvar acessível e modais com rolagem. As verificações de navegador cobriram larguras de 320, 360, 390, 430, 768 e 1440 px, incluindo uma altura reduzida durante a edição. São emulações no Chrome, não testes em aparelhos físicos ou Safari/iOS reais.

Relatório específico: `qa/workspace-mobile-report.json`. Testes de isolamento e persistência: `tests/workspace.test.mjs`. A orientação de prática com testes e prática distribuída cita [Dunlosky et al. (2013)](https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html) no próprio painel; a interface não estabelece intervalo ou quantidade universal para aprovação.

Para enviar conteúdo, use `public/roteiro-conteudo.txt` ou `public/modelo-prova.json`. São modelos de envio, não um importador automático. Os exemplos ANCORD/PQO continuam demonstrativos e precisam de programa, conteúdo e revisão técnica completos.

1. **Página de vendas:** oferta de R$ 29,90, pagamento único, acesso vitalício, conteúdo incluído, três passos e FAQ. Os exemplos editoriais são identificados como demonstração.
2. **Login/cadastro:** crie uma conta com informações fictícias. O cadastro não libera materiais pagos. Há recuperação de senha local, sem envio de e-mail, e logout.
3. **Compra:** o checkout permite testar pagamento pendente, recusado e confirmado. Nenhum cartão é solicitado e nenhum valor é cobrado. O valor de 2.990 centavos é definido no servidor local. Somente o evento simulado de confirmação libera o acesso.
4. **Área do aluno:** início, preparações, materiais, simulados, desempenho e conta. O progresso de leitura e todas as tentativas são persistidos neste computador.
5. **Simulados:** prática objetiva e mista, navegação, marcação para revisão, cronômetro por configuração, rascunho no navegador quando o servidor está indisponível, retomada, confirmação de questões em branco e revisão.
6. **Correção:** acerto objetivo usa o total de objetivas, incluindo não respondidas. Pontuação ponderada é separada. Discursivas respondidas ficam aguardando correção, sem aprovação/reprovação final até receberem nota. Discursivas em branco não geram fila de avaliação.
7. **Administração:** crie/edite/publique/despublique preparações, materiais e simulados; crie/edite questões; configure pesos, duração, aprovação, revisão e limite de tentativas; corrija discursivas; consulte contas e pagamentos simulados.

## Perfis de demonstração

Na tela **Já sou aluno**, há dois atalhos sem senha:

- **Explorar como aluno:** abre um perfil de teste com acesso demonstrativo liberado, para você avaliar a navegação imediatamente.
- **Abrir administração de demonstração:** abre o perfil master local. Suas tentativas são identificadas como administrativas e separadas dos indicadores de alunos.

Esses atalhos são ferramentas explícitas de validação local. Não são autorização de produção. Para validar o bloqueio antes da compra, utilize uma conta criada pelo cadastro comum.

Para corrigir uma discursiva: faça o simulado misto como aluno, finalize, saia, abra a administração de demonstração, acesse **Correções**, atribua nota e feedback; volte à conta do aluno para consultar o resultado final.

## Persistência e limites

- `data/local.json`: usuários locais, senhas derivadas com scrypt, sessões, registros de compra simulada, conteúdos, progresso e tentativas.
- O rascunho não sincronizado de uma tentativa fica no localStorage deste navegador, separado por conta e tentativa.
- Os gabaritos ficam no servidor durante a tentativa. A revisão é enviada somente após finalizar, se permitida pela configuração.
- Questões e regras são copiadas para cada tentativa: editar a configuração não muda o histórico já iniciado.
- Não há Supabase, cobrança real, envio de e-mail, agente de IA ou serviço externo de conteúdo. Os dados não são enviados ao GitHub.
- Materiais suportados nesta etapa: texto e links HTTPS. Não há biblioteca de PDFs, aulas em vídeo ou livros licenciados.
- O texto de termos e privacidade é explicitamente um rascunho de validação, não um documento jurídico de publicação.

Use dados fictícios. O arquivo local não é um cofre de produção, e o ambiente não inclui todos os controles operacionais necessários a um serviço público.

## Conteúdo editorial

ANCORD e PQO são preparações separadas. Os exercícios da prévia são autorais e demonstrativos, em matemática básica e organização de estudos/rotinas; não representam questões oficiais, formato do exame, programa completo ou preparação técnica validada. Uma terceira preparação demonstra o estado “Em preparação”.

Antes de vender: revisar programa oficial vigente, conteúdo, questões e referências; obter autorização dos materiais usados; definir responsável legal, suporte, termos, privacidade, cancelamento e reembolso. Os livros citados no briefing não foram reproduzidos nem anunciados como incluídos.

## Arquitetura

- `public/index.html`, `public/styles.css`, `public/app.js`: interface responsiva sem dependências externas.
- `server.mjs`: API local, autenticação, persistência, autorização, preço, tentativas e correção.
- `seed.mjs`: exemplos demonstrativos e configuração inicial.
- `tests/api.test.mjs`: testes dos fluxos e controles do servidor.
- `tests/browser-qa.cjs`: validação de interface com Playwright instalado no ambiente de desenvolvimento; não é dependência da aplicação.
- `qa/`: capturas e relatório da verificação de navegador.

Integração futura: substituir a persistência/autenticação local por adaptadores do sistema real; mapear autorização e pagamentos reais; portar as views para o router e os componentes do painel existente. Não transportar os endpoints `auth/demo`, `auth/recover` local nem `demo-event` para produção.

## Verificar

`node --test --test-isolation=none tests/api.test.mjs`

Os testes usam banco em memória e portas locais temporárias; não alteram o arquivo de dados da sua validação. O relatório em `qa/browser-report.json` registra os fluxos executados no navegador. Capturas de desktop e celular ficam na mesma pasta.
