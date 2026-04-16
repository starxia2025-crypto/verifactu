import { Router, type IRouter, type Request, type Response } from "express";
import { and, aeatCertificatesTable, count, db, desc, eq, invoicesTable, membershipsTable, organizationsTable, taxpayerProfilesTable, verifactuRecordsTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";
import { CreateOrganizationBody, UpdateOrganizationBody, GetOrganizationParams, UpdateOrganizationParams } from "@workspace/api-zod";

const router: IRouter = Router();

function normalizeOrganizationType(type: string) {
  return type === "gestoria" ? "asesoria" : type;
}

function serializeOrganization(org: typeof organizationsTable.$inferSelect, role?: string, taxpayerCount?: number) {
  return {
    ...org,
    type: normalizeOrganizationType(org.type),
    ...(role ? { role } : {}),
    ...(taxpayerCount === undefined ? {} : { taxpayerCount }),
  };
}

async function requireOrganizationMembership(userId: number, orgId: number) {
  const [membership] = await db
    .select({ role: membershipsTable.role, type: organizationsTable.type })
    .from(membershipsTable)
    .innerJoin(organizationsTable, eq(organizationsTable.id, membershipsTable.organizationId))
    .where(and(eq(membershipsTable.userId, userId), eq(membershipsTable.organizationId, orgId), eq(membershipsTable.isActive, true)))
    .limit(1);
  return membership ? { ...membership, type: normalizeOrganizationType(membership.type) } : null;
}

router.get("/organizations", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const memberships = await db
    .select({
      org: organizationsTable,
      role: membershipsTable.role,
    })
    .from(membershipsTable)
    .innerJoin(organizationsTable, eq(membershipsTable.organizationId, organizationsTable.id))
    .where(and(eq(membershipsTable.userId, userId), eq(membershipsTable.isActive, true), eq(organizationsTable.isActive, true)));

  const result = await Promise.all(
    memberships.map(async ({ org, role }) => {
      const [{ cnt }] = await db
        .select({ cnt: count() })
        .from(taxpayerProfilesTable)
        .where(eq(taxpayerProfilesTable.organizationId, org.id));
      return serializeOrganization(org, role, Number(cnt));
    })
  );
  res.json(result);
});

router.post("/organizations", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = CreateOrganizationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [org] = await db.insert(organizationsTable).values({ ...parsed.data, type: normalizeOrganizationType(parsed.data.type), country: "ES" }).returning();
  await db.insert(membershipsTable).values({ userId, organizationId: org.id, role: "owner" });
  res.status(201).json(serializeOrganization(org, "owner", 0));
});

router.get("/organizations/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = GetOrganizationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = params.data;

  const [membership] = await db
    .select({ role: membershipsTable.role })
    .from(membershipsTable)
    .where(and(eq(membershipsTable.userId, userId), eq(membershipsTable.organizationId, id), eq(membershipsTable.isActive, true)))
    .limit(1);

  if (!membership) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, id)).limit(1);
  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  const [{ cnt }] = await db.select({ cnt: count() }).from(taxpayerProfilesTable).where(eq(taxpayerProfilesTable.organizationId, id));
  res.json(serializeOrganization(org, membership.role, Number(cnt)));
});

router.delete("/organizations/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateOrganizationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = params.data;

  const [membership] = await db
    .select({ role: membershipsTable.role })
    .from(membershipsTable)
    .where(and(eq(membershipsTable.userId, userId), eq(membershipsTable.organizationId, id), eq(membershipsTable.isActive, true)))
    .limit(1);

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [org] = await db
    .update(organizationsTable)
    .set({ isActive: false })
    .where(eq(organizationsTable.id, id))
    .returning();

  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  await db
    .update(membershipsTable)
    .set({ isActive: false })
    .where(eq(membershipsTable.organizationId, id));

  res.sendStatus(204);
});

router.patch("/organizations/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateOrganizationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = params.data;

  const [membership] = await db
    .select({ role: membershipsTable.role })
    .from(membershipsTable)
    .where(and(eq(membershipsTable.userId, userId), eq(membershipsTable.organizationId, id)))
    .limit(1);

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = UpdateOrganizationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [org] = await db.update(organizationsTable).set(parsed.data).where(eq(organizationsTable.id, id)).returning();
  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  const [{ cnt }] = await db.select({ cnt: count() }).from(taxpayerProfilesTable).where(eq(taxpayerProfilesTable.organizationId, id));
  res.json(serializeOrganization(org, membership.role, Number(cnt)));
});

