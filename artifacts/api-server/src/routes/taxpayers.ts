import { Router, type IRouter } from "express";
import { db, taxpayerProfilesTable, organizationsTable, membershipsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUserId } from "../lib/auth";
import {
  ListTaxpayersParams,
  CreateTaxpayerParams,
  CreateTaxpayerBody,
  GetTaxpayerParams,
  UpdateTaxpayerParams,
  UpdateTaxpayerBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/organizations/:orgId/taxpayers", requireAuth, async (req, res): Promise<void> => {
  const params = ListTaxpayersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid orgId" });
    return;
  }
  const { orgId } = params.data;
  const taxpayers = await db
    .select()
    .from(taxpayerProfilesTable)
    .where(eq(taxpayerProfilesTable.organizationId, orgId));
  res.json(taxpayers);
});

router.post("/organizations/:orgId/taxpayers", requireAuth, async (req, res): Promise<void> => {
  const params = CreateTaxpayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid orgId" });
    return;
  }
  const { orgId } = params.data;
  const parsed = CreateTaxpayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [taxpayer] = await db
    .insert(taxpayerProfilesTable)
    .values({ ...parsed.data, organizationId: orgId, country: parsed.data.country ?? "ES" })
    .returning();
  res.status(201).json(taxpayer);
});

router.get("/taxpayers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetTaxpayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [taxpayer] = await db
    .select()
    .from(taxpayerProfilesTable)
    .where(eq(taxpayerProfilesTable.id, params.data.id))
    .limit(1);
  if (!taxpayer) {
    res.status(404).json({ error: "Taxpayer not found" });
    return;
  }
  res.json(taxpayer);
});

router.patch("/taxpayers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateTaxpayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateTaxpayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [taxpayer] = await db
    .update(taxpayerProfilesTable)
    .set(parsed.data)
    .where(eq(taxpayerProfilesTable.id, params.data.id))
    .returning();
  if (!taxpayer) {
    res.status(404).json({ error: "Taxpayer not found" });
    return;
  }
  res.json(taxpayer);
});

export default router;
