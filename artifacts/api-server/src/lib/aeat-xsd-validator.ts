import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ParseOption,
  XmlBufferInputProvider,
  XmlDocument,
  XmlLibError,
  XsdValidator,
  xmlCleanupInputProvider,
  xmlRegisterInputProvider,
} from "libxml2-wasm";

export type AeatXsdValidationResult = {
  valid: boolean;
  errors: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const XSD_FILES = {
  suministroLR: "SuministroLR.xsd",
  suministroInformacion: "SuministroInformacion.xsd",
  consultaLR: "ConsultaLR.xsd",
  respuestaConsultaLR: "RespuestaConsultaLR.xsd",
  respuestaSuministro: "RespuestaSuministro.xsd",
  xmldsig: "xmldsig-core-schema.xsd",
} as const;

function findOfficialArtifactsDir(): string {
  const candidates = [
    process.env.AEAT_OFFICIAL_ARTIFACTS_DIR,
    path.resolve(__dirname, "../aeat/official"),
    path.resolve(__dirname, "aeat/official"),
    path.resolve(process.cwd(), "src/aeat/official"),
    path.resolve(process.cwd(), "dist/aeat/official"),
    path.resolve(process.cwd(), "artifacts/api-server/src/aeat/official"),
    path.resolve(process.cwd(), "artifacts/api-server/dist/aeat/official"),
  ].filter(Boolean) as string[];

  const found = candidates.find((candidate) => existsSync(path.join(candidate, "tikeV1.0/cont/ws", XSD_FILES.suministroLR)));
  if (!found) {
    throw new Error("AEAT_OFFICIAL_ARTIFACTS_NOT_FOUND: no se encuentran los XSD oficiales versionados");
  }
  return found;
}

function readOfficialSchemaBuffers(): Record<string, Uint8Array> {
  const officialDir = findOfficialArtifactsDir();
  const wsDir = path.join(officialDir, "tikeV1.0/cont/ws");
  const dsigDir = path.join(officialDir, "xmldsig");

  const read = (filePath: string) => new Uint8Array(readFileSync(filePath));
  const buffers: Record<string, Uint8Array> = {
    [XSD_FILES.suministroLR]: read(path.join(wsDir, XSD_FILES.suministroLR)),
    [XSD_FILES.suministroInformacion]: read(path.join(wsDir, XSD_FILES.suministroInformacion)),
    [XSD_FILES.consultaLR]: read(path.join(wsDir, XSD_FILES.consultaLR)),
    [XSD_FILES.respuestaConsultaLR]: read(path.join(wsDir, XSD_FILES.respuestaConsultaLR)),
    [XSD_FILES.respuestaSuministro]: read(path.join(wsDir, XSD_FILES.respuestaSuministro)),
    [XSD_FILES.xmldsig]: read(path.join(dsigDir, XSD_FILES.xmldsig)),
    "http://www.w3.org/TR/xmldsig-core/xmldsig-core-schema.xsd": read(path.join(dsigDir, XSD_FILES.xmldsig)),
  };

  return buffers;
}

function formatXmlError(error: unknown): string[] {
  if (error instanceof XmlLibError && error.details.length) {
    return error.details.map((detail) => {
      const location = detail.line ? `linea ${detail.line}, columna ${detail.col}: ` : "";
      return `${location}${detail.message.trim()}`;
    });
  }

  if (error instanceof Error) {
    return [error.message];
  }

  return [String(error)];
}

export function validateAeatRegFactuXml(xml: string): AeatXsdValidationResult {
  xmlCleanupInputProvider();
  const schemaBuffers = readOfficialSchemaBuffers();
  const provider = new XmlBufferInputProvider(schemaBuffers);
  xmlRegisterInputProvider(provider);

  const schemaDoc = XmlDocument.fromBuffer(schemaBuffers[XSD_FILES.suministroLR], {
    url: XSD_FILES.suministroLR,
    option: ParseOption.XML_PARSE_NONET,
  });
  const xmlDoc = XmlDocument.fromString(xml, {
    url: "RegFactuSistemaFacturacion.xml",
    option: ParseOption.XML_PARSE_NONET,
  });

  try {
    const validator = XsdValidator.fromDoc(schemaDoc);
    try {
      validator.validate(xmlDoc);
      return { valid: true, errors: [] };
    } finally {
      validator.dispose();
    }
  } catch (error) {
    return { valid: false, errors: formatXmlError(error) };
  } finally {
    schemaDoc.dispose();
    xmlDoc.dispose();
    xmlCleanupInputProvider();
  }
}

export function assertValidAeatRegFactuXml(xml: string): void {
  const result = validateAeatRegFactuXml(xml);
  if (!result.valid) {
    throw new Error(`AEAT_XSD_VALIDATION_FAILED: ${result.errors.join(" | ")}`);
  }
}
