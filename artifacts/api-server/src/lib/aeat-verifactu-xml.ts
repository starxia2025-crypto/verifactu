export const AEAT_SUMINISTRO_INFORMACION_NS =
  "https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd";
export const AEAT_SUMINISTRO_LR_NS =
  "https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd";
export const SOAP_ENVELOPE_NS = "http://schemas.xmlsoap.org/soap/envelope/";

export type AeatSiNo = "S" | "N";

export type AeatSoftwareIdentity = {
  producerName: string;
  producerNif: string;
  systemName: string;
  systemId: string;
  version: string;
  installationNumber: string;
  onlyVerifactu: AeatSiNo;
  multiTaxpayer: AeatSiNo;
  multipleTaxpayers: AeatSiNo;
};

export type AeatTaxpayer = {
  name: string;
  nif: string;
};

export type AeatInvoiceId = {
  issuerNif: string;
  invoiceNumber: string;
  issueDate: string;
};

export type AeatPreviousRecord = AeatInvoiceId & {
  hash: string;
};

export type AeatRecipient = {
  name: string;
  nif?: string | null;
};

export type AeatVatBreakdownLine = {
  tax?: "01" | "02" | "03" | "05";
  regimeKey?: string;
  operationQualification?: "S1" | "S2" | "N1" | "N2";
  exemptOperation?: string;
  vatRate?: string;
  taxableBase: string;
  vatAmount?: string;
};

export type BuildRegistroAltaXmlInput = {
  invoiceId: AeatInvoiceId;
  issuerName: string;
  invoiceType: string;
  description: string;
  recipients?: AeatRecipient[];
  breakdown: AeatVatBreakdownLine[];
  vatTotal: string;
  invoiceTotal: string;
  previousRecord?: AeatPreviousRecord | null;
  software: AeatSoftwareIdentity;
  generatedAt: string;
  hash: string;
};

export type BuildRegistroAnulacionXmlInput = {
  invoiceId: AeatInvoiceId;
  previousRecord?: AeatPreviousRecord | null;
  software: AeatSoftwareIdentity;
  generatedAt: string;
  hash: string;
};

export type BuildRegFactuSistemaFacturacionXmlInput = {
  taxpayer: AeatTaxpayer;
  registroXml: string;
  remisionVoluntaria?: boolean;
};

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`AEAT_XML_CONFIG_MISSING: ${field} es obligatorio para generar XML VERI*FACTU oficial`);
  }
  return normalized;
}

function nif(value: string, field: string): string {
  const normalized = required(value, field).toUpperCase();
  if (normalized.length !== 9) {
    throw new Error(`AEAT_XML_CONFIG_INVALID: ${field} debe tener 9 caracteres segun NIFType del XSD oficial`);
  }
  return normalized;
}

function maxLength(value: string, field: string, max: number): string {
  const normalized = required(value, field);
  if (normalized.length > max) {
    throw new Error(`AEAT_XML_CONFIG_INVALID: ${field} supera el maximo oficial de ${max} caracteres`);
  }
  return normalized;
}

function amount(value: string, field: string): string {
  const normalized = required(value, field);
  if (!/^-?\d{1,12}(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`AEAT_XML_AMOUNT_INVALID: ${field} debe tener formato numerico con maximo 2 decimales`);
  }
  return normalized;
}

function buildEncadenamientoXml(previousRecord?: AeatPreviousRecord | null): string {
  if (!previousRecord) {
    return "<sf:PrimerRegistro>S</sf:PrimerRegistro>";
  }

  return [
    "<sf:RegistroAnterior>",
    `<sf:IDEmisorFactura>${escapeXml(nif(previousRecord.issuerNif, "RegistroAnterior.IDEmisorFactura"))}</sf:IDEmisorFactura>`,
    `<sf:NumSerieFactura>${escapeXml(maxLength(previousRecord.invoiceNumber, "RegistroAnterior.NumSerieFactura", 60))}</sf:NumSerieFactura>`,
    `<sf:FechaExpedicionFactura>${escapeXml(required(previousRecord.issueDate, "RegistroAnterior.FechaExpedicionFactura"))}</sf:FechaExpedicionFactura>`,
    `<sf:Huella>${escapeXml(maxLength(previousRecord.hash, "RegistroAnterior.Huella", 64))}</sf:Huella>`,
    "</sf:RegistroAnterior>",
  ].join("");
}

