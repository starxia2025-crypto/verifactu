import { Router, type IRouter } from "express";
import { db, invoicesTable, invoiceLinesTable, clientsTable, invoiceSeriesTable, verifactuRecordsTable } from "@workspace/db";
import { eq, and, desc, ilike, or, count, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  ListInvoicesParams,
  ListInvoicesQueryParams,
  CreateInvoiceParams,
  CreateInvoiceBody,
  GetInvoiceParams,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
  DeleteInvoiceParams,
  EmitInvoiceParams,
  CancelInvoiceParams,
  CancelInvoiceBody,
  RectifyInvoiceParams,
  RectifyInvoiceBody,
} from "@workspace/api-zod";
import { buildVeriFactuRecord } from "../lib/verifactu";

const router: IRouter = Router();

function calcLine(line: any) {
  const qty = parseFloat(line.quantity) || 0;
  const price = parseFloat(line.unitPrice) || 0;
  const vat = parseFloat(line.vatRate) || 0;
  const disc = parseFloat(line.discount) || 0;
  const subtotal = qty * price * (1 - disc / 100);
  const vatAmount = subtotal * (vat / 100);
  return {
    subtotal: subtotal.toFixed(4),
    vatAmount: vatAmount.toFixed(4),
    total: (subtotal + vatAmount).toFixed(4),
  };
}

function calcTotals(lines: any[]) {
  let subtotal = 0;
  let vatAmount = 0;
  for (const l of lines) {
    subtotal += parseFloat(l.subtotal as string);
    vatAmount += parseFloat(l.vatAmount as string);
  }
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
    ? (await db.select().from(clientsTable).where(eq(clientsTable.id, invoice.clientId)).limit(1))[0]
    : null;
  const series = invoice.seriesId
    ? (await db.select().from(invoiceSeriesTable).where(eq(invoiceSeriesTable.id, invoice.seriesId)).limit(1))[0]
    : null;
  const verifactuRecord = (await db.select().from(verifactuRecordsTable).where(eq(verifactuRecordsTable.invoiceId, id)).limit(1))[0] ?? null;

  return { ...invoice, lines, client: client ?? null, series: series ?? null, verifactuRecord };
}

router.get("/taxpayers/:taxpayerId/invoices", requireAuth, async (req, res): Promise<void> => {
  const params = ListInvoicesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const { taxpayerId } = params.data;
  const qp = ListInvoicesQueryParams.safeParse(req.query);
  const page = qp.success && qp.data.page ? Number(qp.data.page) : 1;
  const limit = qp.success && qp.data.limit ? Number(qp.data.limit) : 20;
  const status = qp.success ? qp.data.status : undefined;
  const clientId = qp.success && qp.data.clientId ? Number(qp.data.clientId) : undefined;
  const search = qp.success ? qp.data.search : undefined;

  const conditions = [eq(invoicesTable.taxpayerId, taxpayerId)];
  if (status) conditions.push(eq(invoicesTable.status, status));
  if (clientId) conditions.push(eq(invoicesTable.clientId, clientId));

  const allInvoices = await db
    .select()
    .from(invoicesTable)
    .where(and(...conditions))
    .orderBy(desc(invoicesTable.createdAt));

  const filtered = search
    ? allInvoices.filter((i) => i.invoiceNumber?.includes(search))
    : allInvoices;

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const items = filtered.slice(offset, offset + limit);

  const itemsWithRelations = await Promise.all(
    items.map(async (inv) => {
      const lines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, inv.id));
      const client = inv.clientId
        ? (await db.select().from(clientsTable).where(eq(clientsTable.id, inv.clientId)).limit(1))[0] ?? null
        : null;
      const series = inv.seriesId
        ? (await db.select().from(invoiceSeriesTable).where(eq(invoiceSeriesTable.id, inv.seriesId)).limit(1))[0] ?? null
        : null;
      const verifactuRecord = (await db.select().from(verifactuRecordsTable).where(eq(verifactuRecordsTable.invoiceId, inv.id)).limit(1))[0] ?? null;
      return { ...inv, lines, client, series, verifactuRecord };
    })
  );

  res.json({
    items: itemsWithRelations,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
});

