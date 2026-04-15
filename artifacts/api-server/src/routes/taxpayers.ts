import { Router, type IRouter, type Request } from "express";
import { and, aeatCertificatesTable, db, desc, eq, taxpayerProfilesTable, organizationsTable, membershipsTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";
import { z } from "zod/v4";
import {
  removeStoredCertificate,
  revalidateStoredCertificate,
  storeAeatCertificate,
} from "../lib/aeat-certificate-store";
import {
  ListTaxpayersParams,
  CreateTaxpayerParams,
  CreateTaxpayerBody,
  GetTaxpayerParams,
  UpdateTaxpayerParams,
  UpdateTaxpayerBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const UploadAeatCertificateBody = z.object({
  fileName: z.string().min(1),
  pfxBase64: z.string().min(1),
  password: z.string().min(1),
  activate: z.boolean().optional(),
  useSealCertificateEndpoint: z.boolean().optional(),
});

const UpdateAeatCertificateSettingsBody = z.object({
  useSealCertificateEndpoint: z.boolean().optional(),
});

function sanitizeCertificate(certificate: typeof aeatCertificatesTable.$inferSelect) {
  return {
    id: certificate.id,
    taxpayerId: certificate.taxpayerId,
    status: certificate.status,
    originalFileName: certificate.originalFileName,
    subject: certificate.subject,
    issuer: certificate.issuer,
    serialNumber: certificate.serialNumber,
    validFrom: certificate.validFrom,
    validTo: certificate.validTo,
    nif: certificate.nif,
    hasPrivateKey: certificate.hasPrivateKey,
    fingerprintSha256: certificate.fingerprintSha256,
    useSealCertificateEndpoint: certificate.useSealCertificateEndpoint,
    uploadedByUserId: certificate.uploadedByUserId,
    uploadedAt: certificate.uploadedAt,
    activatedAt: certificate.activatedAt,
    deactivatedAt: certificate.deactivatedAt,
    lastValidationError: certificate.lastValidationError,
    createdAt: certificate.createdAt,
    updatedAt: certificate.updatedAt,
  };
}

async function getAccessibleTaxpayer(req: Request, taxpayerId: number) {
  const [taxpayer] = await db
    .select()
    .from(taxpayerProfilesTable)
    .where(eq(taxpayerProfilesTable.id, taxpayerId))
    .limit(1);

  if (!taxpayer) return { taxpayer: null, status: 404 as const };

  const [membership] = await db
    .select()
    .from(membershipsTable)
    .where(and(
      eq(membershipsTable.userId, getUserId(req)),
      eq(membershipsTable.organizationId, taxpayer.organizationId),
      eq(membershipsTable.isActive, true),
    ))
    .limit(1);

  return membership ? { taxpayer, status: 200 as const } : { taxpayer: null, status: 403 as const };
}

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
  const values = {
    ...parsed.data,
    organizationId: orgId,
    country: parsed.data.country ?? "ES",
    defaultVatRate: parsed.data.defaultVatRate === undefined ? undefined : String(parsed.data.defaultVatRate),
  };
  const [taxpayer] = await db
    .insert(taxpayerProfilesTable)
    .values(values)
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
  const updateData = {
    ...parsed.data,
    defaultVatRate: parsed.data.defaultVatRate === undefined ? undefined : String(parsed.data.defaultVatRate),
  };
  const [taxpayer] = await db
    .update(taxpayerProfilesTable)
    .set(updateData)
    .where(eq(taxpayerProfilesTable.id, params.data.id))
    .returning();
  if (!taxpayer) {
    res.status(404).json({ error: "Taxpayer not found" });
    return;
  }
  res.json(taxpayer);
});

router.get("/taxpayers/:id/aeat-certificates", requireAuth, async (req, res): Promise<void> => {
  const params = GetTaxpayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const access = await getAccessibleTaxpayer(req, params.data.id);
  if (!access.taxpayer) {
    res.status(access.status).json({ error: access.status === 403 ? "Forbidden" : "Taxpayer not found" });
    return;
  }

  const certificates = await db
    .select()
    .from(aeatCertificatesTable)
    .where(eq(aeatCertificatesTable.taxpayerId, access.taxpayer.id))
    .orderBy(desc(aeatCertificatesTable.createdAt));

  res.json(certificates.map(sanitizeCertificate));
});

