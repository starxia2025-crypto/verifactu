import { Router, type IRouter } from "express";
import {
  db,
  clientsTable,
  invoiceLinesTable,
  invoiceSeriesTable,
  invoicesTable,
  productsTable,
  verifactuRecordsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { buildVeriFactuRecord } from "../lib/verifactu";
import { getExternalApiContext, requireApiKey, requireScope } from "../lib/external-api-auth";

const router: IRouter = Router();

const ClientInput = z.object({
  name: z.string().min(2),
  nif: z.string().optional().nullable(),
  nifType: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  country: z.string().default("ES"),
  iban: z.string().optional().nullable(),
});

const ProductInput = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  unitPrice: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(100).default(21),
  unit: z.string().optional().nullable(),
});

const InvoiceLineInput = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(100).default(21),
  discount: z.coerce.number().min(0).max(100).default(0),
  productId: z.number().int().positive().optional().nullable(),
});

const InvoiceInput = z.object({
  clientId: z.number().int().positive().optional().nullable(),
  client: ClientInput.optional(),
  seriesId: z.number().int().positive().optional().nullable(),
  invoiceType: z.string().default("STANDARD"),
  issueDate: z.string().optional().nullable(),
  operationDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  emitImmediately: z.boolean().default(false),
  lines: z.array(InvoiceLineInput).min(1),
});

function calcLine(line: z.infer<typeof InvoiceLineInput>) {
  const subtotal = line.quantity * line.unitPrice * (1 - line.discount / 100);
  const vatAmount = subtotal * (line.vatRate / 100);
  return {
    subtotal: subtotal.toFixed(4),
    vatAmount: vatAmount.toFixed(4),
    total: (subtotal + vatAmount).toFixed(4),
  };
}

function calcTotals(lines: Array<ReturnType<typeof calcLine>>) {
  const subtotal = lines.reduce((sum, line) => sum + Number(line.subtotal), 0);
  const vatAmount = lines.reduce((sum, line) => sum + Number(line.vatAmount), 0);
  return {
    subtotal: subtotal.toFixed(4),
    vatAmount: vatAmount.toFixed(4),
    total: (subtotal + vatAmount).toFixed(4),
  };
}

async function getInvoiceWithRelations(id: number) {
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).limit(1);
  if (!invoice) return null;
  const lines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, id));
  const client = invoice.clientId
    ? (await db.select().from(clientsTable).where(eq(clientsTable.id, invoice.clientId)).limit(1))[0] ?? null
    : null;
  const verifactuRecord = (await db.select().from(verifactuRecordsTable).where(eq(verifactuRecordsTable.invoiceId, id)).limit(1))[0] ?? null;
  return { ...invoice, lines, client, verifactuRecord };
}

router.get("/public/v1/health", (_req, res) => {
  res.json({ ok: true, service: "verifactu-external-api", version: "v1" });
});

router.post("/public/v1/clients", requireApiKey, requireScope("ingest:write"), async (req, res): Promise<void> => {
  const parsed = ClientInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { taxpayerId } = getExternalApiContext(req);
  const data = parsed.data;
  let existing = null;
  if (data.nif) {
    [existing] = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.taxpayerId, taxpayerId), eq(clientsTable.nif, data.nif)))
      .limit(1);
  }

  const values = {
    taxpayerId,
    name: data.name,
    nif: data.nif ?? null,
    nifType: data.nifType ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    address: data.address ?? null,
    city: data.city ?? null,
    postalCode: data.postalCode ?? null,
    province: data.province ?? null,
    country: data.country,
    iban: data.iban ?? null,
  };

  if (existing) {
    const [client] = await db.update(clientsTable).set(values).where(eq(clientsTable.id, existing.id)).returning();
    res.json(client);
    return;
  }

  const [client] = await db.insert(clientsTable).values(values).returning();
  res.status(201).json(client);
});

