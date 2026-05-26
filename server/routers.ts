import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure, publicProcedure, router } from "./trpc.js";
import { dbHelpers } from "./db.js";
import { llm } from "./llm.js";
import { loginOrCreateUser, logout, SESSION_COOKIE } from "./auth.js";

const carouselInput = z.object({
  prompt: z.string().min(10, "Mínimo 10 caracteres"),
  contextExtra: z.string().max(2000).optional(),
  template: z
    .enum(["vendas", "educativo", "storytelling", "autoridade", "mito-verdade"])
    .default("vendas"),
  fontPair: z
    .enum([
      "editorial",
      "moderno",
      "acolhedor",
      "tecnico",
      "expressivo",
      "classico",
      "bold",
      "artistico",
    ])
    .default("moderno"),
  bgColor: z.enum(["white", "black"]).default("white"),
  slideCount: z.number().int().min(1).max(10).default(5),
  clientId: z.number().int().optional(),
  channelName: z.string().max(80).optional(),
  channelHandle: z.string().max(80).optional(),
  profileUrl: z.string().max(2000).optional(),
  coverUrl: z.string().max(2000).optional(),
  ctaText: z.string().max(200).optional(),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida")
    .default("#E4B43C"),
  accent2: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida")
    .default("#0C0C3C"),
});

const storyInput = z.object({
  nicho: z.string().min(2),
  type: z.enum(["motivacional", "engajamento"]),
  bgColor: z.enum(["branco", "preto"]).default("branco"),
  color: z.string().default("#F59E0B"),
  count: z.number().int().min(1).max(5).default(3),
});

const clientInput = z.object({
  name: z.string().min(2),
  instagram: z
    .string()
    .min(2)
    .regex(/^@?[a-zA-Z0-9._]{2,30}$/, "Use o formato @usuario"),
  avatarUrl: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal("").optional()),
});

export const appRouter = router({
  // ── AUTH ──
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), name: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const { user, sessionId, expiresAt } = await loginOrCreateUser(input);
        ctx.res.cookie(SESSION_COOKIE, sessionId, {
          httpOnly: true,
          sameSite: "lax",
          expires: expiresAt,
          path: "/",
        });
        return { user };
      }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      await logout(ctx.sessionId);
      ctx.res.clearCookie(SESSION_COOKIE, { path: "/" });
      return { ok: true };
    }),
  }),

  // ── CLIENTS ──
  clients: router({
    list: protectedProcedure.query(({ ctx }) =>
      dbHelpers.listClients(ctx.user.id)
    ),
    create: protectedProcedure
      .input(clientInput)
      .mutation(({ ctx, input }) => {
        const instagram = input.instagram.startsWith("@")
          ? input.instagram
          : `@${input.instagram}`;
        return dbHelpers.createClient({
          userId: ctx.user.id,
          name: input.name,
          instagram,
          avatarUrl: input.avatarUrl || null,
        });
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number() }).merge(clientInput.partial()))
      .mutation(async ({ ctx, input }) => {
        const { id, ...patch } = input;
        if (patch.instagram && !patch.instagram.startsWith("@")) {
          patch.instagram = `@${patch.instagram}`;
        }
        const updated = await dbHelpers.updateClient(
          id,
          ctx.user.id,
          patch as any
        );
        if (!updated)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cliente não encontrado",
          });
        return updated;
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await dbHelpers.deleteClient(input, ctx.user.id);
        return { ok: true };
      }),
  }),

  // ── CAROUSELS ──
  carousels: router({
    list: protectedProcedure.query(({ ctx }) =>
      dbHelpers.listCarousels(ctx.user.id)
    ),
    get: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const c = await dbHelpers.getCarouselById(input, ctx.user.id);
        if (!c) throw new TRPCError({ code: "NOT_FOUND" });
        return c;
      }),
    generate: protectedProcedure
      .input(carouselInput)
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.credits <= 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Sem créditos para gerar carrossel",
          });
        }

        let channelName = input.channelName?.trim();
        let channelHandle = input.channelHandle?.trim();
        let profileUrl = input.profileUrl?.trim();

        if (input.clientId) {
          const client = await dbHelpers.getClient(input.clientId, ctx.user.id);
          if (!client)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Cliente não encontrado",
            });
          // cliente preenche o que estiver vazio
          channelName = channelName || client.name;
          channelHandle = channelHandle || client.instagram;
          profileUrl = profileUrl || client.avatarUrl || undefined;
        }

        if (channelHandle && !channelHandle.startsWith("@")) {
          channelHandle = `@${channelHandle}`;
        }

        const generated = await llm.generateCarousel({
          prompt: input.prompt,
          slideCount: input.slideCount,
          template: input.template,
          clientName: channelName,
          context: input.contextExtra,
        });

        const { headlines, caption, ...extras } = generated;
        const carousel = await dbHelpers.createCarousel({
          userId: ctx.user.id,
          clientId: input.clientId ?? null,
          prompt: input.prompt,
          contextExtra: input.contextExtra ?? null,
          template: input.template,
          fontPair: input.fontPair,
          bgColor: input.bgColor,
          slideCount: input.slideCount,
          channelName: channelName ?? null,
          channelHandle: channelHandle ?? null,
          profileUrl: profileUrl ?? null,
          coverUrl: input.coverUrl?.trim() || null,
          ctaText: input.ctaText?.trim() || null,
          accent: input.accent,
          accent2: input.accent2,
          headlines: headlines as any,
          caption: caption as any,
          extras: extras as any,
        });

        const updated = await dbHelpers.updateUserCredits(ctx.user.id, -1);
        return { carousel, generated, credits: updated!.credits };
      }),
    regenerateHooks: protectedProcedure
      .input(
        z.object({
          prompt: z.string().min(5),
          contextExtra: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const alternatives = await llm.generateHookOptions({
          prompt: input.prompt,
          context: input.contextExtra,
        });
        return { alternatives };
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await dbHelpers.deleteCarousel(input, ctx.user.id);
        return { ok: true };
      }),
  }),

  // ── STORIES ──
  stories: router({
    list: protectedProcedure.query(({ ctx }) =>
      dbHelpers.listStories(ctx.user.id)
    ),
    get: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const s = await dbHelpers.getStoryById(input, ctx.user.id);
        if (!s) throw new TRPCError({ code: "NOT_FOUND" });
        return s;
      }),
    generate: protectedProcedure
      .input(storyInput)
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.credits <= 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Sem créditos para gerar story",
          });
        }

        const stories = await llm.generateStories({
          nicho: input.nicho,
          type: input.type,
          count: input.count,
        });

        const story = await dbHelpers.createStory({
          userId: ctx.user.id,
          nicho: input.nicho,
          type: input.type,
          content: stories as any,
          bgColor: input.bgColor,
          color: input.color,
        });

        const updated = await dbHelpers.updateUserCredits(ctx.user.id, -1);
        return { story, stories, credits: updated!.credits };
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        await dbHelpers.deleteStory(input, ctx.user.id);
        return { ok: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
