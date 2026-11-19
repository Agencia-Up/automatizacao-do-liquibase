# Acesso e estornos — 19/11/2026

Produção usa Supabase `seyljsqmhlopkcauhlor`, função `simulou-passou-api`. Fonte da correção: snapshot da versão 36 efetivamente publicada; a versão corrigida é 37 (`access-refunds-v1`). Alterações anteriores de e-mail de compra e prazo anual, já publicadas, foram preservadas e sincronizadas no código.

## Falhas corrigidas

- A produção não possuía `sp_mail_reserve`, embora o gateway a chamasse. A recuperação absorvia o 404 e apresentava a resposta neutra sem enviar e-mail. `access-refunds.sql` instala a função com limite de envio, RLS e execução apenas por `service_role`. O gateway falha com 503 quando a infraestrutura ou o remetente recusam o envio; somente conta inexistente preserva a resposta neutra.
- Login, pedido de recuperação e redefinição por chave não dependem de validar/renovar cookies de uma sessão anterior. A alteração normal no perfil continua exigindo a senha atual. Chaves expiradas e erros de senha fraca são tratados, sem expor tokens na resposta.
- A produção não tinha tabela/RPCs/rotas de solicitação de estorno. O aluno agora consulta as próprias compras e solicita cancelamento em Minha conta. A administração vê as solicitações e confere a cobrança no Asaas. O botão registra a solicitação; a operação financeira é concluída pelo responsável no Asaas.
- Um evento pago atrasado podia reativar pedido estornado. A confirmação verificada de estorno agora é terminal, registra `refunded_at` e desativa a liberação Asaas vinculada àquela cobrança. Outra compra válida ou liberação manual independente conserva seu próprio direito de acesso.
- Cancelamento/expiração de checkout ainda pendente não é confundido com estorno de compra paga. Estorno em processamento não bloqueia antes de confirmação. O webhook consulta a situação real da cobrança no Asaas e confere o valor.

## Aplicação e validação

Aplicada a migração `simulou_passou_access_and_refund_reliability` em produção. Funções novas usam `security invoker`; `anon` e `authenticated` não executam os RPCs privilegiados nem leem as tabelas privadas.

Testes cobrem falha de banco e de e-mail, sessão antiga, token expirado, repetição após senha fraca, isolamento de pedidos, idempotência, estorno confirmado, pagamento atrasado, preservação de outra compra e bloqueio de prova aberta/salvar/finalizar/materiais sem logout. O teste visual usa identidade e compra fictícias em localhost, sem transações ou e-mails externos.

Nova recuperação solicitada para a conta informada pelo usuário. A existência de novo token e o horário de recuperação foram confirmados no Auth; o endpoint corrigido confirmou aceitação do envio. A definição da senha e a confirmação do primeiro login dependem de ação do destinatário. Nenhuma senha pessoal foi alterada pelo agente. A liberação de teste solicitada anteriormente foi regularizada como aluno, sem administração.

Nenhum estorno real de cliente foi executado nesta revisão. A validação financeira real exige que o responsável conclua o estorno da cobrança correta no Asaas.
