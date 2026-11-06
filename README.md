# Simulou Passou · Logos IA

O projeto Simulou Passou está em [`simulou-passou/`](simulou-passou/README.md): página de vendas, cadastro/login, área de membros, simulados, revisão, anotações, planejamento e administração.

Publicado em **https://logosiabrasil.com/simulou-passou/**, com autenticação Supabase e dados isolados do módulo. O catálogo ainda é demonstrativo e as vendas estão desativadas. Veja [`simulou-passou/PUBLICACAO.md`](simulou-passou/PUBLICACAO.md) para o estado real da integração e os próximos passos.

Para desenvolvimento local, com Node.js 24 e pnpm:

```sh
cd simulou-passou
pnpm install --frozen-lockfile
pnpm test
pnpm start
```

O código anterior do gerador de arte foi mantido abaixo e nas pastas originais. Os comandos da raiz e o Dockerfile original continuam pertencendo a esse gerador; não publicam o Simulou Passou.

---

# Gerador de arte — projeto anterior

Plataforma full-stack para gerar **carrosséis (1080×1080)** e **stories (1080×1920)** prontos para o Instagram, com IA e renderização Canvas. Cada usuário gerencia clientes, gera conteúdo, baixa em PNG (individual ou em lote) e consulta o histórico — tudo com um sistema de créditos.

| Camada     | Tecnologia                                            |
| ---------- | ----------------------------------------------------- |
| Front      | React 18 · TypeScript · Vite · Tailwind · Radix UI    |
| API        | tRPC v11 sobre Express                                |
| ORM        | Drizzle (SQLite via `better-sqlite3`)                 |
| LLM        | Anthropic · OpenAI · ou fallback determinístico (mock)|
| Storage    | Uploads locais em `data/uploads` (S3 plugável)        |
| Auth       | Sessão por cookie (placeholder para Manus OAuth)      |

## Comece em 3 passos

```bash
# 1) Instale as dependências
npm install

# 2) Copie o .env de exemplo e ajuste
cp .env.example .env

# 3) Suba o dev (Vite + API juntos)
npm run dev
```

- Front: <http://localhost:5173>
- API: <http://localhost:4000>

Na primeira execução, o banco SQLite é criado em `./data/sala.db` e a migração `drizzle/migrations/0001_initial.sql` é aplicada automaticamente pelo servidor.

## Scripts

| Comando             | O que faz                                                   |
| ------------------- | ----------------------------------------------------------- |
| `npm run dev`       | Vite + servidor com hot reload                              |
| `npm run dev:client`| Apenas o front (Vite)                                       |
| `npm run dev:server`| Apenas a API (`tsx watch`)                                  |
| `npm run build`     | Compila TS + bundle Vite para `dist/client`                 |
| `npm start`         | Roda a API em modo prod servindo `dist/client`              |
| `npm run db:migrate`| Executa a migração SQL manualmente                          |
| `npm run typecheck` | Type-check sem emitir                                       |
| `npm test`          | Roda os testes Vitest                                       |

## Estrutura

```
.
├── client/
│   ├── index.html
│   ├── public/             # manifest.json, favicon.svg, icone.svg
│   └── src/
│       ├── App.tsx · main.tsx · index.css
│       ├── components/
│       │   ├── Layout.tsx · Sidebar.tsx
│       │   ├── CarouselPreview.tsx · StoryPreview.tsx · ImageUpload.tsx
│       │   └── ui/         # button, card, input, dialog, tabs…
│       ├── hooks/useAuth.tsx
│       ├── lib/utils.ts
│       ├── pages/          # Home, Login, Dashboard, Carousels, Stories, Clients, History
│       ├── providers/TRPCProvider.tsx
│       └── utils/canvasRenderer.ts · trpc.ts
├── server/
│   ├── index.ts            # Express + tRPC + uploads
│   ├── routers.ts          # auth · clients · carousels · stories
│   ├── trpc.ts · context.ts
│   ├── auth.ts             # sessão por cookie
│   ├── llm.ts              # Anthropic / OpenAI / mock
│   ├── storage.ts          # uploads locais
│   ├── db.ts · db-migrate.ts
├── drizzle/
│   ├── schema.ts
│   └── migrations/0001_initial.sql
├── tailwind.config.js · postcss.config.js
├── tsconfig.json · vite.config.ts · drizzle.config.ts
└── package.json
```

## LLM

Por padrão `LLM_PROVIDER=mock` — funciona sem chave de API, gerando templates determinísticos. Para usar IA real, defina:

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

ou

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Se a chave estiver ausente ou houver erro de rede, o serviço cai automaticamente para o mock — a UI nunca quebra.

## Banco de dados

Tabelas (SQLite):

| Tabela     | Campos principais                                                   |
| ---------- | ------------------------------------------------------------------- |
| users      | id, openId, name, email, credits (default 10), role                 |
| sessions   | id, userId, expiresAt                                               |
| clients    | id, userId, name, instagram, avatarUrl                              |
| carousels  | id, userId, clientId, prompt, bgColor, slideCount, headlines, caption |
| stories    | id, userId, nicho, type, content, bgColor, color                    |

Para migrar manualmente:

```bash
npm run db:migrate
```

## Cores e tipografia

- **Dourado** `#E4B43C` (primário) · **Navy** `#0C0C3C` (secundário) · **Sky** `#0C84CC` (accent)
- Títulos: **Sora** (700/800) · Texto: **Nunito** (400/600/700)
- Paleta extraída diretamente do logo Logos | IA — 8 tokens derivados automaticamente

## Fluxo de uso

1. **Login** com email + nome (ganha 10 créditos)
2. **Clientes** → cadastrar perfil (`@instagram` + avatar opcional)
3. **Carrosséis** → escolher fundo, slides, cliente, gerar
4. **Stories** → nicho + tipo (motivacional / engajamento) + cor de destaque
5. **Histórico** → reabrir, baixar de novo ou excluir

Cada geração consome 1 crédito. Para conceder mais, atualize `credits` direto na tabela `users` (ou crie um endpoint admin).

## Próximos passos sugeridos

- Substituir `auth.ts` por Manus OAuth real (variáveis já reservadas no `.env`)
- Plugar `storage.ts` em S3 (estrutura `put/remove` já isola o driver)
- Adicionar webhook para reabastecer créditos via Stripe/Pix
- Cobertura de testes em `server/routers.test.ts`

---

Feito para acelerar a operação de uma agência social. Bom uso! ✨