router.post("/taxpayers/:taxpayerId/invoices", requireAuth, async (req, res): Promise<void> => {
  const params = CreateInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const { taxpayerId } = params.data;
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { lines: lineInputs, emitImmediately, ...invoiceData } = parsed.data;

  // Calculate line amounts
  const linesWithCalc = lineInputs.map((l, idx) => {
    const calc = calcLine(l);
    return { ...l, ...calc, sortOrder: l.sortOrder ?? idx };
  });

  const totals = calcTotals(linesWithCalc);

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      taxpayerId,
      seriesId: invoiceData.seriesId ?? null,
      clientId: invoiceData.clientId ?? null,
      invoiceType: invoiceData.invoiceType ?? "STANDARD",
      issueDate: invoiceData.issueDate ?? null,
      operationDate: invoiceData.operationDate ?? null,
      dueDate: invoiceData.dueDate ?? null,
      notes: invoiceData.notes ?? null,
      paymentMethod: invoiceData.paymentMethod ?? null,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      status: "DRAFT",
      originSource: "MANUAL",
    })
    .returning();

  await db.insert(invoiceLinesTable).values(
    linesWithCalc.map((l) => ({
      invoiceId: invoice.id,
      description: l.description,
      quantity: String(l.quantity),
      unitPrice: String(l.unitPrice),
      vatRate: String(l.vatRate),
      discount: String(l.discount ?? 0),
      subtotal: l.subtotal,
      vatAmount: l.vatAmount,
      total: l.total,
      productId: l.productId ?? null,
      sortOrder: l.sortOrder,
    }))
  );

  if (emitImmediately) {
    // Emit immediately
    const series = invoice.seriesId
      ? (await db.select().from(invoiceSeriesTable).where(eq(invoiceSeriesTable.id, invoice.seriesId)).limit(1))[0]
      : null;
    const invoiceNumber = series
      ? `${series.prefix}${series.year}-${String(series.currentNumber).padStart(5, "0")}`
      : `F${new Date().getFullYear()}-${String(invoice.id).padStart(5, "0")}`;

    if (series) {
      await db.update(invoiceSeriesTable).set({ currentNumber: series.currentNumber + 1 }).where(eq(invoiceSeriesTable.id, series.id));
    }

    const [emitted] = await db
      .update(invoicesTable)
      .set({ status: "EMITTED", invoiceNumber, issueDate: invoice.issueDate ?? new Date().toISOString().split("T")[0] })
      .where(eq(invoicesTable.id, invoice.id))
      .returning();

    const { hash, previousHash, qrUrl, xmlPayload } = await buildVeriFactuRecord(invoice.id);
    await db.insert(verifactuRecordsTable).values({
      invoiceId: invoice.id,
      taxpayerId,
      recordType: "ALTA",
      status: "PENDING",
      hash,
      previousHash,
      qrUrl,
      xmlPayload,
    });

    const result = await getInvoiceWithRelations(invoice.id);
    res.status(201).json(result);
    return;
  }

  const result = await getInvoiceWithRelations(invoice.id);
  res.status(201).json(result);
});

router.get("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const invoice = await getInvoiceWithRelations(params.data.id);
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.json(invoice);
});

router.patch("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  if (existing.status !== "DRAFT") {
    res.status(400).json({ error: "Solo se pueden modificar facturas en borrador" });
    return;
  }

  const { lines: lineInputs, ...invoiceData } = parsed.data;

  let updateData: any = { ...invoiceData };

  if (lineInputs) {
    const linesWithCalc = lineInputs.map((l, idx) => {
      const calc = calcLine(l);
      return { ...l, ...calc, sortOrder: l.sortOrder ?? idx };
    });
    const totals = calcTotals(linesWithCalc);
    updateData = { ...updateData, ...totals };

    await db.delete(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, params.data.id));
    await db.insert(invoiceLinesTable).values(
      linesWithCalc.map((l) => ({
        invoiceId: params.data.id,
        description: l.description,
        quantity: String(l.quantity),
        unitPrice: String(l.unitPrice),
        vatRate: String(l.vatRate),
        discount: String(l.discount ?? 0),
        subtotal: l.subtotal,
        vatAmount: l.vatAmount,
        total: l.total,
        productId: l.productId ?? null,
        sortOrder: l.sortOrder,
      }))
    );
  }

  await db.update(invoicesTable).set(updateData).where(eq(invoicesTable.id, params.data.id));

  const result = await getInvoiceWithRelations(params.data.id);
  res.json(result);
});

