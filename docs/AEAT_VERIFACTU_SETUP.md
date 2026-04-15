# Configuracion AEAT VERI*FACTU

Este documento describe la configuracion tecnica para remitir registros VERI*FACTU a los servicios oficiales AEAT.

## Fuentes oficiales usadas

- Informacion tecnica AEAT SIF / VERI*FACTU: https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/informacion-tecnica.html
- WSDL oficial versionado en el repositorio: `artifacts/api-server/src/aeat/official/tikeV1.0/cont/ws/SistemaFacturacion.wsdl`
- Esquemas XSD oficiales versionados en el repositorio: `artifacts/api-server/src/aeat/official/tikeV1.0/cont/ws/`
- Relacion de artefactos, URL, fecha y SHA256: `artifacts/api-server/src/aeat/official/OFFICIAL_SOURCES.md`

## Endpoints del WSDL

El WSDL oficial define `RegFactuSistemaFacturacion` con `soapAction=""`.

- Pruebas VERI*FACTU: `https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP`
- Pruebas VERI*FACTU con certificado de sello: `https://prewww10.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP`
- Produccion VERI*FACTU: `https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP`
- Produccion VERI*FACTU con certificado de sello: `https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP`

## Variables de entorno

Obligatorias para generar XML oficial:

- `SIF_PRODUCER_NIF`: NIF del productor del software. Debe tener 9 caracteres segun `NIFType`.
- `SIF_PRODUCER_NAME`: nombre del productor. Por defecto `Starxia`.
- `SIF_SYSTEM_ID`: identificador del sistema informatico. Maximo 2 caracteres segun XSD. Por defecto `VF`.
- `SIF_SYSTEM_NAME`: nombre del sistema. Maximo 30 caracteres. Por defecto `VeriFactu SaaS`.
- `SIF_SYSTEM_VERSION`: version del sistema. Por defecto `1.0.0`.
- `SIF_INSTALLATION_NUMBER`: numero de instalacion si el obligado no tiene uno guardado.

Obligatorias para remitir a AEAT:

- `AEAT_ENABLE_SUBMISSION=true`: activa el envio real. Si no esta activo, el sistema no envia ni marca como aceptado.
- `AEAT_CERT_ENCRYPTION_KEY`: clave privada usada para cifrar la clave de los certificados subidos desde la aplicacion. Si no existe, se usa `SESSION_SECRET`.
- `AEAT_CERT_STORAGE_DIR`: ruta persistente donde el backend guarda los `.pfx/.p12` cifrando la clave por separado. En EasyPanel debe ser un volumen persistente.

Opcionales si quieres configurar un certificado global por variables de entorno en vez de usar el certificado de cada contribuyente:

- `AEAT_CERT_PATH`: ruta absoluta al certificado `.pfx/.p12` dentro del contenedor o servidor.
- `AEAT_CERT_PASSWORD`: clave del `.pfx/.p12`.

Opcionales:

- `AEAT_ENDPOINT`: endpoint manual. Normalmente no debe usarse salvo pruebas controladas.
- `AEAT_USE_SEAL_CERTIFICATE_ENDPOINT=true`: usa el endpoint de certificado de sello.
- `AEAT_TIMEOUT_MS`: timeout HTTP en milisegundos. Por defecto `30000`.
- `AEAT_TLS_REJECT_UNAUTHORIZED=false`: solo para diagnostico local. No usar en produccion.

## Comando de prueba SOAP con fixture

Este comando construye un XML `RegistroAlta`, lo valida contra XSD oficial, lo envuelve en SOAP y lo remite al endpoint de pruebas o produccion segun entorno.

```powershell
$env:AEAT_ENVIRONMENT="sandbox"
$env:AEAT_CERT_PATH="C:\ruta\certificado.pfx"
$env:AEAT_CERT_PASSWORD="clave"
$env:AEAT_TEST_TAXPAYER_NIF="B87654321"
$env:AEAT_TEST_TAXPAYER_NAME="Empresa Demo SL"
$env:SIF_PRODUCER_NIF="B12345678"
pnpm --filter @workspace/scripts aeat:submit-fixture
```

En Linux/EasyPanel:

```bash
AEAT_ENVIRONMENT=sandbox \
AEAT_CERT_PATH=/run/secrets/cliente.pfx \
AEAT_CERT_PASSWORD='clave' \
AEAT_TEST_TAXPAYER_NIF=B87654321 \
AEAT_TEST_TAXPAYER_NAME='Empresa Demo SL' \
SIF_PRODUCER_NIF=B12345678 \
pnpm --filter @workspace/scripts aeat:submit-fixture
```

## Estados persistidos

El sistema no marca una remision como aceptada sin respuesta interpretable de AEAT.

- `ACCEPTED`: `EstadoRegistro=Correcto` o envio correcto sin linea de error.
- `ACCEPTED_WITH_ERRORS`: `EstadoRegistro=AceptadoConErrores` o `EstadoEnvio=ParcialmenteCorrecto`.
- `REJECTED`: `EstadoRegistro=Incorrecto` o `EstadoEnvio=Incorrecto`.
- `ERROR`: fallo SOAP, transporte, timeout, certificado ausente, XML invalido o respuesta no interpretable.

## Limites actuales

- El envio SOAP real ya esta implementado, pero debe probarse con un certificado real valido de cliente/productor/representante autorizado.
- La carga de certificados `.pfx/.p12` desde la interfaz esta disponible en `Configuracion > Certificado AEAT` dentro del emisor/taxpayer.
- La gestion global para gestorias esta disponible en `Gestoria > Certificados AEAT`. La vista agregada administra certificados, pero el certificado sigue perteneciendo al emisor/taxpayer.
- El formato `.cer` se rechaza expresamente porque no incorpora la clave privada necesaria para firmar/autenticarse. El flujo principal es certificado del emisor cargado en backend. El certificado de sello queda como opcion secundaria mediante `Usar endpoint de certificado de sello`.
- Los certificados se guardan en `AEAT_CERT_STORAGE_DIR` o, por defecto, en `storage/aeat-certificates` dentro del contenedor. En EasyPanel conviene montar esta ruta como volumen persistente.
- Debes ejecutar la migracion `lib/db/sql/003_aeat_certificates.sql` en la base de datos antes de usar la pantalla de certificados.
- El comando de fixture es una prueba tecnica de transporte y parser. La prueba completa con factura real de base de datos debe ejecutarse desde el flujo de emision de factura o con un script E2E especifico por tenant.
