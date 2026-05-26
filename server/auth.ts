import crypto from "node:crypto";
import { dbHelpers } from "./db.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias
export const SESSION_COOKIE = "sala_session";

export function generateSessionId() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Login simples (sem OAuth real). Se as credenciais Manus OAuth estiverem
 * configuradas, este ponto é onde a integração entraria — por enquanto
 * criamos/recuperamos um usuário pelo email.
 */
export async function loginOrCreateUser(input: { email: string; name: string }) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const openId = `local::${email}`;

  let user = await dbHelpers.getUserByOpenId(openId);
  if (!user) {
    user = await dbHelpers.createUser({
      openId,
      name: name || email.split("@")[0],
      email,
      credits: 10,
    });
  }

  const sid = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await dbHelpers.createSession(sid, user!.id, expiresAt);

  return { user: user!, sessionId: sid, expiresAt };
}

export async function getUserFromSession(sessionId: string | undefined) {
  if (!sessionId) return null;
  const session = await dbHelpers.getSession(sessionId);
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await dbHelpers.deleteSession(sessionId);
    return null;
  }
  const user = await dbHelpers.getUserById(session.userId);
  return user ?? null;
}

export async function logout(sessionId: string | undefined) {
  if (!sessionId) return;
  await dbHelpers.deleteSession(sessionId);
}
