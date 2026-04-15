import { XmlDocument } from "libxml2-wasm";

export type AeatSubmissionStatus = "ACCEPTED" | "ACCEPTED_WITH_ERRORS" | "REJECTED" | "ERROR";

export type AeatSubmissionResult = {
  success: boolean;
  status: AeatSubmissionStatus;
  csv?: string;
  rawResponse?: string;
  errorCode?: string;
  errorMessage?: string;
  nextRetryAt?: Date;
};

function text(doc: XmlDocument, xpath: string): string | undefined {
  const value = doc.eval(`string(${xpath})`);
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

export function parseAeatSubmissionResponse(xml: string): AeatSubmissionResult {
  const doc = XmlDocument.fromString(xml);
  try {
    const faultCode = text(doc, "//*[local-name()='Fault']/*[local-name()='faultcode']");
    const faultString = text(doc, "//*[local-name()='Fault']/*[local-name()='faultstring']");
    if (faultCode || faultString) {
      return {
        success: false,
        status: "ERROR",
        rawResponse: xml,
        errorCode: faultCode ?? "SOAP_FAULT",
        errorMessage: faultString ?? "AEAT devolvio un SOAP Fault",
      };
    }

    const csv = text(doc, "//*[local-name()='RespuestaRegFactuSistemaFacturacion']/*[local-name()='CSV']");
    const estadoEnvio = text(doc, "//*[local-name()='RespuestaRegFactuSistemaFacturacion']/*[local-name()='EstadoEnvio']");
    const estadoRegistro = text(doc, "//*[local-name()='RespuestaLinea'][1]/*[local-name()='EstadoRegistro']");
    const codigoError = text(doc, "//*[local-name()='RespuestaLinea'][1]/*[local-name()='CodigoErrorRegistro']");
    const descripcionError = text(doc, "//*[local-name()='RespuestaLinea'][1]/*[local-name()='DescripcionErrorRegistro']");

    if (estadoRegistro === "Correcto" || (estadoEnvio === "Correcto" && !estadoRegistro)) {
      return { success: true, status: "ACCEPTED", csv, rawResponse: xml };
    }

    if (estadoRegistro === "AceptadoConErrores" || estadoEnvio === "ParcialmenteCorrecto") {
      return {
        success: true,
        status: "ACCEPTED_WITH_ERRORS",
        csv,
        rawResponse: xml,
        errorCode: codigoError,
        errorMessage: descripcionError,
      };
    }

    if (estadoRegistro === "Incorrecto" || estadoEnvio === "Incorrecto") {
      return {
        success: false,
        status: "REJECTED",
        csv,
        rawResponse: xml,
        errorCode: codigoError,
        errorMessage: descripcionError ?? "Registro rechazado por AEAT",
      };
    }

    return {
      success: false,
      status: "ERROR",
      rawResponse: xml,
      errorCode: "AEAT_UNKNOWN_RESPONSE",
      errorMessage: "No se pudo interpretar la respuesta AEAT",
    };
  } finally {
    doc.dispose();
  }
}
