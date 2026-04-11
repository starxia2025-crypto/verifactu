# AUDIT_REPORT - Auditoria tecnico-juridica SIF / VERI*FACTU

Fecha: 2026-04-11  
Conclusion tecnica preliminar: el sistema no esta aun en condiciones de afirmarse conforme a SIF/VERI*FACTU. Existen piezas utiles, pero faltan controles reglamentarios, integracion AEAT real, validacion oficial y pruebas.

## 1. Inmutabilidad

Estado: `PARCIAL`

Evidencias positivas:

- `PATCH /invoices/:id` solo permite modificar facturas en `DRAFT`.
- `DELETE /invoices/:id` solo permite borrar facturas en `DRAFT`.
- `POST /invoices/:id/cancel` exige factura `EMITTED`.

Debilidades:

- El bloqueo reside en backend, no en base de datos.
- No se evidencian triggers, constraints, append-only real ni bloqueo de actualizacion de registros reglamentarios.
- `verifactuRecordsTable` contiene datos criticos (`hash`, `previousHash`, `xmlPayload`, `aeatResponse`) pero no se evidencia inmutabilidad tecnica.
- La restriccion `unique` sobre `invoiceId` en `verifactuRecordsTable` parece incompatible con conservar registro de alta y registro de anulacion para una misma factura.

Dictamen: hay una barrera funcional, pero no basta para defender inalterabilidad reglamentaria.

## 2. Trazabilidad

Estado: `NO CUMPLE`

Evidencias positivas:

- Existe `auditLogsTable` con campos para usuario, obligado, accion, entidad, descripcion y metadata.
- Los registros VERI*FACTU guardan timestamps y respuesta AEAT parcial.

Debilidades:

- No se evidencia uso sistematico de `auditLogsTable` en crear, emitir, anular, rectificar, modificar configuracion, importar datos, gestionar API keys o enviar a AEAT.
- No hay catalogo de eventos reglamentarios.
- No se evidencia historico completo de cambios ni reconstruccion de linea temporal.
- No se registran de forma robusta intentos, reintentos, errores tecnicos, cambios de certificado o configuracion AEAT.

Dictamen: la tabla existe, pero la trazabilidad reglamentaria no esta implementada de forma demostrable.

## 3. Numeracion y series

Estado: `PARCIAL`

Evidencias positivas:

- Existe `invoiceSeriesTable` con `taxpayerId`, `prefix`, `currentNumber`, `year`, `isDefault`.
- El backend asigna numero al emitir.

Debilidades:

- No se evidencia constraint unico por obligado/serie/numero.
- No se evidencia transaccion/lock para evitar duplicados por concurrencia.
- No se evidencia politica de huecos, anulaciones o fallos de emision.
- El fallback de numeracion puede crear patrones no conformes si falta serie.

Dictamen: la numeracion existe, pero no esta protegida de forma suficiente.

## 4. Registros de facturacion

Estado: `PARCIAL`

Evidencias positivas:

- `verifactuRecordsTable` separa parcialmente la factura de negocio del registro fiscal.
- Se intenta crear `ALTA` al emitir y `ANULACION` al cancelar.
- Se persiste `xmlPayload`, `hash`, `previousHash`, `qrUrl`, respuesta y estado.

Debilidades:

- XML no oficial.
- La restriccion unica por factura puede impedir multiples registros reglamentarios.
- No se evidencia contenido minimo completo exigido por Orden HAC/1177/2024.
- No se evidencia conservacion append-only.
- No se evidencia que el registro se preserve correctamente si falla la remision AEAT.

Dictamen: hay una estructura prometedora, pero no suficiente para cumplimiento.

## 5. Encadenamiento / hash

Estado: `PARCIAL`

Evidencias positivas:

- `buildHash` usa SHA-256 y mayusculas.
- `buildHashInput` concatena campos de factura.
- `buildVeriFactuRecord` calcula `previousHash` buscando el ultimo registro por `taxpayerId`.

Debilidades:

- No se evidencia que el orden y campos coincidan con especificacion oficial.
- No hay test vectors.
- No se evidencia control de concurrencia para que dos altas simultaneas no tomen el mismo `previousHash`.
- No se evidencia verificador de cadena.
- No se evidencia tratamiento correcto para anulaciones y rectificaciones.

Dictamen: tener hash no equivale a cumplir. La implementacion es parcial y no demostrada.

## 6. XML / XSD

Estado: `NO CUMPLE`

Evidencia critica:

- El codigo declara que el XML es placeholder y que el WSDL/XSD final esta pendiente.
- No se localizan XSD oficiales versionados.
- No se localiza validacion local contra XSD.
- No se localizan fixtures XML ni snapshots.

