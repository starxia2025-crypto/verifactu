import {
  aeatCertificatesTable,
  and,
  clientsTable,
  db,
  desc,
  eq,
  invoiceLinesTable,
  invoicesTable,
  taxpayerProfilesTable,
  verifactuRecordsTable,
  type Client,
  type Invoice,
  type InvoiceLine,
  type TaxpayerProfile,
} from "@workspace/db";
import { assertValidAeatRegFactuXml } from "./aeat-xsd-validator";
import {
  buildAeatSoapConfigFromEnv,
  parseAeatSubmissionResponse,
  sendAeatSoapEnvelope,
  type AeatSubmissionResult,
} from "./aeat-soap-client";
import { decryptCertificatePassword } from "./aeat-certificate-store";
import {
  buildRegFactuSistemaFacturacionXml,
  buildRegistroAltaXml,
  buildRegistroAnulacionXml,
  buildSoapEnvelope,
  type AeatPreviousRecord,
  type AeatSoftwareIdentity,
  type AeatVatBreakdownLine,
} from "./aeat-verifactu-xml";
import { logger } from "./logger";
import {
  buildAltaHashInput,
  buildAnulacionHashInput,
  buildHash,
  buildQrUrl,
  formatAeatDate,
  type VeriFactuEnvironment,
  type VeriFactuRecordType,
} from "./verifactu-core";

export type BuiltVeriFactuRecord = {
  chainSequence: number;
  hashAlgorithm: "SHA-256";
  hashInput: string;
  hash: string;
  previousHash: string | null;
  qrUrl: string;
  xmlPayload: string;
  generatedAt: Date;
};

function toInvoiceTypeCode(invoiceType: string): string {
  if (invoiceType === "SIMPLIFIED") return "F2";
  if (invoiceType === "RECTIFICATION") return "R1";
  return "F1";
}