router.delete("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  if (existing.status !== "DRAFT") {
    res.status(400).json({ error: "Solo se pueden eliminar borradores" });
    return;
  }
  await db.delete(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, params.data.id));
  await db.delete(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/invoices/:id/emit", requireAuth, async (req, res): Promise<void> => {
  const params = EmitInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = params.data;

  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).limit(1);
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  if (invoice.status !== "DRAFT") {
    res.status(400).json({ error: "La factura ya fue emitida" });
    return;
  }

  const series = invoice.seriesId
    ? (await db.select().from(invoiceSeriesTable).where(eq(invoiceSeriesTable.id, invoice.seriesId)).limit(1))[0]
    : null;
  const invoiceNumber = series
    ? `${series.prefix}${series.year}-${String(series.currentNumber).padStart(5, "0")}`
    : `F${new Date().getFullYear()}-${String(id).padStart(5, "0")}`;

  if (series) {
    await db.update(invoiceSeriesTable).set({ currentNumber: series.currentNumber + 1 }).where(eq(invoiceSeriesTable.id, series.id));
  }

  await db
    .update(invoicesTable)
    .set({ status: "EMITTED", invoiceNumber, issueDate: invoice.issueDate ?? new Date().toISOString().split("T")[0] })
    .where(eq(invoicesTable.id, id));

  // Build VeriFactu record
  const { hash, previousHash, qrUrl, xmlPayload } = await buildVeriFactuRecord(id);

  // Check if record already exists (idempotency)
  const [existingRecord] = await db.select().from(verifactuRecordsTable).where(eq(verifactuRecordsTable.invoiceId, id)).limit(1);
  if (!existingRecord) {
    await db.insert(verifactuRecordsTable).values({
      invoiceId: id,
      taxpayerId: invoice.taxpayerId,
      recordType: "ALTA",
      status: "PENDING",
      hash,
      previousHash,
      qrUrl,
      xmlPayload,
    });
  }

  const result = await getInvoiceWithRelations(id);
  res.json(result);
});

router.post("/invoices/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const params = CancelInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = CancelInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id)).limit(1);
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  if (invoice.status !== "EMITTED") {
    res.status(400).json({ error: "Solo se pueden anular facturas emitidas" });
    return;
  }

  await db
    .update(invoicesTable)
    .set({ status: "CANCELLED", cancellationReason: parsed.data.reason })
    .where(eq(invoicesTable.id, params.data.id));

  // Create ANULACION VeriFactu record
  const { hash, previousHash, qrUrl, xmlPayload } = await buildVeriFactuRecord(invoice.id);
  await db.insert(verifactuRecordsTable).values({
    invoiceId: invoice.id,
    taxpayerId: invoice.taxpayerId,
    recordType: "ANULACION",
    status: "PENDING",
    hash,
    previousHash,
    qrUrl,
    xmlPayload,
  });

  const result = await getInvoiceWithRelations(params.data.id);
  res.json(result);
});

router.post("/invoices/:id/rectify", requireAuth, async (req, res): Promise<void> => {
  const params = RectifyInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = RectifyInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [original] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id)).limit(1);
  if (!original) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const linesWithCalc = parsed.data.lines.map((l, idx) => {
    const calc = calcLine(l);
    return { ...l, ...calc, sortOrder: l.sortOrder ?? idx };
  });
  const totals = calcTotals(linesWithCalc);

  const [rectification] = await db
    .insert(invoicesTable)
    .values({
      taxpayerId: original.taxpayerId,
      seriesId: original.seriesId,
      clientId: original.clientId,
      invoiceType: "RECTIFICATION",
      status: "DRAFT",
      issueDate: new Date().toISOString().split("T")[0],
      notes: parsed.data.reason,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      rectifiedInvoiceId: original.id,
      originSource: "MANUAL",
    })
    .returning();

  await db.insert(invoiceLinesTable).values(
    linesWithCalc.map((l) => ({
      invoiceId: rectification.id,
      description: l.description,
      quantity: String(l.quantity),
      unitPrice: String(l.unitPrice),
      vatRate: String(l.vatRate),
      discount: String(l.discount ?? 0),
      subtotal: l.subtotal,
      vatAmount: l.vatAmount,
      total: l.total,
      productId: l.productId ?? null,
      sortOrder: l.sortOrder,
    }))
  );

  await db.update(invoicesTable).set({ status: "RECTIFIED" }).where(eq(invoicesTable.id, original.id));

  const result = await getInvoiceWithRelations(rectification.id);
  res.status(201).json(result);
});

