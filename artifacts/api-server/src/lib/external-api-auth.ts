import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import { and, apiKeysTable, db, eq } from "@workspace/db";

const API_KEY_SECRET = process.env.API_KEY_SECRET ?? process.env.SESSION_SECRET ?? "fallback-secret-change-me";

export interface ExternalApiContext {
  apiKeyId: number;
  taxpayerId: number;
  scopes: string[];
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(`${API_KEY_SECRET}:${key}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createPlainApiKey() {
  const token = `vf_live_${randomBytes(32).toString("base64url")}`;
  return {
    token,
    prefix: token.slice(0, 16),
    hash: hashApiKey(token),
  };
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "API key required" });
    return;
  }

  const token = authHeader.slice(7).trim();
  const prefix = token.slice(0, 16);
  const hash = hashApiKey(token);
  const candidates = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.keyPrefix, prefix), eq(apiKeysTable.isActive, true)));

  const apiKey = candidates.find((candidate) => safeEqual(candidate.keyHash, hash));
  if (!apiKey) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  await db.update(apiKeysTable).set({ lastUsedAt: new Date() }).where(eq(apiKeysTable.id, apiKey.id));
  (req as any).externalApi = {
    apiKeyId: apiKey.id,
    taxpayerId: apiKey.taxpayerId,
    scopes: apiKey.scopes,
  } satisfies ExternalApiContext;

  next();
}

export function getExternalApiContext(req: Request): ExternalApiContext {
  return (req as any).externalApi as ExternalApiContext;
}

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const context = getExternalApiContext(req);
    if (!context?.scopes?.includes(scope)) {
      res.status(403).json({ error: "Insufficient API key scope" });
      return;
    }
    next();
  };
}
