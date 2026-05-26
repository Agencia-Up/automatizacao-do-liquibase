import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookie } from "cookie";
import { getUserFromSession, SESSION_COOKIE } from "./auth.js";
import type { User } from "../drizzle/schema.js";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const cookies = parseCookie(req.headers.cookie ?? "");
  const sessionId = cookies[SESSION_COOKIE];
  const user: User | null = await getUserFromSession(sessionId);
  return { req, res, user, sessionId };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