// PDF download (returns HTML-based PDF placeholder)
router.get("/invoices/:id/pdf", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const invoice = await getInvoiceWithRelations(id);
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const qrUrl = invoice.verifactuRecord?.qrUrl ?? "";
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Factura ${invoice.invoiceNumber ?? "BORRADOR"}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a2e; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #003f8a; padding-bottom: 20px; margin-bottom: 20px; }
    h1 { color: #003f8a; margin: 0; }
    .qr-section { text-align: center; margin: 20px 0; padding: 15px; border: 2px dashed #003f8a; border-radius: 8px; }
    .verifactu-badge { background: #003f8a; color: white; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #003f8a; color: white; padding: 8px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    .totals { text-align: right; margin-top: 10px; }
    .total-row { font-size: 1.2em; font-weight: bold; color: #003f8a; }
    .footer { font-size: 11px; color: #666; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="qr-section">
    <div class="verifactu-badge">VERI*FACTU</div>
    <p style="font-size:12px; margin:8px 0;">Factura verificable en la sede electrónica de la AEAT</p>
    ${qrUrl ? `<p style="font-size:10px; word-break:break-all;">${qrUrl}</p>` : ""}
  </div>
  <div class="header">
    <div>
      <h1>FACTURA</h1>
      <p><strong>Nº:</strong> ${invoice.invoiceNumber ?? "BORRADOR"}</p>
      <p><strong>Fecha:</strong> ${invoice.issueDate ?? "-"}</p>
    </div>
    <div style="text-align:right">
      <p><strong>Estado:</strong> ${invoice.status}</p>
      <p><strong>Tipo:</strong> ${invoice.invoiceType}</p>
    </div>
  </div>

  <div style="display:flex; gap:40px; margin-bottom:20px;">
    <div style="flex:1">
      <h3>CLIENTE</h3>
      <p>${invoice.client?.name ?? "Sin cliente"}</p>
      <p>${invoice.client?.nif ?? ""}</p>
      <p>${invoice.client?.address ?? ""}</p>
      <p>${invoice.client?.city ?? ""} ${invoice.client?.postalCode ?? ""}</p>
    </div>
    <div style="flex:1">
      <h3>SERIE</h3>
      <p>${invoice.series?.prefix ?? ""} ${invoice.series?.name ?? ""}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Cantidad</th>
        <th>Precio unitario</th>
        <th>IVA %</th>
        <th>Base</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.lines.map((l) => `<tr>
        <td>${l.description}</td>
        <td>${l.quantity}</td>
        <td>${parseFloat(l.unitPrice as string).toFixed(2)} €</td>
        <td>${l.vatRate}%</td>
        <td>${parseFloat(l.subtotal as string).toFixed(2)} €</td>
        <td>${parseFloat(l.total as string).toFixed(2)} €</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <div class="totals">
    <p>Base imponible: <strong>${parseFloat(invoice.subtotal as string).toFixed(2)} €</strong></p>
    <p>IVA: <strong>${parseFloat(invoice.vatAmount as string).toFixed(2)} €</strong></p>
    <p class="total-row">TOTAL: ${parseFloat(invoice.total as string).toFixed(2)} €</p>
  </div>

  ${invoice.notes ? `<p style="margin-top:20px"><strong>Notas:</strong> ${invoice.notes}</p>` : ""}

  <div class="footer">
    <p>Este documento es una factura electrónica conforme al RD 1007/2023 (Sistema VERI*FACTU)</p>
    <p>Hash de integridad: ${invoice.verifactuRecord?.hash ?? "Pendiente de generación"}</p>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="factura-${invoice.invoiceNumber ?? id}.html"`);
  res.send(html);
});

export default router;
