# Simulou Passou — publicação

Publicado em **https://logosiabrasil.com/simulou-passou/**, com entrada em `#/entrar`. O repositório reaproveitado foi renomeado conforme solicitado para `Agencia-Up/automatizacao-do-liquibase`; a marca permanece **Simulou Passou**.

## Configuração aplicada

- EasyPanel: projeto `logos-ia`, serviço independente `simulou-passou`, porta 80, Dockerfile `simulou-passou/Dockerfile` e contexto de build na raiz do repositório.
- Rota HTTPS: host `logosiabrasil.com`, origem e destino `/simulou-passou`. A raiz `/` continua apontando para o serviço anterior.
- Supabase: projeto de produção `seyljsqmhlopkcauhlor` e Edge Function `simulou-passou-api`, com autenticação interna explícita por Supabase Auth.
- Schema privado `simulou_passou_private`: sete tabelas com RLS e três RPCs restritas ao backend.
- Duas contas existentes, indicadas pelo responsável, receberam administração exclusiva do módulo. Senhas, papéis globais e assinaturas da Logos não foram alterados.

O modo local continua disponível com `node server.mjs`, usando dados próprios de demonstração. Seus atalhos de teste não operam na API publicada.

## Disponível para validação

Página de apresentação, acesso à conta, painel pessoal, anotações, planejamento e modo foco. Contas liberadas podem acessar materiais e simulados, realizar várias tentativas, revisar respostas e acompanhar o desempenho. Administradores podem gerenciar preparações, materiais, questões, simulados, acessos e correções de discursivas.

ANCORD/PQO contêm somente exemplos demonstrativos. A calculadora identifica seus percentuais como fictícios, sem previsão real ou promessa de aprovação.

## Antes de abrir vendas

**A cobrança está desativada, inclusive no servidor. Não existe pagamento real ou confirmação falsa disponível.**

Ainda são necessários:

1. Provas/certificações e programas oficiais que serão atendidos.
2. Matérias, pesos, distribuição de questões, duração, nota mínima, limites e regras de revisão.
3. Materiais autorizados e questões revisadas, com gabaritos comentados e rubricas para discursivas.
4. Identificação comercial, suporte e textos definitivos de termos, privacidade e cancelamento.
5. Integração e validação da cobrança real e dos webhooks, incluindo idempotência, confirmação, estorno e concessão/revogação do acesso. As tabelas de pedidos/eventos estão preparadas; o fluxo financeiro ainda não foi implementado nem ativado.

Roteiro de conteúdo: `public/roteiro-conteudo.txt` e **Administração → Conteúdo a enviar**.

## Evidências

- 47 testes Node aprovados, incluindo permissões SQL, isolamento, concorrência, acesso revogado e ausência de gabaritos antes da revisão.
- PostgreSQL local/PGlite com papéis sintéticos e navegador com Auth fictício, sem criar contas reais ou enviar e-mails.
- QA público por HTTPS em 320, 390 e 1440 px nas telas de vendas, login, cadastro, recuperação e checkout: sem erros JavaScript ou rolagem horizontal.
- Saúde da API retornou 200; áreas pessoais/admin sem login retornaram 401; entrada master de demonstração retornou 404.
- A raiz da Logos continuou retornando 200 com o título original após a configuração da rota.
- Leitura confirmou que nenhuma das três RPCs pode ser executada por `anon` ou `authenticated`.

Capturas e relatórios locais ficam em `qa/`, ignorados pelo Git. O responsável valida o acesso real com a senha existente, sem redefinição automática de credenciais.

Arquitetura, reprodução e rollback: [cloud/OPERACAO.md](cloud/OPERACAO.md).
