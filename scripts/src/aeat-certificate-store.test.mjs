import assert from "node:assert/strict";
import forge from "node-forge";
import {
  assertValidCertificateFileName,
  decryptCertificatePassword,
  encryptCertificatePassword,
  parsePkcs12Certificate,
} from "../../artifacts/api-server/src/lib/aeat-certificate-store.ts";

process.env.AEAT_CERT_ENCRYPTION_KEY = "test-only-encryption-key";

function buildPkcs12(password) {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date(Date.now() - 60_000);
  cert.validity.notAfter = new Date(Date.now() + 86_400_000);
  cert.setSubject([
    { name: "commonName", value: "B12345678 Demo Emisor" },
    { name: "organizationName", value: "Demo Emisor SL" },
    { name: "countryName", value: "ES" },
  ]);
  cert.setIssuer([
    { name: "commonName", value: "Test CA" },
    { name: "countryName", value: "ES" },
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    algorithm: "3des",
  });
  return Buffer.from(forge.asn1.toDer(asn1).getBytes(), "binary");
}

assert.doesNotThrow(() => assertValidCertificateFileName("emisor.pfx"));
assert.doesNotThrow(() => assertValidCertificateFileName("emisor.p12"));
assert.throws(() => assertValidCertificateFileName("emisor.cer"), /no incorpora la clave privada/i);
assert.throws(() => assertValidCertificateFileName("emisor.pem"), /solo acepta/i);

const encrypted = encryptCertificatePassword("clave-secreta");
assert.notEqual(encrypted, "clave-secreta");
assert.equal(decryptCertificatePassword(encrypted), "clave-secreta");

const p12 = buildPkcs12("p12-password");
const metadata = parsePkcs12Certificate(p12, "p12-password");
assert.equal(metadata.status, "INACTIVE");
assert.equal(metadata.hasPrivateKey, true);
assert.equal(metadata.nif, "B12345678");
assert.ok(metadata.subject?.includes("Demo Emisor"));
assert.ok(metadata.issuer?.includes("Test CA"));
assert.ok(metadata.fingerprintSha256);

const invalidMetadata = parsePkcs12Certificate(Buffer.from("not-a-pkcs12"), "p12-password");
assert.equal(invalidMetadata.status, "INVALID");
assert.match(invalidMetadata.lastValidationError ?? "", /no se pudo leer/i);

console.log("AEAT certificate store tests passed");
