# Publicação do Simulou Passou

## Estado da entrega

Código do protótipo validado, preparado para versionamento no repositório reaproveitado da Agência Up. O nome técnico do repositório foi solicitado como `automatizacao-do-liquibase`; a marca do produto permanece **Simulou Passou**.

Não confundir três etapas: código no GitHub, integração ao backend real e aplicação publicada no domínio. Esta pasta executa somente a prévia local; não está pronta para servir usuários pagantes na internet.

## O que está incluído

- Página comercial e calculadora claramente identificada como cenário hipotético, com parâmetros inventados e sem previsão real de aprovação.
- Cadastro, login, recuperação e compra de demonstração, sem envio de e-mail ou cobrança.
- Área de membros, materiais, simulados objetivos/mistos, várias tentativas, histórico, revisão e correção de discursivas.
- Notas privadas, planejamento, caderno de erros e modo foco.
- Administração de conteúdo e roteiro de informações editoriais a enviar.
- Layout responsivo, dados fictícios iniciais e testes automatizados.
- Suporte a prefixo de URL: recursos, API e links de conteúdo ficam sob `/simulou-passou/` quando `BASE_PATH=/simulou-passou`.

## Executar a prévia sob o caminho solicitado

PowerShell, dentro desta pasta:

```powershell
$env:BASE_PATH='/simulou-passou'
$env:PORT='4179'
node server.mjs
```

Abra `http://127.0.0.1:4179/simulou-passou/`. O serviço continua restrito a localhost. Nenhum segredo de produção é necessário para essa prévia.

## Integração de produção pendente

1. Confirmar o domínio e a hospedagem que atendem a Logos IA. O antigo `DEPLOY.md` da raiz descreve um gerador de arte; não comprova a configuração atual da plataforma.
2. Identificar o Supabase usado pela aplicação publicada: há dois projetos Logos acessíveis, `seyljsqmhlopkcauhlor` e `ezoltigtqgbmftmiwjxh`. A configuração real da aplicação deve determinar o destino antes de qualquer alteração.
3. Trocar autenticação local por Supabase Auth, com recuperação por e-mail e URLs de retorno do módulo. Não levar usuários, hashes, sessões nem tokens da prévia para produção.
4. Criar dados exclusivos do módulo, com RLS por proprietário para notas, planejamento, progresso e tentativas. Guardar gabaritos e rubricas em área privada, acessíveis apenas ao backend autorizado.
5. Definir administração do módulo no servidor, sem usar metadados editáveis pelo usuário e sem conceder papéis globais da Logos aos alunos.
6. Integrar a compra única de R$ 29,90 ao provedor real. Os bancos inspecionados contêm integração Asaas; ainda é necessário conferir o fluxo usado pela aplicação. Somente confirmação autenticada do provedor poderá conceder o acesso do módulo, com idempotência e tratamento de estorno.
7. Remover ou bloquear em produção os atalhos `/api/auth/demo`, `/api/orders/:id/demo-event` e a recuperação que devolve o token na resposta. `localAccess` é exclusivo desta prévia.
8. Configurar a rota `/simulou-passou/` e o backend correspondente na hospedagem existente, com HTTPS, sessões seguras, validação de origem e segredos somente no servidor.
9. Receber e revisar as provas, programas oficiais, matérias, pesos, materiais autorizados, questões, gabaritos comentados e regras. Os exemplos ANCORD/PQO não são um catálogo completo para venda.
10. Validar as condições comerciais e finalizar os textos de termos/privacidade. Realizar teste de ponta a ponta em ambiente apropriado antes de ativar vendas.

Nenhuma tabela ou função Supabase foi alterada nesta preparação. Não há deploy público configurado nesta pasta nem acesso pago real liberado por ela.

## Arquivos que não devem ser enviados

`data/`, `qa/`, logs, `.env` e arquivos com credenciais ficam fora do versionamento. O catálogo inicial em `seed.mjs` é fictício; não contém cadastros de usuários da prévia.
