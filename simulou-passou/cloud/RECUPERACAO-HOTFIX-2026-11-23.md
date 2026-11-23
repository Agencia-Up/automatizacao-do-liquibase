# Recuperação de senha — correção após tentativa real

A tentativa informada pelo usuário criou o token nativo de recuperação, mas não concluiu o envio. O módulo de envelopes dependia de `Buffer` global: o teste em Node tinha esse global e o diagnóstico anterior no Auth não executava a montagem do e-mail. A dependência agora é importada explicitamente de `node:buffer`.

Adicionado teste de regressão removendo temporariamente o Buffer global e validando links e cookies. O diagnóstico protegido no ambiente real também passou a montar o e-mail com o código real (capturando a chamada antes de enviar a qualquer destinatário) e a validar o envelope de sessão. Os erros do remetente são classificados nos logs sem destinatários, senhas ou tokens.

Foi adicionado diagnóstico exclusivamente de servidor para solicitar recuperação e consultar metadados de uma mensagem, com validação de marca e destinatário. A resposta nunca inclui HTML, token nativo ou link de recuperação. Requisições sem credencial de serviço são recusadas.

17 testes focados passaram. A API foi publicada como versão 39. No diagnóstico real, cadastro, login, recuperação, nova senha, rejeição da senha antiga, montagem do e-mail, codificação de cookie e limpeza da identidade técnica retornaram sucesso. O vínculo técnico descartável também foi removido.

Um único novo e-mail de recuperação foi solicitado para o destinatário indicado pelo usuário, com remetente do Simulou Passou. O provedor aceitou o envio e devolveu o identificador da mensagem. A consulta de entrega retornou `resend_read_401`; portanto, não se afirma entrega na caixa de entrada. O destinatário deve usar o e-mail mais recente e confirmar a chegada e a definição da senha.

Não houve alteração de senha pessoal nem criação de recurso pago. Esta correção é somente da API; os arquivos visuais publicados não mudaram.
