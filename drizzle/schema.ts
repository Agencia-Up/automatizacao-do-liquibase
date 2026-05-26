import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatarUrl"),
  credits: integer("credits").notNull().default(10),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  instagram: text("instagram").notNull(),
  avatarUrl: text("avatarUrl"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const carousels = sqliteTable("carousels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clientId: integer("clientId").references(() => clients.id, {
    onDelete: "set null",
  }),
  prompt: text("prompt").notNull(),
  contextExtra: text("contextExtra"),
  bgColor: text("bgColor", { enum: ["white", "black"] })
    .notNull()
    .default("white"),
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
  headlines: text("headlines", { mode: "json" }).notNull(),
  caption: text("caption", { mode: "json" }).notNull(),
  extras: text("extras", { mode: "json" }),
  hookHeadline: text("hookHeadline"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const stories = sqliteTable("stories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nicho: text("nicho").notNull(),
  type: text("type", { enum: ["motivacional", "engajamento"] }).notNull(),
  content: text("content", { mode: "json" }).notNull(),
  bgColor: text("bgColor", { enum: ["branco", "preto"] })
    .notNull()
    .default("branco"),
  color: text("color").notNull().default("#F59E0B"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Carousel = typeof carousels.$inferSelect;
export type NewCarousel = typeof carousels.$inferInsert;
export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