function buildSistemaInformaticoXml(software: AeatSoftwareIdentity): string {
  return [
    "<sf:SistemaInformatico>",
    `<sf:NombreRazon>${escapeXml(maxLength(software.producerName, "SistemaInformatico.NombreRazon", 120))}</sf:NombreRazon>`,
    `<sf:NIF>${escapeXml(nif(software.producerNif, "SistemaInformatico.NIF"))}</sf:NIF>`,
    `<sf:NombreSistemaInformatico>${escapeXml(maxLength(software.systemName, "SistemaInformatico.NombreSistemaInformatico", 30))}</sf:NombreSistemaInformatico>`,
    `<sf:IdSistemaInformatico>${escapeXml(maxLength(software.systemId, "SistemaInformatico.IdSistemaInformatico", 2))}</sf:IdSistemaInformatico>`,
    `<sf:Version>${escapeXml(maxLength(software.version, "SistemaInformatico.Version", 50))}</sf:Version>`,
    `<sf:NumeroInstalacion>${escapeXml(maxLength(software.installationNumber, "SistemaInformatico.NumeroInstalacion", 100))}</sf:NumeroInstalacion>`,
    `<sf:TipoUsoPosibleSoloVerifactu>${software.onlyVerifactu}</sf:TipoUsoPosibleSoloVerifactu>`,
    `<sf:TipoUsoPosibleMultiOT>${software.multiTaxpayer}</sf:TipoUsoPosibleMultiOT>`,
    `<sf:IndicadorMultiplesOT>${software.multipleTaxpayers}</sf:IndicadorMultiplesOT>`,
    "</sf:SistemaInformatico>",
  ].join("");
}

function buildRecipientXml(recipient: AeatRecipient): string | null {
  if (!recipient.nif || recipient.nif.trim().length !== 9) {
    return null;
  }

  return [
    "<sf:IDDestinatario>",
    `<sf:NombreRazon>${escapeXml(maxLength(recipient.name, "Destinatarios.NombreRazon", 120))}</sf:NombreRazon>`,
    `<sf:NIF>${escapeXml(nif(recipient.nif, "Destinatarios.NIF"))}</sf:NIF>`,
    "</sf:IDDestinatario>",
  ].join("");
}

function buildDestinatariosXml(recipients?: AeatRecipient[]): string {
  const recipientXml = (recipients ?? []).map(buildRecipientXml).filter(Boolean).join("");
  return recipientXml ? `<sf:Destinatarios>${recipientXml}</sf:Destinatarios>` : "";
}

function buildDetalleDesgloseXml(line: AeatVatBreakdownLine): string {
  if (line.operationQualification && line.exemptOperation) {
    throw new Error("AEAT_XML_INVALID: DetalleDesglose no puede incluir CalificacionOperacion y OperacionExenta a la vez");
  }

  return [
    "<sf:DetalleDesglose>",
    line.tax ? `<sf:Impuesto>${escapeXml(line.tax)}</sf:Impuesto>` : "",
    line.regimeKey ? `<sf:ClaveRegimen>${escapeXml(line.regimeKey)}</sf:ClaveRegimen>` : "",
    line.exemptOperation
      ? `<sf:OperacionExenta>${escapeXml(line.exemptOperation)}</sf:OperacionExenta>`
      : `<sf:CalificacionOperacion>${escapeXml(line.operationQualification ?? "S1")}</sf:CalificacionOperacion>`,
    line.vatRate ? `<sf:TipoImpositivo>${escapeXml(amount(line.vatRate, "DetalleDesglose.TipoImpositivo"))}</sf:TipoImpositivo>` : "",
    `<sf:BaseImponibleOimporteNoSujeto>${escapeXml(amount(line.taxableBase, "DetalleDesglose.BaseImponibleOimporteNoSujeto"))}</sf:BaseImponibleOimporteNoSujeto>`,
    line.vatAmount ? `<sf:CuotaRepercutida>${escapeXml(amount(line.vatAmount, "DetalleDesglose.CuotaRepercutida"))}</sf:CuotaRepercutida>` : "",
    "</sf:DetalleDesglose>",
  ].join("");
}

function buildDesgloseXml(lines: AeatVatBreakdownLine[]): string {
  if (!lines.length) {
    throw new Error("AEAT_XML_INVALID: Desglose debe contener al menos un DetalleDesglose");
  }
  return `<sf:Desglose>${lines.map(buildDetalleDesgloseXml).join("")}</sf:Desglose>`;
}

