import {
  buildRegFactuSistemaFacturacionXml,
  buildRegistroAltaXml,
  buildSoapEnvelope,
} from "../../artifacts/api-server/src/lib/aeat-verifactu-xml.ts";
import { sendAeatSoapEnvelope } from "../../artifacts/api-server/src/lib/aeat-soap-client.ts";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} es obligatorio`);
  return value;
};

const environment = process.env.AEAT_ENVIRONMENT === "production" ? "production" : "sandbox";
const now = new Date();
const issueDate = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
const invoiceNumber = process.env.AEAT_TEST_INVOICE_NUMBER ?? `TEST-${Date.now()}`;
const taxpayerNif = required("AEAT_TEST_TAXPAYER_NIF");
const taxpayerName = required("AEAT_TEST_TAXPAYER_NAME");

const regFactuXml = buildRegFactuSistemaFacturacionXml({
  taxpayer: {
    nif: taxpayerNif,
    name: taxpayerName,
  },
  registroXml: buildRegistroAltaXml({
    invoiceId: {
      issuerNif: taxpayerNif,
      invoiceNumber,
      issueDate,
    },
    issuerName: taxpayerName,
    invoiceType: "F1",
    description: "Prueba tecnica VERI*FACTU",
    recipients: process.env.AEAT_TEST_CLIENT_NIF && process.env.AEAT_TEST_CLIENT_NAME
      ? [{ nif: process.env.AEAT_TEST_CLIENT_NIF, name: process.env.AEAT_TEST_CLIENT_NAME }]
      : [],
    breakdown: [{
      tax: "01",
      regimeKey: "01",
      operationQualification: "S1",
      vatRate: "21.00",
      taxableBase: "1.00",
      vatAmount: "0.21",
    }],
    vatTotal: "0.21",
    invoiceTotal: "1.21",
    previousRecord: null,
    software: {
      producerName: process.env.SIF_PRODUCER_NAME ?? "Starxia",
      producerNif: required("SIF_PRODUCER_NIF"),
      systemName: process.env.SIF_SYSTEM_NAME ?? "VeriFactu SaaS",
      systemId: process.env.SIF_SYSTEM_ID ?? "VF",
      version: process.env.SIF_SYSTEM_VERSION ?? "1.0.0",
      installationNumber: process.env.SIF_INSTALLATION_NUMBER ?? "INST-TEST-001",
      onlyVerifactu: "S",
      multiTaxpayer: "S",
      multipleTaxpayers: "S",
    },
    generatedAt: now.toISOString(),
    hash: "A".repeat(64),
  }),
});

const result = await sendAeatSoapEnvelope(buildSoapEnvelope(regFactuXml), {
  environment,
  certificatePath: required("AEAT_CERT_PATH"),
  certificatePassword: required("AEAT_CERT_PASSWORD"),
  endpoint: process.env.AEAT_ENDPOINT,
  useSealCertificateEndpoint: process.env.AEAT_USE_SEAL_CERTIFICATE_ENDPOINT === "true",
  timeoutMs: process.env.AEAT_TIMEOUT_MS ? Number(process.env.AEAT_TIMEOUT_MS) : undefined,
  rejectUnauthorized: process.env.AEAT_TLS_REJECT_UNAUTHORIZED === "false" ? false : true,
});

console.log(JSON.stringify(result, null, 2));

if (!result.success) {
  process.exitCode = 1;
}