router.post("/taxpayers/:id/aeat-certificates", requireAuth, async (req, res): Promise<void> => {
  const params = GetTaxpayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UploadAeatCertificateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const access = await getAccessibleTaxpayer(req, params.data.id);
  if (!access.taxpayer) {
    res.status(access.status).json({ error: access.status === 403 ? "Forbidden" : "Taxpayer not found" });
    return;
  }
  const taxpayer = access.taxpayer;

  try {
    const stored = await storeAeatCertificate({
      taxpayerId: taxpayer.id,
      fileName: parsed.data.fileName,
      pfxBase64: parsed.data.pfxBase64,
      password: parsed.data.password,
    });

    const activate = parsed.data.activate ?? true;
    if (activate) {
      await db
        .update(aeatCertificatesTable)
        .set({ status: "INACTIVE", deactivatedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(aeatCertificatesTable.taxpayerId, taxpayer.id), eq(aeatCertificatesTable.status, "ACTIVE")));
    }

    const [certificate] = await db
      .insert(aeatCertificatesTable)
      .values({
        taxpayerId: taxpayer.id,
        status: activate ? "ACTIVE" : "INACTIVE",
        originalFileName: stored.originalFileName,
        storedFilePath: stored.storedFilePath,
        encryptedPassword: stored.encryptedPassword,
        subject: stored.subject,
        issuer: stored.issuer,
        serialNumber: stored.serialNumber,
        validFrom: stored.validFrom,
        validTo: stored.validTo,
        nif: stored.nif,
        hasPrivateKey: stored.hasPrivateKey,
        fingerprintSha256: stored.fingerprintSha256,
        useSealCertificateEndpoint: parsed.data.useSealCertificateEndpoint ?? false,
        uploadedByUserId: getUserId(req),
        uploadedAt: stored.uploadedAt,
        activatedAt: activate ? new Date() : null,
        lastValidationError: stored.lastValidationError,
      })
      .returning();

    res.status(201).json(sanitizeCertificate(certificate));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "No se pudo guardar el certificado" });
  }
});

