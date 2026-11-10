# Operação do módulo em nuvem

## Escopo

O frontend deste módulo é servido por Nginx em um serviço separado no EasyPanel. Apenas o caminho `/simulou-passou/` do domínio da Logos deve apontar para ele. A API é a Edge Function `simulou-passou-api` no projeto `seyljsqmhlopkcauhlor`.

A conta é autenticada pelo Supabase Auth existente. A administração e o acesso aos simulados são exclusivos do módulo e são consultados no servidor a cada solicitação. Nenhuma senha ou papel global da Logos é alterado por este pacote.

O checkout é controlado por `simulou_passou_private.settings.checkout_enabled`. Mesmo com as vendas fechadas, o cadastro e as ferramentas pessoais continuam disponíveis; contas autorizadas podem executar simulados e administrar o conteúdo.

## Segurança e armazenamento

- `simulou_passou_private`: sete tabelas com RLS, sem permissões para `anon` ou `authenticated` e fora do esquema exposto pela Data API.
- Três RPCs `SECURITY INVOKER`, com execução revogada de `PUBLIC`, `anon` e `authenticated` e concedida somente a `service_role`.
- A ausência de políticas para usuários nessas tabelas privadas é intencional: acesso negado por padrão. O backend utiliza o papel de serviço, que possui bypass RLS. O aviso informativo `rls_enabled_no_policy` não deve ser resolvido concedendo leitura dessas tabelas ao navegador; confira os grants e a [documentação de RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- O gateway valida a identidade com Supabase Auth. A chave de serviço permanece nas variáveis internas da Edge Function; nunca é entregue ao frontend ou gravada no repositório.
- Sessões utilizam cookies `HttpOnly`, `Secure` e `SameSite=Lax`, restritos a `/simulou-passou/api`. Escritas exigem origem permitida. Tokens recebidos em links de confirmação/recuperação são removidos do fragmento antes do processamento.
- Gabaritos e snapshots completos ficam no servidor. O runtime devolve revisão somente após finalizar, de acordo com a regra do simulado.
- Cada conta tem uma linha de estado com revisão otimista. Os dados incluem tentativas, progresso, notas, planejamento e foco. Atualizações concorrentes são atômicas e repetidas com o estado mais recente, evitando sobrescrever outra aba.
- O catálogo editorial tem revisão própria; somente administradores do módulo podem alterá-lo. A administração pode corrigir discursivas e consultar tentativas, mas as respostas administrativas não incluem notas pessoais de outras contas.
- Os atalhos de autenticação, recuperação e pagamento locais não operam na API de produção.

Este modelo com JSONB por conta simplifica a migração fiel do protótipo. Antes de um volume elevado, medir tamanhos/latência e avaliar paginação e normalização do histórico. Não há teste de carga incluído nesta entrega.

## Pacote reproduzível

- `cloud/schema.sql`: estrutura aditiva do módulo. Não modifica tabelas, triggers, senhas ou papéis globais existentes.
- `cloud/build-edge.mjs`: gera `dist/edge-files.json` a partir do runtime canônico, sem cópias divergentes versionadas.
- `cloud/edge-index.ts` e `cloud/gateway.mjs`: autenticação, autorização, persistência e API.
- `Dockerfile` e `cloud/nginx.conf`: frontend estático, proteção de cabeçalhos, HTTPS no proxy da hospedagem e proxy da API.
- `public/cloud-ui.js`: telas reais de acesso e aviso de pré-lançamento. Não existem botões de compra falsa ou entrada master sem senha nessa interface.

```sh
node --test --test-isolation=none tests/*.test.mjs
node cloud/build-edge.mjs
```

Os testes de navegador usam Playwright/Chrome. Configure `PLAYWRIGHT_PATH` caso o Playwright não esteja instalado no ambiente de desenvolvimento:

```sh
node tests/cloud-browser-qa.cjs
node tests/workspace-browser-qa.cjs
```

Os testes SQL usam PostgreSQL local via PGlite, com papéis e tabelas Auth sintéticos. O teste de navegador em nuvem utiliza esse schema real local e um adaptador Auth fictício; não cria contas reais nem envia e-mails.

## Verificação e rollback

Antes de ativar a rota: conferir o commit, executar as suítes, confirmar o projeto Supabase, verificar o schema e testar o endpoint de saúde e as recusas de acesso anônimo. Depois: testar HTTP/HTTPS, recursos, redirecionamento com barra final, cadastro/login e uma conta autorizada, sem expor senha em registros.

O rollback da hospedagem é remover somente a rota `/simulou-passou` do novo serviço e interromper esse serviço. A rota `/` e os serviços anteriores permanecem preservados. Manter o schema privado e os registros para análise, sem apagá-los como medida automática de rollback. A função pode ser revertida para um pacote anterior registrado; não redeployar funções de outros módulos.

A recuperação e confirmação de e-mail dependem das URLs de retorno e dos templates do Auth da Logos. A validação final desses e-mails deve ser feita com a conta do responsável, sem redefinir credenciais existentes automaticamente.


## Atualização PQO

- Prévia local: execute node preview-pqo.mjs e abra http://127.0.0.1:4188/. Use o perfil de demonstração para acessar os simulados.
- O catálogo contém sete simulados autorais no formato de certificação PQO: 60 questões de quatro alternativas, 180 minutos, nota mínima de 60% e calculadora. As áreas seguem os capítulos do guia da B3; a distribuição e as questões são próprias da plataforma. Cadastro de Clientes é um treino separado, de 12 questões em 30 minutos.
- Gere o catálogo com `node cloud/build-pqo-import.mjs`. Em uma instalação que já tem a versão de prática, gere somente a atualização de cada módulo com `node cloud/build-pqo-import.mjs <id-da-preparação>`. A atualização troca apenas os simulados que correspondem à versão anterior conhecida; não altera tentativas existentes.
- O prazo é aplicado pelo servidor e continua correndo fora da tela. Ao vencer, somente as respostas salvas entram na correção. O gabarito comentado aparece depois da prova, com a alternativa marcada, a correta e os assuntos prioritários para revisar.
- Aplique `cloud/checkout.sql`, `cloud/checkout-offers.sql` e `cloud/checkout-provider.sql` nessa ordem antes de publicar o gateway. Abra as vendas somente depois de confirmar o ambiente, os valores e a configuração do webhook.
- Em produção, o Asaas Checkout reutiliza `ASAAS_API_KEY` da Logos no servidor. O webhook usa `SP_ASAAS_WEBHOOK_TOKEN`, quando presente, ou `CHECKOUT_ASAAS_WEBHOOK_TOKEN` / `ASAAS_WEBHOOK_SECRET`. A chave de produção nunca é encaminhada ao ambiente de testes.
- No Asaas, configure um webhook próprio em `https://logosiabrasil.com/simulou-passou/api/payments/asaas` com os eventos CHECKOUT_PAID, CHECKOUT_CANCELED, CHECKOUT_EXPIRED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_REFUNDED, PAYMENT_CHARGEBACK_REQUESTED e PAYMENT_CHARGEBACK_DISPUTE. O servidor verifica o token, consulta o estado do pagamento no Asaas e confere o valor do pedido antes de liberar acesso.
- A escolha da trilha é o ponto de partida. R$ 29,90 libera o módulo selecionado, e R$ 49,90 libera todos os módulos. A migração adicional está em `cloud/checkout-offers.sql`. A página de retorno acompanha o estado do pedido e não concede acesso por si.
- A recuperação usa o redirecionamento HTTPS exato do módulo no Supabase Auth. Confirme a entrega real do e-mail em uma caixa de teste autorizada antes de abrir as vendas.
