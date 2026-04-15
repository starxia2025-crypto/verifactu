import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TaxpayerProfile } from "@workspace/db";

const MAX_PFX_SIZE_BYTES = 5 * 1024 * 1024;

export type TaxpayerCertificateStatus = {
  hasCertificate: boolean;
  fileName: string | null;
  uploadedAt: Date | string | null;
  useSealCertificateEndpoint: boolean;
};

export type StoredTaxpayerCertificate = {
  certificatePath: string;
  certificateFileName: string;
  certificatePasswordEncrypted: string;
  uploadedAt: Date;
};

function getEncryptionSecret(): string {
  const secret = process.env.AEAT_CERT_ENCRYPTION_KEY ?? process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("AEAT_CERT_ENCRYPTION_KEY_MISSING: configure AEAT_CERT_ENCRYPTION_KEY o SESSION_SECRET para cifrar la clave del certificado");
  }
  return secret;
}

function encryptionKey(): Buffer {
  return createHash("sha256").update(getEncryptionSecret(), "utf8").digest();
}

export function encryptCertificatePassword(password: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptCertificatePassword(encryptedPassword: string): string {
  const [version, ivRaw, tagRaw, encryptedRaw] = encryptedPassword.split(":");
  if (version !== "v1" || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("AEAT_CERT_PASSWORD_INVALID: formato de clave cifrada no reconocido");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function certificateStorageDir(): string {
  return process.env.AEAT_CERT_STORAGE_DIR
    ? path.resolve(process.env.AEAT_CERT_STORAGE_DIR)
    : path.resolve(process.cwd(), "storage/aeat-certificates");
}

function safeOriginalFileName(fileName: string): string {
  const baseName = path.basename(fileName).replace(/[^\w.-]/g, "_");
  return baseName || "certificado.pfx";
}

export async function storeTaxpayerCertificate(input: {
  taxpayerId: number;
  fileName: string;
  pfxBase64: string;
  password: string;
  previousPath?: string | null;
}): Promise<StoredTaxpayerCertificate> {
  if (!input.fileName.toLowerCase().endsWith(".pfx")) {
    throw new Error("AEAT_CERT_INVALID_EXTENSION: el certificado debe ser un archivo .pfx");
  }
  if (!input.password.trim()) {
    throw new Error("AEAT_CERT_PASSWORD_REQUIRED: la clave del certificado es obligatoria");
  }

  const buffer = Buffer.from(input.pfxBase64, "base64");
  if (!buffer.length || buffer.length > MAX_PFX_SIZE_BYTES) {
    throw new Error("AEAT_CERT_INVALID_SIZE: el certificado esta vacio o supera 5 MB");
  }

  const dir = path.join(certificateStorageDir(), String(input.taxpayerId));
  await mkdir(dir, { recursive: true });
  const storedName = `${Date.now()}-${randomUUID()}-${safeOriginalFileName(input.fileName)}`;
  const certificatePath = path.join(dir, storedName);
  await writeFile(certificatePath, buffer, { mode: 0o600 });

  if (input.previousPath) {
    await rm(input.previousPath, { force: true }).catch(() => undefined);
  }

  return {
    certificatePath,
    certificateFileName: safeOriginalFileName(input.fileName),
    certificatePasswordEncrypted: encryptCertificatePassword(input.password),
    uploadedAt: new Date(),
  };
}

export async function removeStoredCertificate(filePath?: string | null): Promise<void> {
  if (!filePath) return;
  await rm(filePath, { force: true }).catch(() => undefined);
}

export function getTaxpayerCertificateStatus(taxpayer: TaxpayerProfile): TaxpayerCertificateStatus {
  return {
    hasCertificate: Boolean(taxpayer.aeatCertificatePath && taxpayer.aeatCertificatePasswordEncrypted),
    fileName: taxpayer.aeatCertificateFileName ?? null,
    uploadedAt: taxpayer.aeatCertificateUploadedAt ?? null,
    useSealCertificateEndpoint: taxpayer.aeatUseSealCertificateEndpoint ?? false,
  };
}
