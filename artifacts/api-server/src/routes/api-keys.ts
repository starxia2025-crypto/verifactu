import { Router, type IRouter } from "express";
import { and, apiKeysTable, db, desc, eq, membershipsTable, taxpayerProfilesTable } from "@workspace/db";
import { z } from "zod";
import { getUserId, requireAuth } from "../lib/auth";
import { createPlainApiKey } from "../lib/external-api-auth";

const router: IRouter = Router();

const CreateApiKeyBody = z.object({
  name: z.string().min(2),
  scopes: z.array(z.enum(["ingest:write", "invoices:emit"])).default(["ingest:write"]),
});

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function assertTaxpayerAccess(userId: number, taxpayerId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: taxpayerProfilesTable.id })
    .from(taxpayerProfilesTable)
    .innerJoin(membershipsTable, eq(membershipsTable.organizationId, taxpayerProfilesTable.organizationId))
    .where(
      and(
        eq(taxpayerProfilesTable.id, taxpayerId),
        eq(taxpayerProfilesTable.isActive, true),
        eq(membershipsTable.userId, userId),
        eq(membershipsTable.isActive, true),
      ),
    )
    .limit(1);

  return !!row;
}

function redactKey(key: typeof apiKeysTable.$inferSelect) {
  const { keyHash, ...safe } = key;
  return safe;
}

router.get("/taxpayers/:taxpayerId/api-keys", requireAuth, async (req, res): Promise<void> => {
  const taxpayerId = parseId(req.params.taxpayerId);
  if (!taxpayerId) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }

  if (!(await assertTaxpayerAccess(getUserId(req), taxpayerId))) {
    res.status(404).json({ error: "Taxpayer not found" });
    return;
  }

  const keys = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.taxpayerId, taxpayerId), eq(apiKeysTable.isActive, true)))
    .orderBy(desc(apiKeysTable.createdAt));

  res.json(keys.map(redactKey));
});

router.post("/taxpayers/:taxpayerId/api-keys", requireAuth, async (req, res): Promise<void> => {
  const taxpayerId = parseId(req.params.taxpayerId);
  if (!taxpayerId) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }

  if (!(await assertTaxpayerAccess(getUserId(req), taxpayerId))) {
    res.status(404).json({ error: "Taxpayer not found" });
    return;
  }

  const parsed = CreateApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const generated = createPlainApiKey();
  const [key] = await db
    .insert(apiKeysTable)
    .values({
      taxpayerId,
      name: parsed.data.name,
      scopes: parsed.data.scopes,
      keyPrefix: generated.prefix,
      keyHash: generated.hash,
    })
    .returning();

  res.status(201).json({ ...redactKey(key), token: generated.token });
});

router.delete("/api-keys/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [key] = await db.select().from(apiKeysTable).where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.isActive, true))).limit(1);
  if (!key || !(await assertTaxpayerAccess(getUserId(req), key.taxpayerId))) {
    res.status(404).json({ error: "API key not found" });
    return;
  }

  await db.update(apiKeysTable).set({ isActive: false }).where(eq(apiKeysTable.id, id));
  res.sendStatus(204);
});

export default router;
