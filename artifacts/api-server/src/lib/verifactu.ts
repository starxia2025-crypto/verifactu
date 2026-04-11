import {
  db,
  desc,
  eq,
  invoicesTable,
  taxpayerProfilesTable,
  verifactuRecordsTable,
  type Invoice,
  type TaxpayerProfile,
} from "@workspace/db";
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

type AeatSubmissionResult = {
  success: boolean;
  status: "ACCEPTED" | "ACCEPTED_WITH_ERRORS" | "REJECTED" | "ERROR";
  csv?: string;
  rawResponse?: string;
  errorCode?: string;
  errorMessage?: string;
  nextRetryAt?: Date;
};

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toInvoiceTypeCode(invoiceType: string): string {
  if (invoiceType === "SIMPLIFIED") return "F2";
  if (invoiceType === "RECTIFICATION") return "R1";
  return "F1";
}

function getSoftwareIdentity(taxpayer: TaxpayerProfile) {
  return {
    producerName: process.env.SIF_PRODUCER_NAME ?? "Starxia",
    producerNif: process.env.SIF_PRODUCER_NIF ?? "PENDIENTE_NIF_PRODUCTOR",
    systemName: process.env.SIF_SYSTEM_NAME ?? "VeriFactu SaaS",
    systemId: taxpayer.sifProductCode ?? process.env.SIF_SYSTEM_ID ?? "VERIFACTU-SIF-v1",
    version: process.env.SIF_SYSTEM_VERSION ?? "1.0.0",
    installationNumber: taxpayer.sifInstallationNumber ?? process.env.SIF_INSTALLATION_NUMBER ?? "PENDIENTE_INSTALACION",
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
    recordType,
    numSerie,
    fechaExpedicion,
    generatedAtIso,
    hash,
    previousHash,
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
  recordType: VeriFactuRecordType;
  numSerie: string;
  fechaExpedicion: string;
  generatedAtIso: string;
  hash: string;
  previousHash: string | null;
  cuota: number;
  importe: number;
}): string {
  const { taxpayer, invoice, recordType, numSerie, fechaExpedicion, generatedAtIso, hash, previousHash, cuota, importe } = params;
  const identity = getSoftwareIdentity(taxpayer);
  const registroAnterior = previousHash
    ? `<sf:RegistroAnterior><sf:Huella>${escapeXml(previousHash)}</sf:Huella></sf:RegistroAnterior>`
    : "<sf:PrimerRegistro>S</sf:PrimerRegistro>";

  const registro = recordType === "ANULACION"
    ? `<sf:RegistroAnulacion>
          <sf:IDVersion>1.0</sf:IDVersion>
          <sf:IDFactura>
            <sf:IDEmisorFacturaAnulada>${escapeXml(taxpayer.nif)}</sf:IDEmisorFacturaAnulada>
            <sf:NumSerieFacturaAnulada>${escapeXml(numSerie)}</sf:NumSerieFacturaAnulada>
            <sf:FechaExpedicionFacturaAnulada>${escapeXml(fechaExpedicion)}</sf:FechaExpedicionFacturaAnulada>
          </sf:IDFactura>
          <sf:Encadenamiento>${registroAnterior}</sf:Encadenamiento>
          <sf:SistemaInformatico>
            <sf:NombreRazon>${escapeXml(identity.producerName)}</sf:NombreRazon>
            <sf:NIF>${escapeXml(identity.producerNif)}</sf:NIF>
            <sf:NombreSistemaInformatico>${escapeXml(identity.systemName)}</sf:NombreSistemaInformatico>
            <sf:IdSistemaInformatico>${escapeXml(identity.systemId)}</sf:IdSistemaInformatico>
            <sf:Version>${escapeXml(identity.version)}</sf:Version>
            <sf:NumeroInstalacion>${escapeXml(identity.installationNumber)}</sf:NumeroInstalacion>
          </sf:SistemaInformatico>
          <sf:FechaHoraHusoGenRegistro>${escapeXml(generatedAtIso)}</sf:FechaHoraHusoGenRegistro>
          <sf:Huella>${escapeXml(hash)}</sf:Huella>
        </sf:RegistroAnulacion>`
    : `<sf:RegistroAlta>
          <sf:IDVersion>1.0</sf:IDVersion>
          <sf:IDFactura>
            <sf:IDEmisorFactura>${escapeXml(taxpayer.nif)}</sf:IDEmisorFactura>
            <sf:NumSerieFactura>${escapeXml(numSerie)}</sf:NumSerieFactura>
            <sf:FechaExpedicionFactura>${escapeXml(fechaExpedicion)}</sf:FechaExpedicionFactura>
          </sf:IDFactura>
          <sf:TipoFactura>${escapeXml(toInvoiceTypeCode(invoice.invoiceType))}</sf:TipoFactura>
          <sf:DescripcionOperacion>${escapeXml(invoice.notes ?? "Factura de bienes o servicios")}</sf:DescripcionOperacion>
          <sf:Desglose>
            <sf:DetalleDesglose>
              <sf:BaseImponibleOimporteNoSujeto>${(importe - cuota).toFixed(2)}</sf:BaseImponibleOimporteNoSujeto>
              <sf:CuotaRepercutida>${cuota.toFixed(2)}</sf:CuotaRepercutida>
            </sf:DetalleDesglose>
          </sf:Desglose>
          <sf:CuotaTotal>${cuota.toFixed(2)}</sf:CuotaTotal>
          <sf:ImporteTotal>${importe.toFixed(2)}</sf:ImporteTotal>
          <sf:Encadenamiento>${registroAnterior}</sf:Encadenamiento>
          <sf:SistemaInformatico>
            <sf:NombreRazon>${escapeXml(identity.producerName)}</sf:NombreRazon>
            <sf:NIF>${escapeXml(identity.producerNif)}</sf:NIF>
            <sf:NombreSistemaInformatico>${escapeXml(identity.systemName)}</sf:NombreSistemaInformatico>
            <sf:IdSistemaInformatico>${escapeXml(identity.systemId)}</sf:IdSistemaInformatico>
            <sf:Version>${escapeXml(identity.version)}</sf:Version>
            <sf:NumeroInstalacion>${escapeXml(identity.installationNumber)}</sf:NumeroInstalacion>
            <sf:TipoUsoPosibleSoloVerifactu>S</sf:TipoUsoPosibleSoloVerifactu>
            <sf:TipoUsoPosibleMultiOT>S</sf:TipoUsoPosibleMultiOT>
          </sf:SistemaInformatico>
          <sf:FechaHoraHusoGenRegistro>${escapeXml(generatedAtIso)}</sf:FechaHoraHusoGenRegistro>
          <sf:Huella>${escapeXml(hash)}</sf:Huella>
        </sf:RegistroAlta>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:sf="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroLR.xsd">
  <soapenv:Header/>
  <soapenv:Body>
    <sf:RegFactuSistemaFacturacion>
      <sf:Cabecera>
        <sf:ObligadoEmision>
          <sf:NIF>${escapeXml(taxpayer.nif)}</sf:NIF>
          <sf:NombreRazon>${escapeXml(taxpayer.name)}</sf:NombreRazon>
        </sf:ObligadoEmision>
      </sf:Cabecera>
      <sf:RegistroFactura>${registro}</sf:RegistroFactura>
    </sf:RegFactuSistemaFacturacion>
  </soapenv:Body>
</soapenv:Envelope>`;
}