async function getAsesoriaOverview(req: Request, res: Response): Promise<void> {
  const raw = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
  const orgId = parseInt(raw, 10);
  if (isNaN(orgId)) {
    res.status(400).json({ error: "Invalid orgId" });
    return;
  }
  const membership = await requireOrganizationMembership(getUserId(req), orgId);
  if (!membership || membership.type !== "asesoria") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const taxpayers = await db.select().from(taxpayerProfilesTable).where(eq(taxpayerProfilesTable.organizationId, orgId));

  const taxpayerSummaries = await Promise.all(
    taxpayers.map(async (tp) => {
      const [pending] = await db
        .select({ cnt: count() })
        .from(invoicesTable)
        .where(and(eq(invoicesTable.taxpayerId, tp.id), eq(invoicesTable.status, "DRAFT")));
      const [pendingSub] = await db
        .select({ cnt: count() })
        .from(verifactuRecordsTable)
        .where(and(eq(verifactuRecordsTable.taxpayerId, tp.id), eq(verifactuRecordsTable.status, "PENDING")));
      const [incidents] = await db
        .select({ cnt: count() })
        .from(verifactuRecordsTable)
        .where(and(eq(verifactuRecordsTable.taxpayerId, tp.id), eq(verifactuRecordsTable.status, "REJECTED")));

      return {
        id: tp.id,
        name: tp.name,
        nif: tp.nif,
        pendingInvoices: Number(pending.cnt),
        pendingSubmissions: Number(pendingSub.cnt),
        hasIncidents: Number(incidents.cnt) > 0,
        lastActivity: tp.updatedAt,
      };
    })
  );

  const totalPendingSubmissions = taxpayerSummaries.reduce((s, t) => s + t.pendingSubmissions, 0);
  const totalIncidents = taxpayerSummaries.filter((t) => t.hasIncidents).length;

  res.json({
    totalTaxpayers: taxpayers.length,
    activeTaxpayers: taxpayers.filter((t) => t.isActive).length,
    pendingSetup: taxpayers.filter((t) => !t.sifInstallationNumber).length,
    pendingSubmissions: totalPendingSubmissions,
    pendingIncidents: totalIncidents,
    taxpayerSummaries,
  });
}

// Asesoria overview. The legacy /gestoria route remains for compatibility with generated clients.
router.get("/organizations/:orgId/asesoria/overview", requireAuth, getAsesoriaOverview);
router.get("/organizations/:orgId/gestoria/overview", requireAuth, getAsesoriaOverview);

async function listAsesoriaIncidents(req: Request, res: Response): Promise<void> {
  const raw = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
  const orgId = parseInt(raw, 10);
  if (isNaN(orgId)) {
    res.status(400).json({ error: "Invalid orgId" });
    return;
  }
  const membership = await requireOrganizationMembership(getUserId(req), orgId);
  if (!membership || membership.type !== "asesoria") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const taxpayers = await db
    .select({ id: taxpayerProfilesTable.id, name: taxpayerProfilesTable.name })
    .from(taxpayerProfilesTable)
    .where(eq(taxpayerProfilesTable.organizationId, orgId));

  const incidents = [];
  for (const tp of taxpayers) {
    const records = await db
      .select()
      .from(verifactuRecordsTable)
      .where(and(eq(verifactuRecordsTable.taxpayerId, tp.id), eq(verifactuRecordsTable.status, "REJECTED")));
    for (const r of records) {
      const [inv] = await db.select({ invoiceNumber: invoicesTable.invoiceNumber }).from(invoicesTable).where(eq(invoicesTable.id, r.invoiceId)).limit(1);
      incidents.push({
        id: r.id,
        taxpayerId: tp.id,
        taxpayerName: tp.name,
        invoiceId: r.invoiceId,
        invoiceNumber: inv?.invoiceNumber ?? null,
        errorCode: r.aeatErrorCode,
        errorMessage: r.aeatErrorMessage,
        status: r.status,
        createdAt: r.createdAt,
      });
    }
  }

  res.json(incidents);
}

router.get("/organizations/:orgId/asesoria/incidents", requireAuth, listAsesoriaIncidents);
router.get("/organizations/:orgId/gestoria/incidents", requireAuth, listAsesoriaIncidents);

async function listAsesoriaCertificates(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
  const orgId = parseInt(raw, 10);
  if (isNaN(orgId)) {
    res.status(400).json({ error: "Invalid orgId" });
    return;
  }

  const statusFilter = typeof req.query.status === "string" ? req.query.status : "all";
  const missingOnly = req.query.missing === "true";

  const membership = await requireOrganizationMembership(userId, orgId);
  if (!membership || membership.type !== "asesoria") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const taxpayers = await db
    .select()
    .from(taxpayerProfilesTable)
    .where(eq(taxpayerProfilesTable.organizationId, orgId));

  const result = [];
  for (const taxpayer of taxpayers) {
    const certificates = await db
      .select()
      .from(aeatCertificatesTable)
      .where(eq(aeatCertificatesTable.taxpayerId, taxpayer.id))
      .orderBy(desc(aeatCertificatesTable.createdAt));
    const activeCertificate = certificates.find((certificate) => certificate.status === "ACTIVE") ?? null;
    const latestCertificate = activeCertificate ?? certificates[0] ?? null;
    const row = {
      taxpayerId: taxpayer.id,
      taxpayerName: taxpayer.name,
      taxpayerNif: taxpayer.nif,
      hasCertificate: certificates.length > 0,
      activeCertificateId: activeCertificate?.id ?? null,
      certificateStatus: latestCertificate?.status ?? "MISSING",
      certificateFileName: latestCertificate?.originalFileName ?? null,
      validTo: latestCertificate?.validTo ?? null,
      lastValidationError: latestCertificate?.lastValidationError ?? null,
      useSealCertificateEndpoint: latestCertificate?.useSealCertificateEndpoint ?? false,
      certificateCount: certificates.length,
    };
    if (missingOnly && row.hasCertificate) continue;
    if (statusFilter !== "all" && row.certificateStatus !== statusFilter) continue;
    result.push(row);
  }

  res.json(result);
}

router.get("/organizations/:orgId/asesoria/certificates", requireAuth, listAsesoriaCertificates);
router.get("/organizations/:orgId/gestoria/certificates", requireAuth, listAsesoriaCertificates);

export default router;
