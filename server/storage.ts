import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const PUBLIC_UPLOAD_BASE = process.env.PUBLIC_UPLOAD_BASE || "/uploads";

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const storage = {
  uploadDir: UPLOAD_DIR,
  publicBase: PUBLIC_UPLOAD_BASE,

  put(buffer: Buffer, originalName: string, mimeType: string) {
    const ext =
      path.extname(originalName) ||
      `.${(mimeType.split("/")[1] || "bin").replace("+xml", "")}`;
    const key = `${Date.now()}-${crypto
      .randomBytes(6)
      .toString("hex")}${ext.toLowerCase()}`;
    const fullPath = path.join(UPLOAD_DIR, key);
    fs.writeFileSync(fullPath, buffer);
    return {
      key,
      url: `${PUBLIC_UPLOAD_BASE}/${key}`,
      mimeType,
      size: buffer.byteLength,
    };
  },

  remove(key: string) {
    const fullPath = path.join(UPLOAD_DIR, key);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  },
};