Dictamen: no existe evidencia de XML reglamentario conforme.

## 7. QR y factura visual

Estado: `PARCIAL`

Evidencias positivas:

- `buildQrUrl` genera URL de cotejo con base sandbox/prod.
- La factura HTML incluye datos de QR y texto de factura verificable.

Debilidades:

- No se evidencia que el payload exacto sea el oficial definitivo.
- No se evidencia generacion real de imagen QR insertada en PDF final.
- La ruta `/pdf` devuelve HTML placeholder.
- No se evidencia reproducibilidad del PDF.
- No se evidencia validacion contra portal de cotejo AEAT.

Dictamen: hay base visual, pero no cumplimiento demostrable.

## 8. Integracion AEAT

Estado: `NO CUMPLE`

Evidencia critica:

- `submitToAeat` es placeholder.
- Devuelve error `TODO`.
- El codigo indica que faltan WSDL, endpoints reales y certificado.

Debilidades:

- No hay cliente SOAP/XML oficial.
- No hay firma/certificado funcional.
- No hay parser real de respuestas AEAT.
- No hay cola de reintentos.
- No hay prueba de conexion.
- No hay garantia de no marcar enviado sin acuse valido.

Dictamen: no hay integracion AEAT real todavia.

## 9. Seguridad

Estado: `PARCIAL`

Evidencias positivas:

- Hay sesiones, usuarios y membresias.
- Hay API keys para integraciones externas.
- Las fuentes de datos externas cifran password usando secreto de integracion o sesion.
- `assertReadOnlyQuery` limita consultas de integracion a `SELECT`.

Debilidades:

- `SESSION_SECRET` tiene fallback inseguro `fallback-secret-change-me`.
- No se evidencia hash de password resistente tipo Argon2/bcrypt/scrypt.
- No se evidencia RBAC fino para emitir, anular, importar o configurar AEAT.
- No se evidencia auditoria administrativa completa.
- No se evidencia gestion segura de certificados digitales.

Dictamen: seguridad funcional basica, insuficiente para entorno fiscal productivo.

## 10. Multiempresa / multitenant

Estado: `PARCIAL`

Evidencias positivas:

- `taxpayerId` aparece en facturas, series, registros, clientes, productos e integraciones.
- Las cadenas hash se buscan por `taxpayerId`.
- Existen organizaciones y membresias.

Debilidades:

- No hay tests negativos de contaminacion entre tenants.
- No se evidencia RBAC fino.
- No se evidencia configuracion AEAT/certificado independiente y completa por obligado tributario.
- No se evidencia que series, hashes y envios esten protegidos por constraints transaccionales.

Dictamen: el modelo multiempresa existe, pero no esta probado ni blindado.

## 11. Documentacion y operacion

Estado: `PARCIAL`

Evidencias positivas:

- Existen `DEPLOY_EASYPANEL.md` y `EXTERNAL_API.md`.
- Hay Dockerfiles para web y API.

Debilidades:

- No existia, antes de esta auditoria, matriz de cumplimiento SIF/VERI*FACTU.
- No se evidencia manual operativo.
- No se evidencia procedimiento de pruebas oficiales.
- No se evidencia base documental de declaracion responsable de productor.
- Docker API ejecuta `drizzle push` en arranque, que no equivale a migraciones auditables.

Dictamen: documentacion operativa basica, no suficiente para defensa de cumplimiento.

## Falsos cumplimientos aparentes detectados

- `hash` existe, pero no esta demostrado que sea la huella oficial.
- `qrUrl` existe, pero no esta demostrado que cumpla exactamente contenido y cotejo AEAT.
- `xmlPayload` existe, pero el codigo declara que es placeholder.
- `submitToAeat` existe, pero no envia realmente a AEAT.
- `auditLogsTable` existe, pero no se usa sistematicamente.
- Estado `EMITTED` existe, pero no implica remision aceptada por AEAT.
- HTML de factura existe, pero no equivale a PDF reglamentario reproducible.

## Dictamen tecnico-juridico

El proyecto tiene una buena base de producto SaaS de facturacion y una primera estructura para evolucionar hacia SIF/VERI*FACTU. Sin embargo, en su estado actual no puede considerarse conforme ni preparado para produccion fiscal.

El principal problema no es visual ni de navegacion: los bloqueadores estan en cumplimiento tecnico verificable. Faltan XML/XSD oficial, cliente WSDL AEAT, certificado/firma, hash conforme, eventos, inmutabilidad fuerte, migraciones auditables y suite de pruebas.
