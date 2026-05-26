# Deploy — Logos IA · Gerador de Arte

Guia passo a passo para subir o projeto em produção no domínio
**arte.logosia.com.br** (ou outro subdomínio que você escolher).

Stack:

- **GitHub** — repositório do código
- **Supabase** — banco PostgreSQL gerenciado
- **Hostinger VPS + EasyPanel** — hospedagem e SSL automático
- **Cloudflare ou registrador do domínio** — DNS

> Tempo total estimado: **40-60 minutos** se for sua primeira vez.

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [GitHub — subir o código](#2-github--subir-o-código)
3. [Supabase — criar o banco](#3-supabase--criar-o-banco)
4. [DNS — criar o subdomínio](#4-dns--criar-o-subdomínio)
5. [EasyPanel — criar e configurar o app](#5-easypanel--criar-e-configurar-o-app)
6. [Variáveis de ambiente em produção](#6-variáveis-de-ambiente-em-produção)
7. [Testar tudo funcionando](#7-testar-tudo-funcionando)
8. [Atualizar o site depois (deploy contínuo)](#8-atualizar-o-site-depois-deploy-contínuo)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Pré-requisitos

Você precisa de:

- ☐ Conta no [GitHub](https://github.com) — ou organização da Logos IA
- ☐ Conta no [Supabase](https://supabase.com) — pode usar a mesma da Logos IA
- ☐ VPS Hostinger com **EasyPanel** instalado (você já tem)
- ☐ Domínio `logosia.com.br` apontado para a Hostinger ou Cloudflare
- ☐ `git` instalado no seu computador local
  - Windows: <https://git-scm.com/download/win>
- ☐ Uma chave de API LLM (Anthropic ou OpenAI) — opcional, sem ela o sistema usa o gerador mock

---

## 2. GitHub — subir o código

### 2.1. Criar o repositório

1. Entre no [github.com/new](https://github.com/new)
2. Em **Owner**, escolha a organização da Logos IA (se tiver) ou sua conta pessoal
3. Em **Repository name**, digite: `logosia-arte`
4. Em **Description**: `Gerador de carrosséis e stories da Logos IA`
5. Visibilidade: **Private** (recomendado por enquanto)
6. **Não marque** "Add README" / "Add .gitignore" / "Add license"
   (já temos esses arquivos no projeto)
7. Clique em **Create repository**

Anote a URL que o GitHub mostra na próxima tela (algo como
`https://github.com/logosia/logosia-arte.git`).

### 2.2. Inicializar e fazer o primeiro push

Abra o **Terminal** ou **PowerShell** dentro da pasta do projeto
(`C:\Users\User\OneDrive\Gerador de Arte`) e rode:

```bash
# Inicializa o repositório local
git init
git branch -M main

# Configura seu nome e email (substitua pelos seus)
git config user.name "Seu Nome"
git config user.email "seu@email.com"

# Adiciona e faz o primeiro commit
git add .
git commit -m "Primeira versão do Gerador de Arte da Logos IA"

# Conecta com o repositório do GitHub (cole a URL que você anotou)
git remote add origin https://github.com/SEU-USUARIO-OU-ORG/logosia-arte.git

# Envia para o GitHub
git push -u origin main
```

Na primeira vez o Git vai pedir login. Use **Personal Access Token** em vez de
senha — gere em [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
com permissão `repo`.

> ✅ Quando der certo, atualize a página do repositório e os arquivos vão estar lá.

---

## 3. Supabase — criar o banco

### 3.1. Criar projeto novo

1. Entre em [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em **New project**
3. Escolha sua organização (a mesma da Logos IA)
4. Preencha:
   - **Name**: `logosia-arte`
   - **Database Password**: clique em **Generate a password** e **copie/guarde**
     em local seguro (você vai precisar dela)
   - **Region**: `South America (São Paulo)` — `sa-east-1`
   - **Pricing plan**: Free (suficiente pra começar)
5. Clique em **Create new project** e aguarde ~2 minutos

### 3.2. Pegar a connection string

Quando o projeto terminar de provisionar:

1. Vá em **Project Settings** (engrenagem no canto inferior esquerdo) →
   **Database**
2. Role até a seção **Connection string**
3. Na aba **Connection pooling**, modo **Transaction**:
   - Copie a string que aparece (algo como
     `postgresql://postgres.abc123:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`)
4. Substitua `[YOUR-PASSWORD]` pela senha que você gerou no passo 3.1
5. **Guarde essa string** — vamos usar no EasyPanel mais tarde

> ⚠️ **Use sempre o Connection Pooling (Transaction mode)** — `:6543`. Não use
> a porta `:5432` em produção, ela tem limite de conexões muito menor.

### 3.3. Rodar as migrations (criar as tabelas)

1. Ainda no Supabase, vá em **SQL Editor** (ícone de banco no menu lateral)
2. Clique em **+ New query**
3. Abra no seu computador o arquivo
   `drizzle/migrations-pg/0001_initial.sql` (na pasta do projeto)
4. Copie **todo o conteúdo** do arquivo e cole no editor SQL do Supabase
5. Clique em **Run** (canto inferior direito) ou pressione `Ctrl+Enter`

Você deve ver `Success. No rows returned`. Pronto, as tabelas foram criadas.

Para verificar: vá em **Table Editor** (ícone de tabela) e confirme que
existem 5 tabelas: `users`, `sessions`, `clients`, `carousels`, `stories`.

---

## 4. DNS — criar o subdomínio

Aqui depende de onde seu domínio `logosia.com.br` está registrado.

### Cenário A — Domínio na Hostinger

1. Painel da Hostinger → **Domínios** → clique no `logosia.com.br`
2. **DNS / Nameservers** → role até **Records**
3. Clique em **Add record** e preencha:
   - **Type**: `A`
   - **Name**: `arte` (ou o subdomínio que escolher — sem o domínio principal)
   - **Points to**: o **IP da sua VPS** (você encontra no painel da Hostinger →
     VPS → ver detalhes)
   - **TTL**: `300` (5 minutos, para propagação rápida durante testes)
4. **Save**

### Cenário B — Domínio no Cloudflare

1. Painel Cloudflare → seu domínio → **DNS** → **Records**
2. Clique em **Add record**:
   - **Type**: `A`
   - **Name**: `arte`
   - **IPv4 address**: IP da VPS
   - **Proxy status**: **DNS only** (nuvem cinza) — durante o primeiro deploy,
     pra evitar conflito com o SSL do EasyPanel. Depois você pode ligar.
   - **TTL**: `Auto`
3. **Save**

### Verificar a propagação

Abra o Prompt de Comando / PowerShell e rode:

```bash
nslookup arte.logosia.com.br
```

Você deve ver o IP da sua VPS. Se ainda não aparecer, espere 5-10 minutos
e tente de novo.

---

## 5. EasyPanel — criar e configurar o app

### 5.1. Criar o projeto

1. Entre no EasyPanel da sua VPS (geralmente `http://IP-DA-VPS:3000` ou
   pelo domínio que você configurou)
2. **Projects** → **+ Create** → dê o nome `logosia-arte`
3. Dentro do projeto, clique em **+ Service** → **App**

### 5.2. Conectar com o GitHub

Na tela do app:

1. **Source** → aba **Git**
2. **URL do Repositório**: cole a URL HTTPS do seu repo
   (`https://github.com/SEU-USUARIO/logosia-arte.git`)
3. **Branch**: `main`
4. **Caminho de Build**: `/` (raiz)

> Se o repositório for **privado**, o EasyPanel vai pedir uma chave SSH:
> 1. Clique em **Gerar Chave SSH**
> 2. Copie a chave pública que aparece
> 3. No GitHub → seu repositório → **Settings** → **Deploy keys** →
>    **Add deploy key** → cole a chave, marque "Allow read access"
> 4. Volte ao EasyPanel e clique em **Salvar**

### 5.3. Configurar o build

Ainda na tela do app:

1. **Construção** → escolha **Dockerfile**
   - **Caminho do Dockerfile**: `Dockerfile` (padrão)

   *Alternativa:* se quiser usar **Nixpacks** (sem Dockerfile), funciona
   também — o EasyPanel detecta o `package.json` e configura sozinho.
   Vamos com Dockerfile que é mais previsível.

### 5.4. Configurar a rede / domínio

1. **Domínios** → **+ Add Domain**
2. **Host**: `arte.logosia.com.br`
3. **Path**: `/`
4. **Port**: `4000`
5. **HTTPS**: ative
6. **Generate SSL**: ative (Let's Encrypt, automático)
7. Salve

### 5.5. Volume persistente para uploads

Os avatares e imagens de fundo enviadas pelos usuários ficam em
`/app/data/uploads`. Para não perder a cada redeploy:

1. **Volumes** (ou **Mounts**) → **+ Add**
2. **Type**: `Volume`
3. **Mount Path**: `/app/data`
4. **Volume Name**: `logosia-arte-data`
5. Salve

### 5.6. Variáveis de ambiente

Vá em **Environment** e adicione (uma por linha — copie do `.env.production.example`):

```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
PUBLIC_URL=https://arte.logosia.com.br
SESSION_SECRET=cole-aqui-uma-string-aleatoria-de-32-caracteres
STORAGE_DRIVER=local
UPLOAD_DIR=/app/data/uploads
PUBLIC_UPLOAD_BASE=/uploads
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-sonnet-4-6
```

> **`SESSION_SECRET`**: gere uma string aleatória forte. No PowerShell:
> ```powershell
> [Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
> ```
> Ou online: <https://1password.com/password-generator> (modo "Random" 32 chars).

> **`ANTHROPIC_API_KEY`**: opcional. Sem ela, o sistema usa o gerador "mock"
> determinístico. Para a IA real, pegue em
> [console.anthropic.com](https://console.anthropic.com/settings/keys).

### 5.7. Deploy

1. Clique em **Deploy** no topo da tela
2. Acompanhe os logs em **Logs** — deve aparecer algo como:
   ```
   API:      http://0.0.0.0:4000
   DB:       postgres
   Env:      production
   Migrations aplicadas (Postgres): 1 arquivo(s)
   ```
3. O EasyPanel vai marcar como **Running** quando o healthcheck passar.

---

## 6. Variáveis de ambiente em produção

| Variável | Obrigatória? | Valor exemplo |
|---|---|---|
| `NODE_ENV` | Sim | `production` |
| `PORT` | Sim | `4000` |
| `DATABASE_URL` | Sim | `postgresql://postgres.abc:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres` |
| `PUBLIC_URL` | Sim | `https://arte.logosia.com.br` |
| `SESSION_SECRET` | Sim | string aleatória de 32+ chars |
| `STORAGE_DRIVER` | Sim | `local` |
| `UPLOAD_DIR` | Sim | `/app/data/uploads` |
| `PUBLIC_UPLOAD_BASE` | Sim | `/uploads` |
| `LLM_PROVIDER` | Opcional | `anthropic` / `openai` / `mock` |
| `ANTHROPIC_API_KEY` | Se anthropic | `sk-ant-...` |
| `ANTHROPIC_MODEL` | Opcional | `claude-sonnet-4-6` |
| `OPENAI_API_KEY` | Se openai | `sk-...` |
| `OPENAI_MODEL` | Opcional | `gpt-4o-mini` |

---

## 7. Testar tudo funcionando

### 7.1. Healthcheck

Abra no navegador: <https://arte.logosia.com.br/api/health>

Deve retornar:

```json
{ "ok": true, "ts": 1730000000000, "db": "postgres", "env": "production" }
```

Se `db: "sqlite"` aparecer em vez de `postgres`, sua `DATABASE_URL` está
errada — revise.

### 7.2. Landing page

Abra <https://arte.logosia.com.br>

Deve carregar a página inicial com o logo da Logos|IA, botões "Entrar" e
"Começar grátis".

### 7.3. Fluxo completo de teste

1. Clique em **Começar grátis**
2. Preencha nome + email qualquer → **Entrar / Criar conta**
3. Você cai no Dashboard com 10 créditos
4. Vá em **Carrosséis** → preencha tema, canal, @ → **Gerar carrossel**
5. Veja o preview no frame do Instagram aparecer
6. Clique em **Baixar tudo (ZIP)** → deve baixar `seu-handle.zip` com os PNGs

### 7.4. Verificar no Supabase

Volte ao Supabase → **Table Editor**:

- `users` → deve ter 1 linha (o usuário que você criou)
- `carousels` → 1 linha (o carrossel que você gerou)
- `sessions` → 1 linha (sua sessão ativa)

Se aparecer, **deu certo!** 🎉

---

## 8. Atualizar o site depois (deploy contínuo)

Sempre que você quiser atualizar o site:

```bash
# No seu computador, dentro da pasta do projeto:
git add .
git commit -m "descreva a mudança"
git push
```

No EasyPanel:

1. Vá no app `logosia-arte`
2. Clique em **Deploy** → **Deploy Now**

O EasyPanel pega o código mais recente do GitHub e refaz o build.

### Deploy automático (opcional)

No EasyPanel, em **Deployment** → ative **Auto Deploy on Push** e configure
um **GitHub Webhook**. Aí qualquer `git push` na branch `main` deploya
sozinho — sem precisar apertar o botão.

---

## 9. Troubleshooting

### "Could not connect to database"

- Confirme que `DATABASE_URL` no EasyPanel está com a **senha correta**
  (a que você gerou no passo 3.1)
- Confirme que está usando a porta **`6543`** (pooler), não `5432`
- No Supabase → Settings → Database → role até **Connection pooling** e
  copie novamente

### "502 Bad Gateway"

- O container ainda está subindo. Espere 30 segundos e recarregue.
- Veja os logs no EasyPanel — se aparecer erro de migração ou crash, a
  variável `DATABASE_URL` provavelmente está errada.

### "CORS error" no console do navegador

- A variável `PUBLIC_URL` precisa bater com o domínio que você está
  acessando (incluindo `https://`). Se você acessar pelo IP da VPS em vez
  do domínio, vai dar erro de CORS.

### Imagens enviadas somem depois do deploy

- O volume persistente do passo 5.5 não foi montado. Crie o volume e faça
  redeploy.

### "404 Not Found" em todas as páginas internas (carrosséis, login)

- O build do client não rodou direito. No EasyPanel, vá em **Logs do
  build** e procure por erros. Geralmente é falta de memória — aumente a
  RAM da VPS ou use o **Nixpacks** que limita o build melhor.

### "permission denied (publickey)" ao fazer git push

- Você está usando senha em vez de Personal Access Token. Gere um token em
  <https://github.com/settings/tokens/new> com escopo `repo`, e use ele
  como senha no `git push`.

### O logo / cores não aparecem

- Force refresh com `Ctrl+Shift+R` (limpa cache).
- Se ainda errado, o build pode ter pegado uma versão antiga do
  `logo.png`. Faça redeploy.

---

## Referência rápida

| Recurso | URL |
|---|---|
| Site em produção | `https://arte.logosia.com.br` |
| Healthcheck | `https://arte.logosia.com.br/api/health` |
| Repositório GitHub | `https://github.com/SEU-USUARIO/logosia-arte` |
| Supabase project | `https://supabase.com/dashboard/project/[ref]` |
| EasyPanel app | `https://easypanel.SEU-IP/projects/logosia-arte` |

---

**Dúvida?** Cole o log do erro pra eu te ajudar a diagnosticar.
