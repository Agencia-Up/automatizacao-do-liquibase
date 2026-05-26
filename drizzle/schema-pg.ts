/**
 * Schema PostgreSQL — usado em produção (Supabase).
 * Espelha o schema SQLite (drizzle/schema.ts) com tipos nativos do Postgres:
 *   - serial → autoincrement
 *   - jsonb → JSON
 *   - timestamptz → datas
 *
 * Para alternar entre os dois, defina DATABASE_URL:
 *   - file:./data/sala.db     → usa schema SQLite
 *   - postgresql://...        → usa este schema
 */

import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: text("openId").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatarUrl"),
  credits: integer("credits").notNull().default(10),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" })
    .notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  instagram: text("instagram").notNull(),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
});

export const carousels = pgTable("carousels", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clientId: integer("clientId").references(() => clients.id, {
    onDelete: "set null",
  }),
  prompt: text("prompt").notNull(),
  contextExtra: text("contextExtra"),
  bgColor: text("bgColor").notNull().default("white"),
  template: text("template").notNull().default("vendas"),
  fontPair: text("fontPair").notNull().default("moderno"),
  slideCount: integer("slideCount").notNull().default(5),
  channelName: text("channelName"),
  channelHandle: text("channelHandle"),
  profileUrl: text("profileUrl"),
  coverUrl: text("coverUrl"),
  ctaText: text("ctaText"),
  accent: text("accent").notNull().default("#E4B43C"),
  accent2: text("accent2").notNull().default("#0C0C3C"),
  headlines: jsonb("headlines").notNull(),
  caption: jsonb("caption").notNull(),
  extras: jsonb("extras"),
  hookHeadline: text("hookHeadline"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
});

export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nicho: text("nicho").notNull(),
  type: text("type").notNull(),
  content: jsonb("content").notNull(),
  bgColor: text("bgColor").notNull().default("branco"),
  color: text("color").notNull().default("#E4B43C"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Carousel = typeof carousels.$inferSelect;
export type NewCarousel = typeof carousels.$inferInsert;
export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
