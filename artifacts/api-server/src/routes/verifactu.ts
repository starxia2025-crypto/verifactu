import { Router, type IRouter } from "express";
import { db, verifactuRecordsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  ListVeriFactuRecordsParams,
  ListVeriFactuRecordsQueryParams,
  GetVeriFactuRecordParams,
  SubmitVeriFactuRecordParams,
  RetryVeriFactuRecordParams,
} from "@workspace/api-zod";
import { submitToAeat } from "../lib/verifactu";
import { taxpayerProfilesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/taxpayers/:taxpayerId/verifactu/records", requireAuth, async (req, res): Promise<void> => {
  const params = ListVeriFactuRecordsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const { taxpayerId } = params.data;
  const qp = ListVeriFactuRecordsQueryParams.safeParse(req.query);
  const page = qp.success && qp.data.page ? Number(qp.data.page) : 1;
  const limit = qp.success && qp.data.limit ? Number(qp.data.limit) : 20;
  const status = qp.success ? qp.data.status : undefined;

  const conditions = [eq(verifactuRecordsTable.taxpayerId, taxpayerId)];
  if (status) conditions.push(eq(verifactuRecordsTable.status, status));

  const all = await db
    .select()
    .from(verifactuRecordsTable)
    .where(and(...conditions));

  const total = all.length;
  const offset = (page - 1) * limit;
  const items = all.slice(offset, offset + limit);

  res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
});

router.get("/verifactu/records/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetVeriFactuRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [record] = await db
    .select()
    .from(verifactuRecordsTable)
    .where(eq(verifactuRecordsTable.id, params.data.id))
    .limit(1);
  if (!record) {
    res.status(404).json({ error: "VeriFactu record not found" });
    return;
  }
  res.json(record);
});

router.post("/verifactu/records/:id/submit", requireAuth, async (req, res): Promise<void> => {
  const params = SubmitVeriFactuRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = params.data;

  const [record] = await db.select().from(verifactuRecordsTable).where(eq(verifactuRecordsTable.id, id)).limit(1);
  if (!record) {
    res.status(404).json({ error: "Record not found" });
    return;
  }

  const [taxpayer] = await db
    .select()
    .from(taxpayerProfilesTable)
    .where(eq(taxpayerProfilesTable.id, record.taxpayerId))
    .limit(1);

  const result = await submitToAeat(record, taxpayer?.aeatEnvironment as "sandbox" | "production" ?? "sandbox");

  const [updated] = await db
    .update(verifactuRecordsTable)
    .set({
      status: result.success ? "ACCEPTED" : "ERROR",
      submittedAt: new Date(),
      aeatCsv: result.csv ?? null,
      aeatErrorCode: result.errorCode ?? null,
      aeatErrorMessage: result.errorMessage ?? null,
      retryCount: record.retryCount + 1,
    })
    .where(eq(verifactuRecordsTable.id, id))
    .returning();

  res.json(updated);
});

router.post("/verifactu/records/:id/retry", requireAuth, async (req, res): Promise<void> => {
  const params = RetryVeriFactuRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = params.data;

  const [record] = await db.select().from(verifactuRecordsTable).where(eq(verifactuRecordsTable.id, id)).limit(1);
  if (!record) {
    res.status(404).json({ error: "Record not found" });
    return;
  }

  if (record.retryCount >= 5) {
    res.status(400).json({ error: "Máximo de reintentos alcanzado (5)" });
    return;
  }

  const [taxpayer] = await db.select().from(taxpayerProfilesTable).where(eq(taxpayerProfilesTable.id, record.taxpayerId)).limit(1);
  const result = await submitToAeat(record, taxpayer?.aeatEnvironment as "sandbox" | "production" ?? "sandbox");

  const [updated] = await db
    .update(verifactuRecordsTable)
    .set({
      status: result.success ? "ACCEPTED" : "ERROR",
      submittedAt: new Date(),
      aeatCsv: result.csv ?? null,
      aeatErrorCode: result.errorCode ?? null,
      aeatErrorMessage: result.errorMessage ?? null,
      retryCount: record.retryCount + 1,
    })
    .where(eq(verifactuRecordsTable.id, id))
    .returning();

  res.json(updated);
});

export default router;
