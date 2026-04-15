import assert from "node:assert/strict";
import {
  buildRegFactuSistemaFacturacionXml,
  buildRegistroAltaXml,
  buildRegistroAnulacionXml,
  buildSoapEnvelope,
} from "../../artifacts/api-server/src/lib/aeat-verifactu-xml.ts";
import {
  validateAeatRegFactuXml,
} from "../../artifacts/api-server/src/lib/aeat-xsd-validator.ts";

const software = {
  producerName: "Starxia",
  producerNif: "B12345678",
  systemName: "VeriFactu SaaS",
  systemId: "VF",
  version: "1.0.0",
  installationNumber: "INST-TEST-001",
  onlyVerifactu: "S",
  multiTaxpayer: "S",
  multipleTaxpayers: "S",
};

const taxpayer = {
  name: "Empresa Demo SL",
  nif: "B87654321",
};

const invoiceId = {
  issuerNif: taxpayer.nif,
  invoiceNumber: "A-2026-0001",
  issueDate: "15-04-2026",
};

const hash = "A".repeat(64);

function assertValid(xml, label) {
  const result = validateAeatRegFactuXml(xml);
  assert.equal(result.valid, true, `${label} debe validar contra SuministroLR.xsd: ${result.errors.join(" | ")}`);
}

const altaXml = buildRegFactuSistemaFacturacionXml({
  taxpayer,
  registroXml: buildRegistroAltaXml({
    invoiceId,
    issuerName: taxpayer.name,
    invoiceType: "F1",
    description: "Prestacion de servicios profesionales",
    recipients: [{ name: "Cliente Demo SL", nif: "B11223344" }],
    breakdown: [{
      tax: "01",
      regimeKey: "01",
      operationQualification: "S1",
      vatRate: "21.00",
      taxableBase: "100.00",
      vatAmount: "21.00",
    }],
    vatTotal: "21.00",
    invoiceTotal: "121.00",
    previousRecord: null,
    software,
    generatedAt: "2026-04-15T10:00:00+02:00",
    hash,
  }),
});

assertValid(altaXml, "RegistroAlta");

const anulacionXml = buildRegFactuSistemaFacturacionXml({
  taxpayer,
  registroXml: buildRegistroAnulacionXml({
    invoiceId: {
      issuerNif: taxpayer.nif,
      invoiceNumber: "A-2026-0002",
      issueDate: "15-04-2026",
    },
    previousRecord: {
      issuerNif: taxpayer.nif,
      invoiceNumber: invoiceId.invoiceNumber,
      issueDate: invoiceId.issueDate,
      hash,
    },
    software,
    generatedAt: "2026-04-15T10:05:00+02:00",
    hash: "B".repeat(64),
  }),
});

assertValid(anulacionXml, "RegistroAnulacion");

const invalidAltaXml = altaXml.replace("<sf:NombreRazonEmisor>Empresa Demo SL</sf:NombreRazonEmisor>", "");
const invalidResult = validateAeatRegFactuXml(invalidAltaXml);
assert.equal(invalidResult.valid, false, "XML sin NombreRazonEmisor debe fallar contra el XSD oficial");
assert.ok(invalidResult.errors.length > 0, "La validacion invalida debe devolver errores");

const soapEnvelope = buildSoapEnvelope(altaXml);
assert.ok(soapEnvelope.includes("<soapenv:Envelope"), "buildSoapEnvelope debe envolver el XML de suministro");
assert.ok(soapEnvelope.includes("<sfLR:RegFactuSistemaFacturacion"), "El envelope debe conservar el cuerpo oficial");

console.log("AEAT official XML/XSD tests passed");