export function parseAeatSubmissionResponse(xml: string): AeatSubmissionResult {
  const csv = xml.match(/<[^>]*CSV[^>]*>([^<]+)<\/[^>]*CSV>/i)?.[1];
  const estadoRegistro = xml.match(/<[^>]*EstadoRegistro[^>]*>([^<]+)<\/[^>]*EstadoRegistro>/i)?.[1];
  const codigoError = xml.match(/<[^>]*CodigoErrorRegistro[^>]*>([^<]+)<\/[^>]*CodigoErrorRegistro>/i)?.[1];
  const descripcionError = xml.match(/<[^>]*DescripcionErrorRegistro[^>]*>([^<]+)<\/[^>]*DescripcionErrorRegistro>/i)?.[1];

  if (estadoRegistro === "Correcto") {
    return { success: true, status: "ACCEPTED", csv, rawResponse: xml };
  }
  if (estadoRegistro === "AceptadoConErrores") {
    return { success: true, status: "ACCEPTED_WITH_ERRORS", csv, rawResponse: xml, errorCode: codigoError, errorMessage: descripcionError };
  }
  if (estadoRegistro === "Incorrecto") {
    return { success: false, status: "REJECTED", csv, rawResponse: xml, errorCode: codigoError, errorMessage: descripcionError ?? "Registro rechazado por AEAT" };
  }
  return { success: false, status: "ERROR", rawResponse: xml, errorCode: "AEAT_UNKNOWN_RESPONSE", errorMessage: "No se pudo interpretar la respuesta AEAT" };
}

export async function submitToAeat(record: { xmlPayload?: string | null }, environment: VeriFactuEnvironment): Promise<AeatSubmissionResult> {
  const endpoint = environment === "production"
    ? "https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP"
    : "https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP";

  if (process.env.AEAT_ENABLE_SUBMISSION !== "true") {
    logger.warn({ environment, endpoint }, "AEAT submission disabled; record remains queued/error until certificate and WSDL client are configured");
    return {
      success: false,
      status: "ERROR",
      errorCode: "AEAT_SUBMISSION_DISABLED",
      errorMessage: "Envio AEAT desactivado. Configure AEAT_ENABLE_SUBMISSION=true, WSDL y certificado para remitir.",
    };
  }

  if (!process.env.AEAT_CERT_PATH || !process.env.AEAT_CERT_PASSWORD) {
    return {
      success: false,
      status: "ERROR",
      errorCode: "AEAT_CERTIFICATE_MISSING",
      errorMessage: "Falta configurar certificado electronico AEAT.",
    };
  }

  logger.error({ environment, endpoint }, "AEAT SOAP client not implemented yet; refusing to mark record as submitted");
  return {
    success: false,
    status: "ERROR",
    errorCode: "AEAT_CLIENT_NOT_IMPLEMENTED",
    errorMessage: "Cliente SOAP/WSDL AEAT pendiente de implementar. No se marca como enviado sin acuse valido.",
  };
}