export function buildRegistroAltaXml(input: BuildRegistroAltaXmlInput): string {
  return [
    "<sf:RegistroAlta>",
    "<sf:IDVersion>1.0</sf:IDVersion>",
    "<sf:IDFactura>",
    `<sf:IDEmisorFactura>${escapeXml(nif(input.invoiceId.issuerNif, "IDFactura.IDEmisorFactura"))}</sf:IDEmisorFactura>`,
    `<sf:NumSerieFactura>${escapeXml(maxLength(input.invoiceId.invoiceNumber, "IDFactura.NumSerieFactura", 60))}</sf:NumSerieFactura>`,
    `<sf:FechaExpedicionFactura>${escapeXml(required(input.invoiceId.issueDate, "IDFactura.FechaExpedicionFactura"))}</sf:FechaExpedicionFactura>`,
    "</sf:IDFactura>",
    `<sf:NombreRazonEmisor>${escapeXml(maxLength(input.issuerName, "NombreRazonEmisor", 120))}</sf:NombreRazonEmisor>`,
    `<sf:TipoFactura>${escapeXml(required(input.invoiceType, "TipoFactura"))}</sf:TipoFactura>`,
    `<sf:DescripcionOperacion>${escapeXml(maxLength(input.description, "DescripcionOperacion", 500))}</sf:DescripcionOperacion>`,
    buildDestinatariosXml(input.recipients),
    buildDesgloseXml(input.breakdown),
    `<sf:CuotaTotal>${escapeXml(amount(input.vatTotal, "CuotaTotal"))}</sf:CuotaTotal>`,
    `<sf:ImporteTotal>${escapeXml(amount(input.invoiceTotal, "ImporteTotal"))}</sf:ImporteTotal>`,
    `<sf:Encadenamiento>${buildEncadenamientoXml(input.previousRecord)}</sf:Encadenamiento>`,
    buildSistemaInformaticoXml(input.software),
    `<sf:FechaHoraHusoGenRegistro>${escapeXml(required(input.generatedAt, "FechaHoraHusoGenRegistro"))}</sf:FechaHoraHusoGenRegistro>`,
    "<sf:TipoHuella>01</sf:TipoHuella>",
    `<sf:Huella>${escapeXml(maxLength(input.hash, "Huella", 64))}</sf:Huella>`,
    "</sf:RegistroAlta>",
  ].join("");
}

export function buildRegistroAnulacionXml(input: BuildRegistroAnulacionXmlInput): string {
  return [
    "<sf:RegistroAnulacion>",
    "<sf:IDVersion>1.0</sf:IDVersion>",
    "<sf:IDFactura>",
    `<sf:IDEmisorFacturaAnulada>${escapeXml(nif(input.invoiceId.issuerNif, "IDFactura.IDEmisorFacturaAnulada"))}</sf:IDEmisorFacturaAnulada>`,
    `<sf:NumSerieFacturaAnulada>${escapeXml(maxLength(input.invoiceId.invoiceNumber, "IDFactura.NumSerieFacturaAnulada", 60))}</sf:NumSerieFacturaAnulada>`,
    `<sf:FechaExpedicionFacturaAnulada>${escapeXml(required(input.invoiceId.issueDate, "IDFactura.FechaExpedicionFacturaAnulada"))}</sf:FechaExpedicionFacturaAnulada>`,
    "</sf:IDFactura>",
    `<sf:Encadenamiento>${buildEncadenamientoXml(input.previousRecord)}</sf:Encadenamiento>`,
    buildSistemaInformaticoXml(input.software),
    `<sf:FechaHoraHusoGenRegistro>${escapeXml(required(input.generatedAt, "FechaHoraHusoGenRegistro"))}</sf:FechaHoraHusoGenRegistro>`,
    "<sf:TipoHuella>01</sf:TipoHuella>",
    `<sf:Huella>${escapeXml(maxLength(input.hash, "Huella", 64))}</sf:Huella>`,
    "</sf:RegistroAnulacion>",
  ].join("");
}

export function buildRegFactuSistemaFacturacionXml(input: BuildRegFactuSistemaFacturacionXmlInput): string {
  const remisionVoluntaria = input.remisionVoluntaria === false ? "" : "<sf:RemisionVoluntaria/>";
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<sfLR:RegFactuSistemaFacturacion xmlns:sfLR="${AEAT_SUMINISTRO_LR_NS}" xmlns:sf="${AEAT_SUMINISTRO_INFORMACION_NS}">`,
    "<sfLR:Cabecera>",
    "<sf:ObligadoEmision>",
    `<sf:NombreRazon>${escapeXml(maxLength(input.taxpayer.name, "Cabecera.ObligadoEmision.NombreRazon", 120))}</sf:NombreRazon>`,
    `<sf:NIF>${escapeXml(nif(input.taxpayer.nif, "Cabecera.ObligadoEmision.NIF"))}</sf:NIF>`,
    "</sf:ObligadoEmision>",
    remisionVoluntaria,
    "</sfLR:Cabecera>",
    `<sfLR:RegistroFactura>${input.registroXml}</sfLR:RegistroFactura>`,
    "</sfLR:RegFactuSistemaFacturacion>",
  ].join("");
}

export function buildSoapEnvelope(bodyXml: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<soapenv:Envelope xmlns:soapenv="${SOAP_ENVELOPE_NS}">`,
    "<soapenv:Header/>",
    `<soapenv:Body>${bodyXml.replace(/^<\?xml[^>]*>\s*/u, "")}</soapenv:Body>`,
    "</soapenv:Envelope>",
  ].join("");
}
