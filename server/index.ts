import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { appRouter } from "./routers.js";
import { createContext } from "./context.js";
import { runMigrations, isPostgres } from "./db.js";
import { storage } from "./storage.js";

await runMigrations();

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const isProd = process.env.NODE_ENV === "production";

// Confia no proxy (EasyPanel/Traefik) — necessário pra cookies seguros funcionarem
app.set("trust proxy", 1);

/**
 * CORS — em produção, restringe à URL pública configurada em PUBLIC_URL.
 * Em dev, libera o Vite (5173/5174).
 */
const publicOrigins = (process.env.PUBLIC_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOrigins = isProd
  ? publicOrigins.length > 0
    ? publicOrigins
    : true
  : ["http://localhost:5173", "http://localhost:5174"];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));

// Uploads estáticos
app.use(
  storage.publicBase,
  express.static(path.resolve(storage.uploadDir), {
    maxAge: isProd ? "30d" : 0,
  })
);

// Upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado" });
    return;
  }
  if (!req.file.mimetype.startsWith("image/")) {
    res.status(400).json({ error: "Somente imagens são permitidas" });
    return;
  }
  const result = storage.put(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype
  );
  res.json(result);
});

// tRPC
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`[tRPC] ${path}:`, error);
      }
    },
  })
);

// Healthcheck para EasyPanel/uptime monitors
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
    db: isPostgres ? "postgres" : "sqlite",
    env: process.env.NODE_ENV || "development",
  });
});

// Servir build em produção
if (isProd) {
  const clientDist = path.resolve("./dist/client");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: "1h" }));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  } else {
    console.warn("⚠ dist/client não encontrado. Rode `npm run build` antes.");
  }
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API:      http://0.0.0.0:${PORT}`);
  console.log(`DB:       ${isPostgres ? "postgres" : "sqlite"}`);
  console.log(`Env:      ${process.env.NODE_ENV || "development"}`);
  if (!isProd) console.log(`Vite dev: http://localhost:5173`);
});
