# Isolamento do Simulou Passou — 23/11/2026

O usuário proibiu aumento de custo. Nenhum projeto Supabase, plano ou serviço pago foi criado. A infraestrutura Supabase e Resend continua compartilhada; a separação descrita aqui é feita pela aplicação, não por projetos ou chaves de infraestrutura independentes.

## Identidade e acesso

- O login visível continua sendo o e-mail real do aluno. O Supabase Auth gerencia a senha de uma identidade interna exclusiva do Simulou Passou, com endereço aleatório sob o domínio reservado `.invalid`. O endereço interno nunca é usado como destinatário dos e-mails do aluno.
- A tabela `simulou_passou_private.product_identities` vincula o destinatário real à identidade de autenticação e ao identificador de dados de estudo. RLS fica habilitada sem políticas para navegador; somente o servidor executa o RPC. Nenhuma autoridade vem de `user_metadata` editável.
- Contas legadas preservam os identificadores, permissões, compras, tentativas e anotações já existentes. No primeiro login, a credencial antiga é validada uma única vez para preparar a identidade do produto; a sessão de validação é encerrada. Os próximos logins e as redefinições usam somente a nova identidade. Não são alteradas senhas ou sessões existentes da Logos.
- A reserva da identidade ocorre antes de criar o usuário no Auth. Os gatilhos atuais da Logos foram preservados, com um desvio restrito aos UUIDs reservados na tabela privada. Essas identidades não criam perfis nem assinaturas da Logos; metadados fornecidos por clientes não produzem esse desvio.
- Cookies próprios, criptografados e autenticados, são HttpOnly/Secure e limitados ao caminho da API. O navegador não recebe os JWTs nativos do Auth. Links de cadastro e recuperação usam envelopes autenticados e criptografados, vinculados ao produto, à finalidade, ao domínio e à validade de uma hora; não expõem o token nativo do provedor.

## E-mails

- Remetente das mensagens novas: `Simulou Passou <simuloupassou@logosiabrasil.com>`; assunto, logotipo e links pertencem ao produto. O suporte de resposta continua no endereço já existente `suporte@logosiabrasil.com`; nenhuma nova caixa de entrada foi criada.
- A confirmação é feita na página `#/confirmar`, por ação explícita do usuário. O link não depende do redirecionamento global da Logos e não é consumido por mera abertura da página.
- Se o remetente não estiver configurado, o envio falha explicitamente, sem recorrer ao template geral do Auth. Existe suporte à chave `SP_RESEND_API_KEY`; na instalação atual a infraestrutura de envio já existente é reutilizada.
- Compras enviam ao destinatário real validado, e recuperam somente a identidade do simulador. Checkouts autenticados antigos sem `buyer_email` resolvem o destinatário no vínculo privado. Envelopes de outro destinatário ou com links de outro produto são recusados.
- A auditoria consulta exclusivamente IDs de mensagens registrados naquele pedido, valida destinatário e marca, e registra o status aceito pelo provedor. Não lista mensagens da Logos só porque foram enviadas ao mesmo e-mail.

## Publicação e verificação

Migrações em produção: `simulou_passou_product_identity_isolation` e `simulou_passou_product_recipient_mapping`. API `simulou-passou-api` versão 38, build `product-mail-isolation-v1`. O cron de e-mails do simulador foi pausado durante a atualização e reativado depois; os outros crons permaneceram intactos.

90 testes passaram; após o ajuste de destinatários antigos, os 11 testes focados foram repetidos com sucesso. Cobertura inclui isolamento de senha, conservação do histórico/administrador, escopo dos cookies e tokens, confirmação, recuperação, recusa de mensagens de outro produto e privilégios do banco.

O diagnóstico interno, protegido pela credencial de serviço, criou uma identidade técnica descartável no Auth real e confirmou cadastro, primeiro login, recuperação, mudança de senha, rejeição da senha anterior e limpeza da identidade. Não chamou o serviço de e-mails de clientes. O vínculo técnico remanescente foi removido depois de verificar que não tinha Auth, dados de membro, compras ou administração.

Foi confirmada a preservação das credenciais das quatro contas legadas e da quantidade de membros. `anon` e `authenticated` não executam o RPC de identidade nem leem a tabela privada. O advisor novo é somente informativo (`rls_enabled_no_policy`), compatível com a política deliberada de negar acesso direto ao navegador.

Nenhuma senha pessoal foi definida pelo agente e nenhum e-mail de cliente foi disparado nesta verificação. A entrega na caixa de entrada de um destinatário real deve ser confirmada pelo titular usando um novo link de recuperação do Simulou Passou. Links antigos, sem escopo do produto, são recusados.
