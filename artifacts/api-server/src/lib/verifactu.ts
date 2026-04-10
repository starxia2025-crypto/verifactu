import { createHash } from "crypto";
import { db, invoicesTable, invoiceLinesTable, verifactuRecordsTable, taxpayerProfilesTable, clientsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "./logger";

const AEAT_VERIFACTU_QR_SANDBOX = "https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?";
const AEAT_VERIFACTU_QR_PRODUCTION = "https://www2.aeat.es/wlpl/TIKE-CONT/ValidarQR?";

export function buildQrUrl(
  nif: string,
  numSerie: string,
  fechaExpedicion: string,
  importe: number,
  environment: "sandbox" | "production"
): string {
  const base = environment === "production" ? AEAT_VERIFACTU_QR_PRODUCTION : AEAT_VERIFACTU_QR_SANDBOX;
  const params = new URLSearchParams({
    nif,
    numserie: numSerie,
    fecha: fechaExpedicion,
    importe: importe.toFixed(2),
  });
  return `${base}${params.toString()}`;
}

export function buildHashInput(record: {
  nifEmisor: string;
  numSerie: string;
  fechaExpedicion: string;
  tipoFactura: string;
  cuotaTotal: string;
  importeTotal: string;
  previousHash: string | null;
  softwareVersion: string;
}): string {
  return [
    `NIF-Emisor=${record.nifEmisor}`,
    `NumSerie=${record.numSerie}`,
    `FechaExpedicion=${record.fechaExpedicion}`,
    `TipoFactura=${record.tipoFactura}`,
    `CuotaTotalIVA=${record.cuotaTotal}`,
    `ImporteTotal=${record.importeTotal}`,
    `Encadenamiento=${record.previousHash ?? ""}`,
    `SistemaInformatico=VeriFactuSaaS-v1.0`,
  ].join("&");
}

export function buildHash(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex").toUpperCase();
}

export async function buildVeriFactuRecord(invoiceId: number): Promise<{
  hash: string;
  previousHash: string | null;
  qrUrl: string;
  xmlPayload: string;
}> {
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

  // Get previous hash for chaining
  const [lastRecord] = await db
    .select()
    .from(verifactuRecordsTable)
    .where(eq(verifactuRecordsTable.taxpayerId, invoice.taxpayerId))
    .orderBy(desc(verifactuRecordsTable.id))
    .limit(1);

  const previousHash = lastRecord?.hash ?? null;

  const numSerie = invoice.invoiceNumber ?? `DRAFT-${invoice.id}`;
  const fechaExpedicion = invoice.issueDate ?? new Date().toISOString().split("T")[0];
  const importe = parseFloat(invoice.total as string);
  const cuota = parseFloat(invoice.vatAmount as string);

  const hashInput = buildHashInput({
    nifEmisor: taxpayer.nif,
    numSerie,
    fechaExpedicion,
    tipoFactura: invoice.invoiceType === "STANDARD" ? "F1" : invoice.invoiceType === "SIMPLIFIED" ? "F2" : "R1",
    cuotaTotal: cuota.toFixed(2),
    importeTotal: importe.toFixed(2),
    previousHash,
    softwareVersion: "VeriFactuSaaS-v1.0",
  });

  const hash = buildHash(hashInput);

  const qrUrl = buildQrUrl(
    taxpayer.nif,
    numSerie,
    fechaExpedicion,
    importe,
    taxpayer.aeatEnvironment as "sandbox" | "production"
  );

  // Build XML placeholder (SOAP/WSDL spec TBD from AEAT documentation)
  const xmlPayload = buildXmlPayload({
    taxpayer,
    invoice,
    numSerie,
    fechaExpedicion,
    hash,
    previousHash,
    cuota,
    importe,
  });

  return { hash, previousHash, qrUrl, xmlPayload };
}

function buildXmlPayload(params: {
  taxpayer: any;
  invoice: any;
  numSerie: string;
  fechaExpedicion: string;
  hash: string;
  previousHash: string | null;
  cuota: number;
  importe: number;
}): string {
  const { taxpayer, invoice, numSerie, fechaExpedicion, hash, previousHash, cuota, importe } = params;
  // NOTE: This XML structure is a placeholder. The final WSDL/XSD spec from AEAT must be used.
  // Endpoints and exact element names will be updated when AEAT documentation is provided.
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:sf="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd">
  <soapenv:Header/>
  <soapenv:Body>
    <sf:RegFactuSistemaFacturacion>
      <sf:Cabecera>
        <sf:ObligadoEmision>
          <sf:NIF>${taxpayer.nif}</sf:NIF>
          <sf:Nombre>${taxpayer.name}</sf:Nombre>
        </sf:ObligadoEmision>
        <sf:RemisionVoluntaria>
          <sf:FechaEnvio>${new Date().toISOString().split("T")[0]}</sf:FechaEnvio>
        </sf:RemisionVoluntaria>
        <sf:SistemaInformatico>
          <sf:NombreRazon>VeriFactu SaaS</sf:NombreRazon>
          <sf:NIF>TODO_NIF_FABRICANTE</sf:NIF>
          <sf:IdSistemaInformatico>VERIFACTU-SIF-v1</sf:IdSistemaInformatico>
          <sf:Version>1.0</sf:Version>
          <sf:NumeroInstalacion>${taxpayer.sifInstallationNumber ?? "SIF-001"}</sf:NumeroInstalacion>
          <sf:TipoUsoPosibleSoloVerifactu>S</sf:TipoUsoPosibleSoloVerifactu>
          <sf:TipoUsoPosibleMultiOT>S</sf:TipoUsoPosibleMultiOT>
        </sf:SistemaInformatico>
      </sf:Cabecera>
      <sf:RegistroFactura>
        <sf:RegistroAlta>
          <sf:IDVersion>1.0</sf:IDVersion>
          <sf:IDFactura>
            <sf:IDEmisorFactura>${taxpayer.nif}</sf:IDEmisorFactura>
            <sf:NumSerieFactura>${numSerie}</sf:NumSerieFactura>
            <sf:FechaExpedicionFactura>${fechaExpedicion}</sf:FechaExpedicionFactura>
          </sf:IDFactura>
          <sf:TipoFactura>${invoice.invoiceType === "STANDARD" ? "F1" : "F2"}</sf:TipoFactura>
          <sf:DescripcionOperacion>${invoice.notes ?? "Factura de servicios"}</sf:DescripcionOperacion>
          <sf:Desglose>
            <sf:DetalleIVA>
              <sf:BaseImponibleOimporteNoSujeto>${(importe - cuota).toFixed(2)}</sf:BaseImponibleOimporteNoSujeto>
              <sf:CuotaRepercutida>${cuota.toFixed(2)}</sf:CuotaRepercutida>
            </sf:DetalleIVA>
          </sf:Desglose>
          <sf:CuotaTotal>${cuota.toFixed(2)}</sf:CuotaTotal>
          <sf:ImporteTotal>${importe.toFixed(2)}</sf:ImporteTotal>
          <sf:Encadenamiento>
            ${previousHash ? `<sf:RegistroAnterior><sf:Huella>${previousHash}</sf:Huella></sf:RegistroAnterior>` : "<sf:PrimerRegistro>S</sf:PrimerRegistro>"}
          </sf:Encadenamiento>
          <sf:SistemaInformatico>
            <sf:NombreRazon>VeriFactu SaaS</sf:NombreRazon>
            <sf:NIF>TODO_NIF_FABRICANTE</sf:NIF>
            <sf:IdSistemaInformatico>VERIFACTU-SIF-v1</sf:IdSistemaInformatico>
            <sf:Version>1.0</sf:Version>
            <sf:NumeroInstalacion>${taxpayer.sifInstallationNumber ?? "SIF-001"}</sf:NumeroInstalacion>
          </sf:SistemaInformatico>
          <sf:FechaHoraHusoGenRegistro>${new Date().toISOString()}</sf:FechaHoraHusoGenRegistro>
          <sf:HuellaRegistro>${hash}</sf:HuellaRegistro>
        </sf:RegistroAlta>
      </sf:RegistroFactura>
    </sf:RegFactuSistemaFacturacion>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// AEAT SOAP client placeholder
// NOTE: Real endpoints, WSDL, and certificate auth TBD from AEAT documentation
export async function submitToAeat(
  record: any,
  environment: "sandbox" | "production"
): Promise<{ success: boolean; csv?: string; errorCode?: string; errorMessage?: string }> {
  // SANDBOX endpoint (placeholder - update with official AEAT endpoint)
  const sandboxEndpoint = "https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP";
  const productionEndpoint = "https://www1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP";
  const endpoint = environment === "production" ? productionEndpoint : sandboxEndpoint;

  // TODO: Implement actual SOAP call with qualified electronic certificate
  // For now, simulate pending status until AEAT documentation is provided
  logger.info({ environment, endpoint }, "AEAT submission placeholder - awaiting WSDL spec");

  return {
    success: false,
    errorCode: "TODO",
    errorMessage: "AEAT integration pending: WSDL/certificate configuration required. See AEAT technical spec.",
  };
}
