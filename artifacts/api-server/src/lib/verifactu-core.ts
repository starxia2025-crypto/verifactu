import { createHash } from "crypto";

export type VeriFactuEnvironment = "sandbox" | "production";
export type VeriFactuRecordType = "ALTA" | "ANULACION" | "SUBSANACION";

const AEAT_VERIFACTU_QR_SANDBOX = "https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?";
const AEAT_VERIFACTU_QR_PRODUCTION = "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?";

export function formatAeatDate(value: string | Date): string {
  if (typeof value === "string" && /^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return value;
  }
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function normalizeHashValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function buildQrUrl(
  nif: string,
  numSerie: string,
  fechaExpedicion: string | Date,
  importe: number,
  environment: VeriFactuEnvironment
): string {
  const base = environment === "production" ? AEAT_VERIFACTU_QR_PRODUCTION : AEAT_VERIFACTU_QR_SANDBOX;
  const params = new URLSearchParams({
    nif: normalizeHashValue(nif),
    numserie: normalizeHashValue(numSerie),
    fecha: formatAeatDate(fechaExpedicion),
    importe: importe.toFixed(2),
  });
  return `${base}${params.toString()}`;
}

export function buildAltaHashInput(record: {
  idEmisorFactura: string;
  numSerieFactura: string;
  fechaExpedicionFactura: string;
  tipoFactura: string;
  cuotaTotal: string | number;
  importeTotal: string | number;
  previousHash: string | null;
  fechaHoraHusoGenRegistro: string;
}): string {
  return [
    `IDEmisorFactura=${normalizeHashValue(record.idEmisorFactura)}`,
    `NumSerieFactura=${normalizeHashValue(record.numSerieFactura)}`,
    `FechaExpedicionFactura=${normalizeHashValue(record.fechaExpedicionFactura)}`,
    `TipoFactura=${normalizeHashValue(record.tipoFactura)}`,
    `CuotaTotal=${normalizeHashValue(record.cuotaTotal)}`,
    `ImporteTotal=${normalizeHashValue(record.importeTotal)}`,
    `Huella=${normalizeHashValue(record.previousHash)}`,
    `FechaHoraHusoGenRegistro=${normalizeHashValue(record.fechaHoraHusoGenRegistro)}`,
  ].join("&");
}

export function buildAnulacionHashInput(record: {
  idEmisorFacturaAnulada: string;
  numSerieFacturaAnulada: string;
  fechaExpedicionFacturaAnulada: string;
  previousHash: string | null;
  fechaHoraHusoGenRegistro: string;
}): string {
  return [
    `IDEmisorFacturaAnulada=${normalizeHashValue(record.idEmisorFacturaAnulada)}`,
    `NumSerieFacturaAnulada=${normalizeHashValue(record.numSerieFacturaAnulada)}`,
    `FechaExpedicionFacturaAnulada=${normalizeHashValue(record.fechaExpedicionFacturaAnulada)}`,
    `Huella=${normalizeHashValue(record.previousHash)}`,
    `FechaHoraHusoGenRegistro=${normalizeHashValue(record.fechaHoraHusoGenRegistro)}`,
  ].join("&");
}

export function buildHash(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex").toUpperCase();
}

export function buildSifEventHashInput(record: {
  taxpayerId: number;
  eventType: string;
  entityType: string;
  entityId: number | null;
  previousEventHash: string | null;
  payload: string;
  occurredAt: string;
}): string {
  return [
    `TaxpayerId=${record.taxpayerId}`,
    `TipoEvento=${normalizeHashValue(record.eventType)}`,
    `Entidad=${normalizeHashValue(record.entityType)}`,
    `EntidadId=${normalizeHashValue(record.entityId)}`,
    `HuellaEventoAnterior=${normalizeHashValue(record.previousEventHash)}`,
    `Payload=${normalizeHashValue(record.payload)}`,
    `FechaHoraHusoGenEvento=${normalizeHashValue(record.occurredAt)}`,
  ].join("&");
}