router.post("/public/v1/products", requireApiKey, requireScope("ingest:write"), async (req, res): Promise<void> => {
  const parsed = ProductInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { taxpayerId } = getExternalApiContext(req);
  const [product] = await db
    .insert(productsTable)
    .values({
      taxpayerId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      unitPrice: String(parsed.data.unitPrice),
      vatRate: String(parsed.data.vatRate),
      unit: parsed.data.unit ?? null,
    })
    .returning();

  res.status(201).json(product);
});

router.post("/public/v1/invoices", requireApiKey, requireScope("ingest:write"), async (req, res): Promise<void> => {
  const parsed = InvoiceInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const context = getExternalApiContext(req);
  if (parsed.data.emitImmediately && !context.scopes.includes("invoices:emit")) {
    res.status(403).json({ error: "La clave API no tiene permiso para emitir facturas." });
    return;
  }

  let clientId = parsed.data.clientId ?? null;
  if (!clientId && parsed.data.client) {
    const [client] = await db
      .insert(clientsTable)
      .values({
        taxpayerId: context.taxpayerId,
        name: parsed.data.client.name,
        nif: parsed.data.client.nif ?? null,
        nifType: parsed.data.client.nifType ?? null,
        email: parsed.data.client.email ?? null,
        phone: parsed.data.client.phone ?? null,
        address: parsed.data.client.address ?? null,
        city: parsed.data.client.city ?? null,
        postalCode: parsed.data.client.postalCode ?? null,
        province: parsed.data.client.province ?? null,
        country: parsed.data.client.country,
        iban: parsed.data.client.iban ?? null,
      })
      .returning();
    clientId = client.id;
  }

  const linesWithCalc = parsed.data.lines.map((line, index) => ({
    ...line,
    ...calcLine(line),
    sortOrder: index,
  }));
  const totals = calcTotals(linesWithCalc);

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      taxpayerId: context.taxpayerId,
      seriesId: parsed.data.seriesId ?? null,
      clientId,
      invoiceType: parsed.data.invoiceType,
      issueDate: parsed.data.issueDate ?? null,
      operationDate: parsed.data.operationDate ?? null,
      dueDate: parsed.data.dueDate ?? null,
      notes: parsed.data.notes ?? null,
      paymentMethod: parsed.data.paymentMethod ?? null,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      status: "DRAFT",
      originSource: "EXTERNAL_API",
    })
    .returning();

  await db.insert(invoiceLinesTable).values(
    linesWithCalc.map((line) => ({
      invoiceId: invoice.id,
      description: line.description,
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
      vatRate: String(line.vatRate),
      discount: String(line.discount),
      subtotal: line.subtotal,
      vatAmount: line.vatAmount,
      total: line.total,
      productId: line.productId ?? null,
      sortOrder: line.sortOrder,
    })),
  );

  if (parsed.data.emitImmediately) {
    const series = invoice.seriesId
      ? (await db.select().from(invoiceSeriesTable).where(eq(invoiceSeriesTable.id, invoice.seriesId)).limit(1))[0]
      : null;
    const invoiceNumber = series
      ? `${series.prefix}${series.year}-${String(series.currentNumber).padStart(5, "0")}`
      : `F${new Date().getFullYear()}-${String(invoice.id).padStart(5, "0")}`;

    if (series) {
      await db.update(invoiceSeriesTable).set({ currentNumber: series.currentNumber + 1 }).where(eq(invoiceSeriesTable.id, series.id));
    }

    await db
      .update(invoicesTable)
      .set({ status: "EMITTED", invoiceNumber, issueDate: invoice.issueDate ?? new Date().toISOString().split("T")[0] })
      .where(eq(invoicesTable.id, invoice.id));

    const { hash, previousHash, qrUrl, xmlPayload } = await buildVeriFactuRecord(invoice.id);
    await db.insert(verifactuRecordsTable).values({
      invoiceId: invoice.id,
      taxpayerId: context.taxpayerId,
      recordType: "ALTA",
      status: "PENDING",
      hash,
      previousHash,
      qrUrl,
      xmlPayload,
    });
  }

  res.status(201).json(await getInvoiceWithRelations(invoice.id));
});

export default router;
