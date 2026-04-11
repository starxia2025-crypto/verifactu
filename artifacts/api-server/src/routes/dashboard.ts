import { Router, type IRouter } from "express";
import { and, auditLogsTable, clientsTable, count, db, desc, eq, gte, invoicesTable, lte, sql, verifactuRecordsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import {
  GetDashboardSummaryParams,
  GetDashboardSummaryQueryParams,
  GetRecentActivityParams,
  GetRecentActivityQueryParams,
  GetAeatStatusParams,
  GetVatSummaryParams,
  GetVatSummaryQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/taxpayers/:taxpayerId/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const params = GetDashboardSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const { taxpayerId } = params.data;
  const qp = GetDashboardSummaryQueryParams.safeParse(req.query);
  const year = qp.success && qp.data.year ? Number(qp.data.year) : new Date().getFullYear();

  const allInvoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.taxpayerId, taxpayerId));

  const emitted = allInvoices.filter((i) => i.status === "EMITTED");
  const drafts = allInvoices.filter((i) => i.status === "DRAFT");
  const cancelled = allInvoices.filter((i) => i.status === "CANCELLED");

  const totalRevenue = emitted.reduce((s, i) => s + parseFloat(i.total as string), 0);
  const totalVat = emitted.reduce((s, i) => s + parseFloat(i.vatAmount as string), 0);

  // VeriFactu status counts
  const vfRecords = await db.select().from(verifactuRecordsTable).where(eq(verifactuRecordsTable.taxpayerId, taxpayerId));
  const pendingSubs = vfRecords.filter((r) => r.status === "PENDING").length;
  const acceptedSubs = vfRecords.filter((r) => r.status === "ACCEPTED").length;
  const rejectedSubs = vfRecords.filter((r) => r.status === "REJECTED").length;

  // Revenue by month
  const revenueByMonth: Record<string, { revenue: number; invoiceCount: number }> = {};
  for (const inv of emitted) {
    if (!inv.issueDate) continue;
    const month = inv.issueDate.substring(0, 7); // YYYY-MM
    if (!revenueByMonth[month]) revenueByMonth[month] = { revenue: 0, invoiceCount: 0 };
    revenueByMonth[month].revenue += parseFloat(inv.total as string);
    revenueByMonth[month].invoiceCount++;
  }
  const revenueByMonthArr = Object.entries(revenueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  // Top clients
  const clientRevenue: Record<number, { clientName: string; revenue: number; invoiceCount: number }> = {};
  for (const inv of emitted) {
    if (!inv.clientId) continue;
    if (!clientRevenue[inv.clientId]) {
      const [c] = await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, inv.clientId)).limit(1);
      clientRevenue[inv.clientId] = { clientName: c?.name ?? "Sin nombre", revenue: 0, invoiceCount: 0 };
    }
    clientRevenue[inv.clientId].revenue += parseFloat(inv.total as string);
    clientRevenue[inv.clientId].invoiceCount++;
  }
  const topClients = Object.entries(clientRevenue)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(([clientId, v]) => ({ clientId: Number(clientId), ...v }));

  res.json({
    totalInvoices: allInvoices.length,
    totalEmitted: emitted.length,
    totalDrafts: drafts.length,
    totalCancelled: cancelled.length,
    totalRevenue,
    totalVat,
    pendingSubmissions: pendingSubs,
    acceptedSubmissions: acceptedSubs,
    rejectedSubmissions: rejectedSubs,
    revenueByMonth: revenueByMonthArr,
    topClients,
  });
});

router.get("/taxpayers/:taxpayerId/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const params = GetRecentActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const { taxpayerId } = params.data;
  const qp = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = qp.success && qp.data.limit ? Number(qp.data.limit) : 10;

  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.taxpayerId, taxpayerId))
    .orderBy(desc(invoicesTable.updatedAt))
    .limit(limit);

  const activities = invoices.map((inv) => ({
    id: inv.id,
    type: inv.status === "DRAFT" ? "INVOICE_DRAFT" : inv.status === "EMITTED" ? "INVOICE_EMITTED" : "INVOICE_UPDATED",
    description: inv.status === "DRAFT"
      ? `Borrador creado${inv.invoiceNumber ? ` (${inv.invoiceNumber})` : ""}`
      : `Factura emitida ${inv.invoiceNumber ?? ""}`,
    entityId: inv.id,
    entityType: "invoice",
    createdAt: inv.updatedAt,
  }));

  res.json(activities);
});

router.get("/taxpayers/:taxpayerId/dashboard/aeat-status", requireAuth, async (req, res): Promise<void> => {
  const params = GetAeatStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const { taxpayerId } = params.data;

  const records = await db.select().from(verifactuRecordsTable).where(eq(verifactuRecordsTable.taxpayerId, taxpayerId));

  const submittedRecords = records.filter((r) => r.submittedAt);
  const lastSubmission = submittedRecords.length > 0
    ? submittedRecords.sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime())[0].submittedAt
    : null;

  res.json({
    pending: records.filter((r) => r.status === "PENDING").length,
    submitted: records.filter((r) => r.status === "SUBMITTED").length,
    accepted: records.filter((r) => r.status === "ACCEPTED").length,
    acceptedWithErrors: records.filter((r) => r.status === "ACCEPTED_WITH_ERRORS").length,
    rejected: records.filter((r) => r.status === "REJECTED").length,
    error: records.filter((r) => r.status === "ERROR").length,
    lastSubmission,
  });
});

router.get("/taxpayers/:taxpayerId/dashboard/vat-summary", requireAuth, async (req, res): Promise<void> => {
  const params = GetVatSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }
  const { taxpayerId } = params.data;
  const qp = GetVatSummaryQueryParams.safeParse(req.query);
  const year = qp.success && qp.data.year ? Number(qp.data.year) : new Date().getFullYear();

  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.taxpayerId, taxpayerId), eq(invoicesTable.status, "EMITTED")));

  const quarterly: Record<string, { quarter: number; baseImponible: number; vatRepercutido: number; invoiceCount: number }> = {
    "T1": { quarter: 1, baseImponible: 0, vatRepercutido: 0, invoiceCount: 0 },
    "T2": { quarter: 2, baseImponible: 0, vatRepercutido: 0, invoiceCount: 0 },
    "T3": { quarter: 3, baseImponible: 0, vatRepercutido: 0, invoiceCount: 0 },
    "T4": { quarter: 4, baseImponible: 0, vatRepercutido: 0, invoiceCount: 0 },
  };

  for (const inv of invoices) {
    if (!inv.issueDate) continue;
    const invYear = parseInt(inv.issueDate.substring(0, 4), 10);
    if (invYear !== year) continue;
    const month = parseInt(inv.issueDate.substring(5, 7), 10);
    const q = month <= 3 ? "T1" : month <= 6 ? "T2" : month <= 9 ? "T3" : "T4";
    quarterly[q].baseImponible += parseFloat(inv.subtotal as string);
    quarterly[q].vatRepercutido += parseFloat(inv.vatAmount as string);
    quarterly[q].invoiceCount++;
  }

  res.json(
    Object.entries(quarterly).map(([period, v]) => ({ period, ...v }))
  );
});

export default router;
