import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import forge from "node-forge";

const MAX_CERT_SIZE_BYTES = 5 * 1024 * 1024;
const VALID_EXTENSIONS = new Set([".pfx", ".p12"]);
const NIF_PATTERN = /[A-Z0-9]\d{7}[A-Z0-9]/i;

export type AeatCertificateMetadata = {
  subject: string | null;
  issuer: string | null;
  serialNumber: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  nif: string | null;
  hasPrivateKey: boolean;
  fingerprintSha256: string | null;
  lastValidationError: string | null;
  status: "ACTIVE" | "INACTIVE" | "REVOKED" | "EXPIRED" | "INVALID";
};

export type StoredAeatCertificate = AeatCertificateMetadata & {
  storedFilePath: string;
  originalFileName: string;
  encryptedPassword: string;
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
  return baseName || "certificado.p12";
}

function extensionOf(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

export function assertValidCertificateFileName(fileName: string): void {
  const extension = extensionOf(fileName);
  if (extension === ".cer") {
    throw new Error("AEAT_CERT_INVALID_EXTENSION: .cer no es valido para AEAT porque no incorpora la clave privada. Use .pfx o .p12");
  }
  if (!VALID_EXTENSIONS.has(extension)) {
    throw new Error("AEAT_CERT_INVALID_EXTENSION: el sistema solo acepta certificados .pfx o .p12");
  }
}

function attributesToString(attributes: forge.pki.Certificate["subject"]["attributes"]): string {
  return attributes
    .map((attr) => `${attr.shortName ?? attr.name ?? attr.type}=${attr.value}`)
    .join(", ");
}

function findNif(cert: forge.pki.Certificate): string | null {
  const candidates = [
    ...cert.subject.attributes.map((attr) => String(attr.value ?? "")),
    ...cert.issuer.attributes.map((attr) => String(attr.value ?? "")),
    String(cert.serialNumber ?? ""),
  ];
  for (const candidate of candidates) {
    const match = candidate.toUpperCase().match(NIF_PATTERN);
    if (match) return match[0];
  }
  return null;
}

export function parsePkcs12Certificate(buffer: Buffer, password: string): AeatCertificateMetadata {
  try {
    const binary = buffer.toString("binary");
    const asn1 = forge.asn1.fromDer(binary);
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
    const keyBags = [
      ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? []),
      ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? []),
    ];
    const certificate = certBags.find((bag) => bag.cert)?.cert;
    const hasPrivateKey = keyBags.some((bag) => Boolean(bag.key));

    if (!certificate) {
      return {
        subject: null,
        issuer: null,
        serialNumber: null,
        validFrom: null,
        validTo: null,
        nif: null,
        hasPrivateKey,
        fingerprintSha256: null,
        lastValidationError: "El archivo no contiene un certificado reconocible",
        status: "INVALID",
      };
    }

    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
    const fingerprintSha256 = createHash("sha256").update(Buffer.from(der, "binary")).digest("hex").toUpperCase();
    const now = new Date();
    const expired = certificate.validity.notAfter < now;
    const notYetValid = certificate.validity.notBefore > now;
    const lastValidationError = !hasPrivateKey
      ? "El archivo no contiene clave privada"
      : expired
        ? "El certificado esta caducado"
        : notYetValid
          ? "El certificado aun no es valido"
          : null;

    return {
      subject: attributesToString(certificate.subject.attributes),
      issuer: attributesToString(certificate.issuer.attributes),
      serialNumber: certificate.serialNumber ?? null,
      validFrom: certificate.validity.notBefore,
      validTo: certificate.validity.notAfter,
      nif: findNif(certificate),
      hasPrivateKey,
      fingerprintSha256,
      lastValidationError,
      status: lastValidationError ? (expired ? "EXPIRED" : "INVALID") : "INACTIVE",
    };
  } catch (error) {
    return {
      subject: null,
      issuer: null,
      serialNumber: null,
      validFrom: null,
      validTo: null,
      nif: null,
      hasPrivateKey: false,
      fingerprintSha256: null,
      lastValidationError: `No se pudo leer el certificado PKCS#12${error instanceof Error ? `: ${error.message}` : ""}`,
      status: "INVALID",
    };
  }
}

export async function storeAeatCertificate(input: {
  taxpayerId: number;
  fileName: string;
  pfxBase64: string;
  password: string;
}): Promise<StoredAeatCertificate> {
  assertValidCertificateFileName(input.fileName);
  if (!input.password.trim()) {
    throw new Error("AEAT_CERT_PASSWORD_REQUIRED: la clave del certificado es obligatoria");
  }

  const buffer = Buffer.from(input.pfxBase64, "base64");
  if (!buffer.length || buffer.length > MAX_CERT_SIZE_BYTES) {
    throw new Error("AEAT_CERT_INVALID_SIZE: el certificado esta vacio o supera 5 MB");
  }

  const metadata = parsePkcs12Certificate(buffer, input.password);
  if (metadata.status === "INVALID" || metadata.status === "EXPIRED") {
    throw new Error(`AEAT_CERT_INVALID: ${metadata.lastValidationError ?? "certificado no valido"}`);
  }

  const dir = path.join(certificateStorageDir(), String(input.taxpayerId));
  await mkdir(dir, { recursive: true });
  const storedName = `${Date.now()}-${randomUUID()}-${safeOriginalFileName(input.fileName)}`;
  const storedFilePath = path.join(dir, storedName);
  await writeFile(storedFilePath, buffer, { mode: 0o600 });

  return {
    ...metadata,
    storedFilePath,
    originalFileName: safeOriginalFileName(input.fileName),
    encryptedPassword: encryptCertificatePassword(input.password),
    uploadedAt: new Date(),
  };
}

export async function revalidateStoredCertificate(input: {
  storedFilePath: string;
  encryptedPassword: string;
}): Promise<AeatCertificateMetadata> {
  const buffer = await readFile(input.storedFilePath);
  return parsePkcs12Certificate(buffer, decryptCertificatePassword(input.encryptedPassword));
}

export async function removeStoredCertificate(filePath?: string | null): Promise<void> {
  if (!filePath) return;
  await rm(filePath, { force: true }).catch(() => undefined);
}
