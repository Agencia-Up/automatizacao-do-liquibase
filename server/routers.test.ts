import { describe, it, expect, beforeAll } from "vitest";
import { dbHelpers, runMigrations } from "./db.js";
import { loginOrCreateUser } from "./auth.js";

beforeAll(async () => {
  await runMigrations();
});

describe("Auth", () => {
  it("cria usuário com 10 créditos padrão", async () => {
    const { user } = await loginOrCreateUser({
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
    });
    expect(user.credits).toBe(10);
  });
});

describe("Clients", () => {
  it("CRUD básico de clientes", async () => {
    const { user } = await loginOrCreateUser({
      email: `c-${Date.now()}@example.com`,
      name: "Owner",
    });

    const c = await dbHelpers.createClient({
      userId: user.id,
      name: "Estúdio X",
      instagram: "@estudiox",
      avatarUrl: null,
    });
    expect(c!.id).toBeGreaterThan(0);

    const list = await dbHelpers.listClients(user.id);
    expect(list.length).toBeGreaterThanOrEqual(1);

    const updated = await dbHelpers.updateClient(c!.id, user.id, {
      name: "Estúdio X (atualizado)",
    });
    expect(updated?.name).toContain("atualizado");

    await dbHelpers.deleteClient(c!.id, user.id);
  });
});

describe("Créditos", () => {
  it("debita créditos corretamente", async () => {
    const { user } = await loginOrCreateUser({
      email: `cr-${Date.now()}@example.com`,
      name: "Credit User",
    });
    const before = user.credits;
    const updated = await dbHelpers.updateUserCredits(user.id, -1);
    expect(updated!.credits).toBe(before - 1);
  });
});
