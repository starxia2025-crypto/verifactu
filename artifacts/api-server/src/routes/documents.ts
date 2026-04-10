import { Router, type IRouter } from "express";
import { db, uploadedDocumentsTable, ocrExtractionsTable, invoicesTable, invoiceLinesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  ListDocumentsParams,
  UploadDocumentParams,
  UploadDocumentBody,
  GetDocumentParams,
  DeleteDocumentParams,
  CreateDraftFromDocumentParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function getDocumentWithExtraction(id: number) {
  const [doc] = await db.select().from(uploadedDocumentsTable).where(eq(uploadedDocumentsTable.id, id)).limit(1);
  if (!doc) return null;
  const [extraction] = await db.select().from(ocrExtractionsTable).where(eq(ocrExtractionsTable.documentId, id)).limit(1);
  let extractionWithConf = null;
  if (extraction) {
    let fieldConfidences: Record<string, number> = {};
    if (extraction.fieldConfidencesJson) {
      try { fieldConfidences = JSON.parse(extraction.fieldConfidencesJson); } catch {}
    }
    extractionWithConf = { ...extraction, fieldConfidences };
  }
  return { ...doc, extraction: extractionWithConf ?? null };
}

async function runOcr(docId: number, filename: string): Promise<void> {
  // NOTE: This is the AI/OCR module placeholder.
  // Real implementation: call AI service (OpenAI Vision / Google Document AI / Azure Form Recognizer)
  // IMPORTANT: OCR result always creates a DRAFT, never auto-submits to AEAT.
  logger.info({ docId, filename }, "Running OCR simulation (placeholder)");

  const isLikelyInvoice = filename.toLowerCase().includes("factura") || filename.toLowerCase().includes("invoice");

  await db.update(uploadedDocumentsTable).set({ ocrStatus: "PROCESSING" }).where(eq(uploadedDocumentsTable.id, docId));

  // Simulate OCR result
  await new Promise((r) => setTimeout(r, 500));

  await db.insert(ocrExtractionsTable).values({
    documentId: docId,
    isInvoice: isLikelyInvoice,
    confidence: isLikelyInvoice ? "0.85" : "0.40",
    supplierName: isLikelyInvoice ? "Empresa Ejemplo S.L." : null,
    supplierNif: isLikelyInvoice ? "B12345678" : null,
    clientName: null,
    clientNif: null,
    invoiceNumber: isLikelyInvoice ? "F2024-00001" : null,
    issueDate: isLikelyInvoice ? new Date().toISOString().split("T")[0] : null,
    subtotal: isLikelyInvoice ? "100.00" : null,
    vatAmount: isLikelyInvoice ? "21.00" : null,
    vatRate: isLikelyInvoice ? "21.00" : null,
    total: isLikelyInvoice ? "121.00" : null,
    iban: null,
    rawText: `[OCR placeholder para ${filename}]`,
    fieldConfidencesJson: JSON.stringify({
      supplierName: isLikelyInvoice ? 0.9 : 0.3,
      supplierNif: isLikelyInvoice ? 0.85 : 0.2,
      invoiceNumber: isLikelyInvoice ? 0.95 : 0.1,
      issueDate: isLikelyInvoice ? 0.88 : 0.1,
      total: isLikelyInvoice ? 0.92 : 0.3,
    }),
  });

  await db.update(uploadedDocumentsTable).set({ ocrStatus: "COMPLETED" }).where(eq(uploadedDocumentsTable.id, docId));
}

router.get("/taxpayers/:taxpayerId/documents", requireAuth, async (req, res): Promise<void> => {
  const params = ListDocumentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const docs = await db
    .select()
    .from(uploadedDocumentsTable)
    .where(eq(uploadedDocumentsTable.taxpayerId, params.data.taxpayerId));

  const result = await Promise.all(docs.map(async (doc) => {
    const [extraction] = await db.select().from(ocrExtractionsTable).where(eq(ocrExtractionsTable.documentId, doc.id)).limit(1);
    return { ...doc, extraction: extraction ?? null };
  }));
  res.json(result);
});

router.post("/taxpayers/:taxpayerId/documents", requireAuth, async (req, res): Promise<void> => {
  const params = UploadDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const parsed = UploadDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [doc] = await db
    .insert(uploadedDocumentsTable)
    .values({
      taxpayerId: params.data.taxpayerId,
      filename: parsed.data.filename,
      fileUrl: parsed.data.fileUrl,
      fileType: parsed.data.fileType,
      ocrStatus: "PENDING",
    })
    .returning();

  // Run OCR asynchronously (don't await)
  runOcr(doc.id, doc.filename).catch((err) => {
    logger.error({ err, docId: doc.id }, "OCR failed");
    db.update(uploadedDocumentsTable).set({ ocrStatus: "FAILED" }).where(eq(uploadedDocumentsTable.id, doc.id)).catch(() => {});
  });

  const result = await getDocumentWithExtraction(doc.id);
  res.status(201).json(result);
});

router.get("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const doc = await getDocumentWithExtraction(params.data.id);
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(doc);
});

router.delete("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(ocrExtractionsTable).where(eq(ocrExtractionsTable.documentId, params.data.id));
  const [doc] = await db.delete(uploadedDocumentsTable).where(eq(uploadedDocumentsTable.id, params.data.id)).returning();
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/documents/:id/create-draft", requireAuth, async (req, res): Promise<void> => {
  const params = CreateDraftFromDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const doc = await getDocumentWithExtraction(params.data.id);
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const ext = doc.extraction;
  const total = ext?.total ? parseFloat(ext.total as string) : 0;
  const vat = ext?.vatAmount ? parseFloat(ext.vatAmount as string) : 0;
  const subtotal = total - vat;
  const vatRate = ext?.vatRate ? parseFloat(ext.vatRate as string) : 21;

  // IMPORTANT: Always create a DRAFT. Never auto-emit or auto-submit to AEAT.
  const [draft] = await db
    .insert(invoicesTable)
    .values({
      taxpayerId: doc.taxpayerId,
      invoiceType: "STANDARD",
      status: "DRAFT",
      issueDate: ext?.issueDate ?? null,
      subtotal: subtotal.toFixed(4),
      vatAmount: vat.toFixed(4),
      total: total.toFixed(4),
      notes: `Importado desde documento: ${doc.filename}. REVISAR todos los datos antes de emitir.`,
      originSource: "AI_DRAFT",
    })
    .returning();

  if (ext?.supplierName) {
    await db.insert(invoiceLinesTable).values({
      invoiceId: draft.id,
      description: ext.supplierName ?? "Descripción pendiente de revisión",
      quantity: "1",
      unitPrice: subtotal.toFixed(4),
      vatRate: vatRate.toFixed(2),
      discount: "0",
      subtotal: subtotal.toFixed(4),
      vatAmount: vat.toFixed(4),
      total: total.toFixed(4),
      sortOrder: 0,
    });
  }

  // Link document to draft
  await db.update(uploadedDocumentsTable).set({ linkedInvoiceId: draft.id }).where(eq(uploadedDocumentsTable.id, doc.id));

  const lines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, draft.id));
  res.status(201).json({ ...draft, lines, client: null, series: null, verifactuRecord: null });
});

export default router;
