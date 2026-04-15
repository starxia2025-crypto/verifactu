import assert from "node:assert/strict";
import { parseAeatSubmissionResponse } from "../../artifacts/api-server/src/lib/aeat-response-parser.ts";

const accepted = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <sfR:RespuestaRegFactuSistemaFacturacion xmlns:sfR="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/RespuestaSuministro.xsd">
      <sfR:CSV>CSV-DEMO-123</sfR:CSV>
      <sfR:Cabecera/>
      <sfR:TiempoEsperaEnvio>60</sfR:TiempoEsperaEnvio>
      <sfR:EstadoEnvio>Correcto</sfR:EstadoEnvio>
      <sfR:RespuestaLinea>
        <sfR:EstadoRegistro>Correcto</sfR:EstadoRegistro>
      </sfR:RespuestaLinea>
    </sfR:RespuestaRegFactuSistemaFacturacion>
  </soapenv:Body>
</soapenv:Envelope>`;

const rejected = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <sfR:RespuestaRegFactuSistemaFacturacion xmlns:sfR="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/RespuestaSuministro.xsd">
      <sfR:Cabecera/>
      <sfR:TiempoEsperaEnvio>60</sfR:TiempoEsperaEnvio>
      <sfR:EstadoEnvio>Incorrecto</sfR:EstadoEnvio>
      <sfR:RespuestaLinea>
        <sfR:EstadoRegistro>Incorrecto</sfR:EstadoRegistro>
        <sfR:CodigoErrorRegistro>1100</sfR:CodigoErrorRegistro>
        <sfR:DescripcionErrorRegistro>Error de validacion de ejemplo</sfR:DescripcionErrorRegistro>
      </sfR:RespuestaLinea>
    </sfR:RespuestaRegFactuSistemaFacturacion>
  </soapenv:Body>
</soapenv:Envelope>`;

const soapFault = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>soapenv:Client</faultcode>
      <faultstring>Certificado no valido</faultstring>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`;

assert.deepEqual(parseAeatSubmissionResponse(accepted), {
  success: true,
  status: "ACCEPTED",
  csv: "CSV-DEMO-123",
  rawResponse: accepted,
});

const rejectedResult = parseAeatSubmissionResponse(rejected);
assert.equal(rejectedResult.success, false);
assert.equal(rejectedResult.status, "REJECTED");
assert.equal(rejectedResult.errorCode, "1100");
assert.equal(rejectedResult.errorMessage, "Error de validacion de ejemplo");

const faultResult = parseAeatSubmissionResponse(soapFault);
assert.equal(faultResult.success, false);
assert.equal(faultResult.status, "ERROR");
assert.equal(faultResult.errorCode, "soapenv:Client");
assert.equal(faultResult.errorMessage, "Certificado no valido");

console.log("AEAT SOAP response parser tests passed");