function getSoftwareIdentity(taxpayer: TaxpayerProfile): AeatSoftwareIdentity {
  const producerNif = process.env.SIF_PRODUCER_NIF;
  if (!producerNif) {
    throw new Error("AEAT_XML_CONFIG_MISSING: SIF_PRODUCER_NIF debe configurarse antes de generar XML oficial");
  }

  return {
    producerName: process.env.SIF_PRODUCER_NAME ?? "Starxia",
    producerNif,
    systemName: process.env.SIF_SYSTEM_NAME ?? "VeriFactu SaaS",
    systemId: process.env.SIF_SYSTEM_ID ?? "VF",
    version: process.env.SIF_SYSTEM_VERSION ?? "1.0.0",
    installationNumber: taxpayer.sifInstallationNumber ?? process.env.SIF_INSTALLATION_NUMBER ?? "PENDIENTE_INSTALACION",
    onlyVerifactu: process.env.SIF_ONLY_VERIFACTU === "false" ? "N" : "S",
    multiTaxpayer: process.env.SIF_MULTI_TAXPAYER === "false" ? "N" : "S",
    multipleTaxpayers: process.env.SIF_MULTIPLE_TAXPAYERS === "false" ? "N" : "S",
  };
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function sumInvoiceLines(lines: InvoiceLine[], invoice: Invoice): AeatVatBreakdownLine[] {
  if (!lines.length) {
    const taxableBase = Number(invoice.subtotal);
    const vatAmount = Number(invoice.vatAmount);
    const vatRate = taxableBase ? (vatAmount / taxableBase) * 100 : 0;
    return [{
      tax: "01",
      regimeKey: "01",
      operationQualification: "S1",
      vatRate: formatAmount(vatRate),
      taxableBase: formatAmount(taxableBase),
      vatAmount: formatAmount(vatAmount),
    }];
  }

  const byVatRate = new Map<string, { taxableBase: number; vatAmount: number }>();
  for (const line of lines) {
    const vatRate = formatAmount(Number(line.vatRate));
    const current = byVatRate.get(vatRate) ?? { taxableBase: 0, vatAmount: 0 };
    current.taxableBase += Number(line.subtotal);
    current.vatAmount += Number(line.vatAmount);
    byVatRate.set(vatRate, current);
  }

  return [...byVatRate.entries()].map(([vatRate, totals]) => ({
    tax: "01",
    regimeKey: "01",
    operationQualification: "S1",
    vatRate,
    taxableBase: formatAmount(totals.taxableBase),
    vatAmount: formatAmount(totals.vatAmount),
  }));
}

function buildPreviousRecord(
  lastRecord: { hash: string; invoiceId: number } | undefined,
  previousInvoice: Invoice | undefined,
  issuerNif: string,
): AeatPreviousRecord | null {
  if (!lastRecord || !previousInvoice) return null;
  return {
    issuerNif,
    invoiceNumber: previousInvoice.invoiceNumber ?? `DRAFT-${previousInvoice.id}`,
    issueDate: formatAeatDate(previousInvoice.issueDate ?? previousInvoice.createdAt),
    hash: lastRecord.hash,
  };
}

export async function buildVeriFactuRecord(invoiceId: number, recordType: VeriFactuRecordType = "ALTA"): Promise<BuiltVeriFactuRecord> {
  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId))
    .limit(1);

  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  const [taxpayer] = await db
    .select()
    .from(taxpayerProfilesTable)
    .where(eq(taxpayerProfilesTable.id, invoice.taxpayerId))
    .limit(1);

  if (!taxpayer) throw new Error(`Taxpayer ${invoice.taxpayerId} not found`);

  const [lastRecord] = await db
    .select()
    .from(verifactuRecordsTable)
    .where(eq(verifactuRecordsTable.taxpayerId, invoice.taxpayerId))
    .orderBy(desc(verifactuRecordsTable.chainSequence))
    .limit(1);

  const previousInvoice = lastRecord
    ? (await db.select().from(invoicesTable).where(eq(invoicesTable.id, lastRecord.invoiceId)).limit(1))[0]
    : undefined;
  const lines = await db.select().from(invoiceLinesTable).where(eq(invoiceLinesTable.invoiceId, invoice.id));
  const client = invoice.clientId
    ? (await db.select().from(clientsTable).where(eq(clientsTable.id, invoice.clientId)).limit(1))[0]
    : undefined;

  const generatedAt = new Date();
  const generatedAtIso = generatedAt.toISOString();
  const previousHash = lastRecord?.hash ?? null;
  const chainSequence = (lastRecord?.chainSequence ?? 0) + 1;
  const numSerie = invoice.invoiceNumber ?? `DRAFT-${invoice.id}`;
  const fechaExpedicion = formatAeatDate(invoice.issueDate ?? generatedAt);
  const importe = Number(invoice.total);
  const cuota = Number(invoice.vatAmount);

  const hashInput = recordType === "ANULACION"
    ? buildAnulacionHashInput({
        idEmisorFacturaAnulada: taxpayer.nif,
        numSerieFacturaAnulada: numSerie,
        fechaExpedicionFacturaAnulada: fechaExpedicion,
        previousHash,
        fechaHoraHusoGenRegistro: generatedAtIso,
      })
    : buildAltaHashInput({
        idEmisorFactura: taxpayer.nif,
        numSerieFactura: numSerie,
        fechaExpedicionFactura: fechaExpedicion,
        tipoFactura: toInvoiceTypeCode(invoice.invoiceType),
        cuotaTotal: cuota.toFixed(2),
        importeTotal: importe.toFixed(2),
        previousHash,
        fechaHoraHusoGenRegistro: generatedAtIso,
      });

  const hash = buildHash(hashInput);
  const qrUrl = buildQrUrl(taxpayer.nif, numSerie, fechaExpedicion, importe, taxpayer.aeatEnvironment as VeriFactuEnvironment);
  const xmlPayload = buildXmlPayload({
    taxpayer,
    invoice,
    lines,
    client,
    recordType,
    numSerie,
    fechaExpedicion,
    generatedAtIso,
    hash,
    previousRecord: buildPreviousRecord(lastRecord, previousInvoice, taxpayer.nif),
    cuota,
    importe,
  });

  return {
    chainSequence,
    hashAlgorithm: "SHA-256",
    hashInput,
    hash,
    previousHash,
    qrUrl,
    xmlPayload,
    generatedAt,
  };
}