router.post("/taxpayers/:id/aeat-certificates/:certificateId/activate", requireAuth, async (req, res): Promise<void> => {
  const params = GetTaxpayerParams.safeParse(req.params);
  const certificateId = Number(req.params.certificateId);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!Number.isInteger(certificateId)) {
    res.status(400).json({ error: "Invalid certificateId" });
    return;
  }

  const access = await getAccessibleTaxpayer(req, params.data.id);
  if (!access.taxpayer) {
    res.status(access.status).json({ error: access.status === 403 ? "Forbidden" : "Taxpayer not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(aeatCertificatesTable)
    .where(and(eq(aeatCertificatesTable.id, certificateId), eq(aeatCertificatesTable.taxpayerId, access.taxpayer.id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Certificate not found" });
    return;
  }
  if (existing.status === "INVALID" || existing.status === "EXPIRED" || !existing.hasPrivateKey) {
    res.status(400).json({ error: existing.lastValidationError ?? "El certificado no es activable" });
    return;
  }

  await db
    .update(aeatCertificatesTable)
    .set({ status: "INACTIVE", deactivatedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(aeatCertificatesTable.taxpayerId, access.taxpayer.id), eq(aeatCertificatesTable.status, "ACTIVE")));

  const [taxpayer] = await db
    .update(aeatCertificatesTable)
    .set({ status: "ACTIVE", activatedAt: new Date(), deactivatedAt: null, updatedAt: new Date() })
    .where(eq(aeatCertificatesTable.id, certificateId))
    .returning();

  res.json(sanitizeCertificate(taxpayer));
});

router.post("/taxpayers/:id/aeat-certificates/:certificateId/deactivate", requireAuth, async (req, res): Promise<void> => {
  const params = GetTaxpayerParams.safeParse(req.params);
  const certificateId = Number(req.params.certificateId);
  if (!params.success || !Number.isInteger(certificateId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const access = await getAccessibleTaxpayer(req, params.data.id);
  if (!access.taxpayer) {
    res.status(access.status).json({ error: access.status === 403 ? "Forbidden" : "Taxpayer not found" });
    return;
  }

  const [certificate] = await db
    .update(aeatCertificatesTable)
    .set({ status: "INACTIVE", deactivatedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(aeatCertificatesTable.id, certificateId), eq(aeatCertificatesTable.taxpayerId, access.taxpayer.id)))
    .returning();

  if (!certificate) {
    res.status(404).json({ error: "Certificate not found" });
    return;
  }

  res.json(sanitizeCertificate(certificate));
});

router.post("/taxpayers/:id/aeat-certificates/:certificateId/validate", requireAuth, async (req, res): Promise<void> => {
  const params = GetTaxpayerParams.safeParse(req.params);
  const certificateId = Number(req.params.certificateId);
  if (!params.success || !Number.isInteger(certificateId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const access = await getAccessibleTaxpayer(req, params.data.id);
  if (!access.taxpayer) {
    res.status(access.status).json({ error: access.status === 403 ? "Forbidden" : "Taxpayer not found" });
    return;
  }
  const taxpayer = access.taxpayer;

  const [certificate] = await db
    .select()
    .from(aeatCertificatesTable)
    .where(and(eq(aeatCertificatesTable.id, certificateId), eq(aeatCertificatesTable.taxpayerId, taxpayer.id)))
    .limit(1);

  if (!certificate) {
    res.status(404).json({ error: "Certificate not found" });
    return;
  }

  const validation = await revalidateStoredCertificate({
    storedFilePath: certificate.storedFilePath,
    encryptedPassword: certificate.encryptedPassword,
  });
  const nextStatus = validation.status === "INACTIVE" && certificate.status === "ACTIVE" ? "ACTIVE" : validation.status;

  const [updated] = await db
    .update(aeatCertificatesTable)
    .set({
      subject: validation.subject,
      issuer: validation.issuer,
      serialNumber: validation.serialNumber,
      validFrom: validation.validFrom,
      validTo: validation.validTo,
      nif: validation.nif,
      hasPrivateKey: validation.hasPrivateKey,
      fingerprintSha256: validation.fingerprintSha256,
      lastValidationError: validation.lastValidationError,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(aeatCertificatesTable.id, certificate.id))
    .returning();

  res.json(sanitizeCertificate(updated));
});

router.patch("/taxpayers/:id/aeat-certificates/:certificateId", requireAuth, async (req, res): Promise<void> => {
  const params = GetTaxpayerParams.safeParse(req.params);
  const certificateId = Number(req.params.certificateId);
  if (!params.success || !Number.isInteger(certificateId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateAeatCertificateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const access = await getAccessibleTaxpayer(req, params.data.id);
  if (!access.taxpayer) {
    res.status(access.status).json({ error: access.status === 403 ? "Forbidden" : "Taxpayer not found" });
    return;
  }

  const [certificate] = await db
    .update(aeatCertificatesTable)
    .set({
      ...(parsed.data.useSealCertificateEndpoint === undefined ? {} : { useSealCertificateEndpoint: parsed.data.useSealCertificateEndpoint }),
      updatedAt: new Date(),
    })
    .where(and(eq(aeatCertificatesTable.id, certificateId), eq(aeatCertificatesTable.taxpayerId, access.taxpayer.id)))
    .returning();

  if (!certificate) {
    res.status(404).json({ error: "Certificate not found" });
    return;
  }

  res.json(sanitizeCertificate(certificate));
});

router.delete("/taxpayers/:id/aeat-certificates/:certificateId", requireAuth, async (req, res): Promise<void> => {
  const params = GetTaxpayerParams.safeParse(req.params);
  const certificateId = Number(req.params.certificateId);
  if (!params.success || !Number.isInteger(certificateId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const access = await getAccessibleTaxpayer(req, params.data.id);
  if (!access.taxpayer) {
    res.status(access.status).json({ error: access.status === 403 ? "Forbidden" : "Taxpayer not found" });
    return;
  }

  const [certificate] = await db
    .select()
    .from(aeatCertificatesTable)
    .where(and(eq(aeatCertificatesTable.id, certificateId), eq(aeatCertificatesTable.taxpayerId, access.taxpayer.id)))
    .limit(1);

  if (!certificate) {
    res.status(404).json({ error: "Certificate not found" });
    return;
  }

  await removeStoredCertificate(certificate.storedFilePath);
  await db.delete(aeatCertificatesTable).where(eq(aeatCertificatesTable.id, certificate.id));
  res.sendStatus(204);
});

export default router;
