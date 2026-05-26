/**
 * Camada de banco de dados — detecta automaticamente Postgres (Supabase) ou
 * SQLite local pela connection string.
 *
 *  - postgresql://… / postgres://…  → Postgres via postgres-js + drizzle-orm/postgres-js
 *  - file:… / caminho local        → SQLite via @libsql/client + drizzle-orm/libsql
 *
 * Mantém uma API unificada (`dbHelpers`) usada pelos routers tRPC.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

import * as sqliteSchema from "../drizzle/schema.js";
import * as pgSchema from "../drizzle/schema-pg.js";

type AnyUser = sqliteSchema.User | pgSchema.User;
type AnyClient = sqliteSchema.Client | pgSchema.Client;
type AnyCarousel = sqliteSchema.Carousel | pgSchema.Carousel;
type AnyStory = sqliteSchema.Story | pgSchema.Story;

const RAW_URL = process.env.DATABASE_URL || "./data/sala.db";
export const isPostgres = /^postgres(ql)?:\/\//i.test(RAW_URL);

let db: any;
let schema: any;
let migrationsDir: string;
let pgRawClient: any = null;

if (isPostgres) {
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = (await import("postgres")).default;
  // Supabase exige SSL; postgres-js detecta automaticamente via ?sslmode=require
  // mas reforçamos aqui para garantir.
  pgRawClient = postgres(RAW_URL, {
    max: 5,
    prepare: false,
    ssl: "require",
  });
  db = drizzle(pgRawClient, { schema: pgSchema });
  schema = pgSchema;
  migrationsDir = path.resolve("./drizzle/migrations-pg");
} else {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const dbPath = RAW_URL.startsWith("file:")
    ? RAW_URL
    : `file:${path.resolve(RAW_URL)}`;
  const dir = path.dirname(RAW_URL.replace(/^file:/, ""));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const client = createClient({ url: dbPath });
  db = drizzle(client, { schema: sqliteSchema });
  schema = sqliteSchema;
  migrationsDir = path.resolve("./drizzle/migrations");
  pgRawClient = client; // execute() existe em ambos
}

export { db, schema };

// ──────────────────────────────────────────────────────────────────────────
// Migrations runner
// ──────────────────────────────────────────────────────────────────────────

export async function runMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    console.warn(`Diretório de migrations não existe: ${migrationsDir}`);
    return;
  }
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sqlText = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    const cleaned = sqlText
      .split("\n")
      .map((line) => {
        const idx = line.indexOf("--");
        return idx >= 0 ? line.slice(0, idx) : line;
      })
      .join("\n");
    const statements = cleaned
      .split(/;\s*(?:\n|$)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        if (isPostgres) {
          await pgRawClient.unsafe(stmt);
        } else {
          await pgRawClient.execute(stmt);
        }
      } catch (err: any) {
        const msg = String(err?.message || err);
        // idempotência: ignora colunas/tabelas/índices já existentes
        if (
          /duplicate column/i.test(msg) ||
          /already exists/i.test(msg)
        ) {
          continue;
        }
        throw err;
      }
    }
  }
  console.log(
    `Migrations aplicadas (${isPostgres ? "Postgres" : "SQLite"}): ${files.length} arquivo(s)`
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers (API unificada — funciona em ambos os bancos)
// ──────────────────────────────────────────────────────────────────────────

export const dbHelpers = {
  // users
  async getUserByOpenId(openId: string): Promise<AnyUser | undefined> {
    return db
      .select()
      .from(schema.users)
      .where(eq(schema.users.openId, openId))
      .limit(1)
      .then((r: AnyUser[]) => r[0]);
  },
  async getUserById(id: number): Promise<AnyUser | undefined> {
    return db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1)
      .then((r: AnyUser[]) => r[0]);
  },
  async createUser(data: any): Promise<AnyUser> {
    const rows = await db.insert(schema.users).values(data).returning();
    return rows[0];
  },
  async updateUserCredits(id: number, delta: number): Promise<AnyUser> {
    const rows = await db
      .update(schema.users)
      .set({
        credits: sql`${schema.users.credits} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning();
    return rows[0];
  },

  // sessions
  async createSession(id: string, userId: number, expiresAt: Date) {
    await db.insert(schema.sessions).values({ id, userId, expiresAt });
  },
  async getSession(id: string) {
    return db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, id))
      .limit(1)
      .then((r: any[]) => r[0]);
  },
  async deleteSession(id: string) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
  },

  // clients
  async listClients(userId: number): Promise<AnyClient[]> {
    return db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.userId, userId))
      .orderBy(desc(schema.clients.createdAt));
  },
  async getClient(id: number, userId: number): Promise<AnyClient | undefined> {
    return db
      .select()
      .from(schema.clients)
      .where(and(eq(schema.clients.id, id), eq(schema.clients.userId, userId)))
      .limit(1)
      .then((r: AnyClient[]) => r[0]);
  },
  async createClient(data: any): Promise<AnyClient> {
    const rows = await db.insert(schema.clients).values(data).returning();
    return rows[0];
  },
  async updateClient(
    id: number,
    userId: number,
    patch: any
  ): Promise<AnyClient | undefined> {
    const rows = await db
      .update(schema.clients)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(schema.clients.id, id), eq(schema.clients.userId, userId)))
      .returning();
    return rows[0];
  },
  async deleteClient(id: number, userId: number) {
    await db
      .delete(schema.clients)
      .where(and(eq(schema.clients.id, id), eq(schema.clients.userId, userId)));
  },

  // carousels
  async listCarousels(userId: number): Promise<AnyCarousel[]> {
    return db
      .select()
      .from(schema.carousels)
      .where(eq(schema.carousels.userId, userId))
      .orderBy(desc(schema.carousels.createdAt));
  },
  async getCarouselById(
    id: number,
    userId: number
  ): Promise<AnyCarousel | undefined> {
    return db
      .select()
      .from(schema.carousels)
      .where(
        and(eq(schema.carousels.id, id), eq(schema.carousels.userId, userId))
      )
      .limit(1)
      .then((r: AnyCarousel[]) => r[0]);
  },
  async createCarousel(data: any): Promise<AnyCarousel> {
    const rows = await db.insert(schema.carousels).values(data).returning();
    return rows[0];
  },
  async deleteCarousel(id: number, userId: number) {
    await db
      .delete(schema.carousels)
      .where(
        and(eq(schema.carousels.id, id), eq(schema.carousels.userId, userId))
      );
  },

  // stories
  async listStories(userId: number): Promise<AnyStory[]> {
    return db
      .select()
      .from(schema.stories)
      .where(eq(schema.stories.userId, userId))
      .orderBy(desc(schema.stories.createdAt));
  },
  async getStoryById(
    id: number,
    userId: number
  ): Promise<AnyStory | undefined> {
    return db
      .select()
      .from(schema.stories)
      .where(and(eq(schema.stories.id, id), eq(schema.stories.userId, userId)))
      .limit(1)
      .then((r: AnyStory[]) => r[0]);
  },
  async createStory(data: any): Promise<AnyStory> {
    const rows = await db.insert(schema.stories).values(data).returning();
    return rows[0];
  },
  async deleteStory(id: number, userId: number) {
    await db
      .delete(schema.stories)
      .where(and(eq(schema.stories.id, id), eq(schema.stories.userId, userId)));
  },
};