function buildXmlPayload(params: {
  taxpayer: TaxpayerProfile;
  invoice: Invoice;
  lines: InvoiceLine[];
  client?: Client;
  recordType: VeriFactuRecordType;
  numSerie: string;
  fechaExpedicion: string;
  generatedAtIso: string;
  hash: string;
  previousRecord: AeatPreviousRecord | null;
  cuota: number;
  importe: number;
}): string {
  const { taxpayer, invoice, lines, client, recordType, numSerie, fechaExpedicion, generatedAtIso, hash, previousRecord, cuota, importe } = params;
  const identity = getSoftwareIdentity(taxpayer);
  const invoiceId = {
    issuerNif: taxpayer.nif,
    invoiceNumber: numSerie,
    issueDate: fechaExpedicion,
  };

  const registro = recordType === "ANULACION"
    ? buildRegistroAnulacionXml({
        invoiceId,
        previousRecord,
        software: identity,
        generatedAt: generatedAtIso,
        hash,
      })
    : buildRegistroAltaXml({
        invoiceId,
        issuerName: taxpayer.name,
        invoiceType: toInvoiceTypeCode(invoice.invoiceType),
        description: invoice.notes ?? "Factura de bienes o servicios",
        recipients: client ? [{ name: client.name, nif: client.nif }] : [],
        breakdown: sumInvoiceLines(lines, invoice),
        vatTotal: formatAmount(cuota),
        invoiceTotal: formatAmount(importe),
        previousRecord,
        software: identity,
        generatedAt: generatedAtIso,
        hash,
      });

  const regFactuXml = buildRegFactuSistemaFacturacionXml({
    taxpayer: {
      name: taxpayer.name,
      nif: taxpayer.nif,
    },
    registroXml: registro,
    remisionVoluntaria: true,
  });

  assertValidAeatRegFactuXml(regFactuXml);
  return buildSoapEnvelope(regFactuXml);
}

export async function submitToAeat(record: { xmlPayload?: string | null }, environment: VeriFactuEnvironment, taxpayerId?: number): Promise<AeatSubmissionResult> {
  if (process.env.AEAT_ENABLE_SUBMISSION !== "true") {
    logger.warn({ environment }, "AEAT submission disabled; record remains queued/error until certificate submission is enabled");
    return {
      success: false,
      status: "ERROR",
      errorCode: "AEAT_SUBMISSION_DISABLED",
      errorMessage: "Envio AEAT desactivado. Configure AEAT_ENABLE_SUBMISSION=true, WSDL y certificado para remitir.",
    };
  }

  if (!record.xmlPayload) {
    return {
      success: false,
      status: "ERROR",
      errorCode: "AEAT_PAYLOAD_MISSING",
      errorMessage: "No existe XML SOAP para remitir a AEAT.",
    };
  }

  const taxpayer = taxpayerId
    ? (await db.select().from(taxpayerProfilesTable).where(eq(taxpayerProfilesTable.id, taxpayerId)).limit(1))[0]
    : undefined;

  const activeCertificate = taxpayer
    ? (await db
        .select()
        .from(aeatCertificatesTable)
        .where(and(eq(aeatCertificatesTable.taxpayerId, taxpayer.id), eq(aeatCertificatesTable.status, "ACTIVE")))
        .limit(1))[0]
    : undefined;

  if (activeCertificate) {
    return await sendAeatSoapEnvelope(record.xmlPayload, {
      environment,
      certificatePath: activeCertificate.storedFilePath,
      certificatePassword: decryptCertificatePassword(activeCertificate.encryptedPassword),
      endpoint: process.env.AEAT_ENDPOINT,
      useSealCertificateEndpoint: activeCertificate.useSealCertificateEndpoint,
      timeoutMs: process.env.AEAT_TIMEOUT_MS ? Number(process.env.AEAT_TIMEOUT_MS) : undefined,
      rejectUnauthorized: process.env.AEAT_TLS_REJECT_UNAUTHORIZED === "false" ? false : true,
    });
  }

  if (!process.env.AEAT_CERT_PATH || !process.env.AEAT_CERT_PASSWORD) {
    return {
      success: false,
      status: "ERROR",
      errorCode: "AEAT_CERTIFICATE_MISSING",
      errorMessage: "Falta configurar certificado electronico AEAT para este contribuyente o por variables de entorno.",
    };
  }

  const config = buildAeatSoapConfigFromEnv(environment);
  return await sendAeatSoapEnvelope(record.xmlPayload, config);
}

export { parseAeatSubmissionResponse };
