-- Logos IA — schema inicial (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openId TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatarUrl TEXT,
  credits INTEGER NOT NULL DEFAULT 10,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instagram TEXT NOT NULL,
  avatarUrl TEXT,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(userId);

CREATE TABLE IF NOT EXISTS carousels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clientId INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  bgColor TEXT NOT NULL DEFAULT 'white' CHECK (bgColor IN ('white','black')),
  slideCount INTEGER NOT NULL DEFAULT 4,
  headlines TEXT NOT NULL,
  caption TEXT NOT NULL,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_carousels_user ON carousels(userId);
CREATE INDEX IF NOT EXISTS idx_carousels_client ON carousels(clientId);

CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nicho TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('motivacional','engajamento')),
  content TEXT NOT NULL,
  bgColor TEXT NOT NULL DEFAULT 'branco' CHECK (bgColor IN ('branco','preto')),
  color TEXT NOT NULL DEFAULT '#F59E0B',
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(userId);
