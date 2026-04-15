# AEAT VERI*FACTU Official Artifacts

Downloaded at: 2026-04-15

Only official AEAT artifacts are used for the VERI*FACTU WSDL/XSD layer. The XMLDSig schema is included because it is imported by the official AEAT `SuministroInformacion.xsd`.

| Artifact | Local path | Official URL | SHA256 |
|---|---|---|---|
| SistemaFacturacion.wsdl | `tikeV1.0/cont/ws/SistemaFacturacion.wsdl` | https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SistemaFacturacion.wsdl | `05919120708ff7650612fa6683c9336eaf919335d9a4db10e86759190af48602` |
| SuministroInformacion.xsd | `tikeV1.0/cont/ws/SuministroInformacion.xsd` | https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroInformacion.xsd | `ee4c1655175644de44c4c25055ffeb8e5f4bb4bc3834ce8254d4222ef18c8aa1` |
| SuministroLR.xsd | `tikeV1.0/cont/ws/SuministroLR.xsd` | https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroLR.xsd | `26bacfc6229d1a314758753244219ba207b2dcc8e2a22f7ab60b8ab6bae877e1` |
| ConsultaLR.xsd | `tikeV1.0/cont/ws/ConsultaLR.xsd` | https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/ConsultaLR.xsd | `bf2cdb8fc4b95b291757a72b76d8fffca06a6d30d9329122ca2fd6b2d5f8f1b1` |
| RespuestaConsultaLR.xsd | `tikeV1.0/cont/ws/RespuestaConsultaLR.xsd` | https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/RespuestaConsultaLR.xsd | `de35063acb8d9ba0d6ae51acc6b595de9c2b12333250e95e13108ef5f2670d45` |
| RespuestaSuministro.xsd | `tikeV1.0/cont/ws/RespuestaSuministro.xsd` | https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/RespuestaSuministro.xsd | `82acf80f785643caac13087aae66808ed721a13f08ca5218cf8ae81b695549ef` |
| xmldsig-core-schema.xsd | `xmldsig/xmldsig-core-schema.xsd` | https://www.w3.org/TR/xmldsig-core/xmldsig-core-schema.xsd | `d102ad3df7664c307e0c2c776ba4a90513b1969974d8a940bae1a77f9f21e15d` |

## WSDL endpoints observed

The official WSDL declares these VERI*FACTU ports:

| Port | Endpoint |
|---|---|
| `SistemaVerifactu` | `https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP` |
| `SistemaVerifactuSello` | `https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP` |
| `SistemaVerifactuPruebas` | `https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP` |
| `SistemaVerifactuSelloPruebas` | `https://prewww10.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP` |

## Important namespace note

The artifact URLs include `tikeV1.0`, but the namespaces inside the official WSDL/XSD use `.../tike/cont/ws/...`. Keep the official namespaces unchanged.
