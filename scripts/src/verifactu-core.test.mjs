import assert from "node:assert/strict";
import {
  buildAltaHashInput,
  buildAnulacionHashInput,
  buildHash,
  buildQrUrl,
} from "../../artifacts/api-server/src/lib/verifactu-core.ts";

const firstAltaInput = buildAltaHashInput({
  idEmisorFactura: "89890001K",
  numSerieFactura: "12345678/G33",
  fechaExpedicionFactura: "01-01-2024",
  tipoFactura: "F1",
  cuotaTotal: "12.35",
  importeTotal: "123.45",
  previousHash: null,
  fechaHoraHusoGenRegistro: "2024-01-01T19:20:30+01:00",
});

assert.equal(
  firstAltaInput,
  "IDEmisorFactura=89890001K&NumSerieFactura=12345678/G33&FechaExpedicionFactura=01-01-2024&TipoFactura=F1&CuotaTotal=12.35&ImporteTotal=123.45&Huella=&FechaHoraHusoGenRegistro=2024-01-01T19:20:30+01:00",
);
assert.equal(
  buildHash(firstAltaInput),
  "3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60",
);

const secondAltaInput = buildAltaHashInput({
  idEmisorFactura: "89890001K",
  numSerieFactura: "12345679/G34",
  fechaExpedicionFactura: "01-01-2024",
  tipoFactura: "F1",
  cuotaTotal: "12.35",
  importeTotal: "123.45",
  previousHash: "3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60",
  fechaHoraHusoGenRegistro: "2024-01-01T19:20:35+01:00",
});

assert.equal(
  buildHash(secondAltaInput),
  "F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97",
);

const anulacionInput = buildAnulacionHashInput({
  idEmisorFacturaAnulada: "89890001K",
  numSerieFacturaAnulada: "12345679/G34",
  fechaExpedicionFacturaAnulada: "01-01-2024",
  previousHash: "F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97",
  fechaHoraHusoGenRegistro: "2024-01-01T19:20:40+01:00",
});

assert.equal(
  buildHash(anulacionInput),
  "177547C0D57AC74748561D054A9CEC14B4C4EA23D1BEFD6F2E69E3A388F90C68",
);

assert.equal(
  buildQrUrl("89890001K", "12345678&G33", "2024-01-01", 241.4, "sandbox"),
  "https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=89890001K&numserie=12345678%26G33&fecha=01-01-2024&importe=241.40",
);

assert.equal(
  buildQrUrl("89890001K", "12345678-G33", "01-09-2024", 241.4, "production"),
  "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?nif=89890001K&numserie=12345678-G33&fecha=01-09-2024&importe=241.40",
);

console.log("VERI*FACTU core tests passed");
