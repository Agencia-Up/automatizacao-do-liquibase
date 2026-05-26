-- Logos IA — schema inicial PostgreSQL (Supabase)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  "openId" TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "avatarUrl" TEXT,
  credits INTEGER NOT NULL DEFAULT 10,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions("userId");

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instagram TEXT NOT NULL,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients("userId");

CREATE TABLE IF NOT EXISTS carousels (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  "contextExtra" TEXT,
  "bgColor" TEXT NOT NULL DEFAULT 'white' CHECK ("bgColor" IN ('white','black')),
  template TEXT NOT NULL DEFAULT 'vendas',
  "fontPair" TEXT NOT NULL DEFAULT 'moderno',
  "slideCount" INTEGER NOT NULL DEFAULT 5,
  "channelName" TEXT,
  "channelHandle" TEXT,
  "profileUrl" TEXT,
  "coverUrl" TEXT,
  "ctaText" TEXT,
  accent TEXT NOT NULL DEFAULT '#E4B43C',
  accent2 TEXT NOT NULL DEFAULT '#0C0C3C',
  headlines JSONB NOT NULL,
  caption JSONB NOT NULL,
  extras JSONB,
  "hookHeadline" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_carousels_user ON carousels("userId");
CREATE INDEX IF NOT EXISTS idx_carousels_client ON carousels("clientId");

CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nicho TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('motivacional','engajamento')),
  content JSONB NOT NULL,
  "bgColor" TEXT NOT NULL DEFAULT 'branco' CHECK ("bgColor" IN ('branco','preto')),
  color TEXT NOT NULL DEFAULT '#E4B43C',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories("userId");
