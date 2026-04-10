import { Router, type IRouter } from "express";
import { db, invoiceSeriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  ListSeriesParams,
  CreateSeriesParams,
  CreateSeriesBody,
  UpdateSeriesParams,
  UpdateSeriesBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/taxpayers/:taxpayerId/series", requireAuth, async (req, res): Promise<void> => {
  const params = ListSeriesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const series = await db
    .select()
    .from(invoiceSeriesTable)
    .where(eq(invoiceSeriesTable.taxpayerId, params.data.taxpayerId));
  res.json(series);
});

router.post("/taxpayers/:taxpayerId/series", requireAuth, async (req, res): Promise<void> => {
  const params = CreateSeriesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const parsed = CreateSeriesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const year = parsed.data.year ?? new Date().getFullYear();
  const [series] = await db
    .insert(invoiceSeriesTable)
    .values({
      ...parsed.data,
      taxpayerId: params.data.taxpayerId,
      year,
      currentNumber: parsed.data.startNumber ?? 1,
      isDefault: parsed.data.isDefault ?? false,
    })
    .returning();
  res.status(201).json(series);
});

router.patch("/series/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateSeriesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateSeriesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [series] = await db
    .update(invoiceSeriesTable)
    .set(parsed.data)
    .where(eq(invoiceSeriesTable.id, params.data.id))
    .returning();
  if (!series) {
    res.status(404).json({ error: "Series not found" });
    return;
  }
  res.json(series);
});

export default router;
