import { readFileSync } from "node:fs";
import https from "node:https";
import { XmlDocument } from "libxml2-wasm";
import {
  parseAeatSubmissionResponse,
  type AeatSubmissionResult,
  type AeatSubmissionStatus,
} from "./aeat-response-parser";
import { assertValidAeatRegFactuXml } from "./aeat-xsd-validator";
import { SOAP_ENVELOPE_NS } from "./aeat-verifactu-xml";
import type { VeriFactuEnvironment } from "./verifactu-core";

export type AeatSoapClientConfig = {
  environment: VeriFactuEnvironment;
  certificatePath: string;
  certificatePassword: string;
  endpoint?: string;
  useSealCertificateEndpoint?: boolean;
  timeoutMs?: number;
  rejectUnauthorized?: boolean;
};

const ENDPOINTS = {
  sandbox: {
    normal: "https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP",
    seal: "https://prewww10.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP",
  },
  production: {
    normal: "https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP",
    seal: "https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP",
  },
} as const;

function findRegFactuPayloadFromSoap(xml: string): string {
  const doc = XmlDocument.fromString(xml);
  try {
    const node = doc.get("//*[local-name()='RegFactuSistemaFacturacion']");
    if (!node) {
      throw new Error("AEAT_SOAP_PAYLOAD_NOT_FOUND: no se encontro RegFactuSistemaFacturacion dentro del envelope SOAP");
    }
    return node.toString();
  } finally {
    doc.dispose();
  }
}

export function getAeatVerifactuEndpoint(config: Pick<AeatSoapClientConfig, "environment" | "endpoint" | "useSealCertificateEndpoint">): string {
  if (config.endpoint) return config.endpoint;
  const group = ENDPOINTS[config.environment];
  return config.useSealCertificateEndpoint ? group.seal : group.normal;
}

export async function sendAeatSoapEnvelope(xmlPayload: string, config: AeatSoapClientConfig): Promise<AeatSubmissionResult> {
  const regFactuPayload = findRegFactuPayloadFromSoap(xmlPayload);
  assertValidAeatRegFactuXml(regFactuPayload);

  const endpoint = getAeatVerifactuEndpoint(config);
  const url = new URL(endpoint);
  const body = Buffer.from(xmlPayload, "utf8");
  const timeoutMs = config.timeoutMs ?? 30_000;

  const options: https.RequestOptions = {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port ? Number(url.port) : 443,
    path: `${url.pathname}${url.search}`,
    method: "POST",
    pfx: readFileSync(config.certificatePath),
    passphrase: config.certificatePassword,
    rejectUnauthorized: config.rejectUnauthorized ?? true,
    timeout: timeoutMs,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Content-Length": body.byteLength,
      SOAPAction: '""',
    },
  };

  return await new Promise<AeatSubmissionResult>((resolve) => {
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const rawResponse = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode && res.statusCode >= 500 && !rawResponse.trim()) {
          resolve({
            success: false,
            status: "ERROR",
            rawResponse,
            errorCode: `HTTP_${res.statusCode}`,
            errorMessage: `AEAT devolvio HTTP ${res.statusCode} sin cuerpo interpretable`,
            nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
          });
          return;
        }

        let parsed: AeatSubmissionResult;
        try {
          parsed = parseAeatSubmissionResponse(rawResponse);
        } catch (error) {
          resolve({
            success: false,
            status: "ERROR",
            rawResponse,
            errorCode: res.statusCode ? `HTTP_${res.statusCode}` : "AEAT_INVALID_XML_RESPONSE",
            errorMessage: error instanceof Error ? error.message : "Respuesta AEAT no interpretable como XML",
            nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
          });
          return;
        }

        if (!parsed.success && parsed.status === "ERROR" && res.statusCode && res.statusCode >= 400) {
          parsed.errorCode = parsed.errorCode ?? `HTTP_${res.statusCode}`;
          parsed.errorMessage = parsed.errorMessage ?? `AEAT devolvio HTTP ${res.statusCode}`;
        }
        resolve(parsed);
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error(`AEAT_TIMEOUT: timeout de ${timeoutMs}ms agotado contra ${endpoint}`));
    });

    req.on("error", (error) => {
      resolve({
        success: false,
        status: "ERROR",
        errorCode: "AEAT_TRANSPORT_ERROR",
        errorMessage: error.message,
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
      });
    });

    req.write(body);
    req.end();
  });
}

export function buildAeatSoapConfigFromEnv(environment: VeriFactuEnvironment): AeatSoapClientConfig {
  if (!process.env.AEAT_CERT_PATH || !process.env.AEAT_CERT_PASSWORD) {
    throw new Error("AEAT_CERTIFICATE_MISSING: configure AEAT_CERT_PATH y AEAT_CERT_PASSWORD");
  }

  return {
    environment,
    certificatePath: process.env.AEAT_CERT_PATH,
    certificatePassword: process.env.AEAT_CERT_PASSWORD,
    endpoint: process.env.AEAT_ENDPOINT,
    useSealCertificateEndpoint: process.env.AEAT_USE_SEAL_CERTIFICATE_ENDPOINT === "true",
    timeoutMs: process.env.AEAT_TIMEOUT_MS ? Number(process.env.AEAT_TIMEOUT_MS) : undefined,
    rejectUnauthorized: process.env.AEAT_TLS_REJECT_UNAUTHORIZED === "false" ? false : true,
  };
}

export { parseAeatSubmissionResponse, SOAP_ENVELOPE_NS };
export type { AeatSubmissionResult, AeatSubmissionStatus };
