import { Router, type IRouter, type Request } from "express";
import { and, db, eq, taxpayerProfilesTable, organizationsTable, membershipsTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";
import { z } from "zod/v4";
import {
  getTaxpayerCertificateStatus,
  removeStoredCertificate,
  storeTaxpayerCertificate,
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
  useSealCertificateEndpoint: z.boolean().optional(),
});

const UpdateAeatCertificateSettingsBody = z.object({
  useSealCertificateEndpoint: z.boolean(),
});

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

router.get("/taxpayers/:id/aeat-certificate", requireAuth, async (req, res): Promise<void> => {
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

  res.json(getTaxpayerCertificateStatus(access.taxpayer));
});

router.post("/taxpayers/:id/aeat-certificate", requireAuth, async (req, res): Promise<void> => {
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
    const stored = await storeTaxpayerCertificate({
      taxpayerId: taxpayer.id,
      fileName: parsed.data.fileName,
      pfxBase64: parsed.data.pfxBase64,
      password: parsed.data.password,
      previousPath: taxpayer.aeatCertificatePath,
    });

    const [updated] = await db
      .update(taxpayerProfilesTable)
      .set({
        aeatCertificatePath: stored.certificatePath,
        aeatCertificateFileName: stored.certificateFileName,
        aeatCertificatePasswordEncrypted: stored.certificatePasswordEncrypted,
        aeatCertificateUploadedAt: stored.uploadedAt,
        aeatUseSealCertificateEndpoint: parsed.data.useSealCertificateEndpoint ?? taxpayer.aeatUseSealCertificateEndpoint ?? false,
      })
      .where(eq(taxpayerProfilesTable.id, taxpayer.id))
      .returning();

    res.status(201).json(getTaxpayerCertificateStatus(updated));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "No se pudo guardar el certificado" });
  }
});

router.patch("/taxpayers/:id/aeat-certificate", requireAuth, async (req, res): Promise<void> => {
  const params = GetTaxpayerParams.safeParse(req.params);
  if (!params.success) {
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

  const [taxpayer] = await db
    .update(taxpayerProfilesTable)
    .set({ aeatUseSealCertificateEndpoint: parsed.data.useSealCertificateEndpoint })
    .where(eq(taxpayerProfilesTable.id, params.data.id))
    .returning();

  if (!taxpayer) {
    res.status(404).json({ error: "Taxpayer not found" });
    return;
  }

  res.json(getTaxpayerCertificateStatus(taxpayer));
});

router.delete("/taxpayers/:id/aeat-certificate", requireAuth, async (req, res): Promise<void> => {
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
  const taxpayer = access.taxpayer;

  await removeStoredCertificate(taxpayer.aeatCertificatePath);
  const [updated] = await db
    .update(taxpayerProfilesTable)
    .set({
      aeatCertificatePath: null,
      aeatCertificateFileName: null,
      aeatCertificatePasswordEncrypted: null,
      aeatCertificateUploadedAt: null,
      aeatUseSealCertificateEndpoint: false,
    })
    .where(eq(taxpayerProfilesTable.id, taxpayer.id))
    .returning();

  res.json(getTaxpayerCertificateStatus(updated));
});

export default router;
