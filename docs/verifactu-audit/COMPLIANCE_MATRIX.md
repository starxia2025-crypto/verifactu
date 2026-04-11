# COMPLIANCE_MATRIX - SIF / VERI*FACTU

Fecha: 2026-04-11  
Criterio: solo se marca `CUMPLE` cuando existe evidencia concreta suficiente en codigo, esquema, configuracion y/o tests. La existencia de un campo `hash`, un QR o un XML no implica cumplimiento por si sola.

Estados usados:

- `CUMPLE`: evidencia suficiente.
- `PARCIAL`: existe implementacion parcial, incompleta o sin pruebas suficientes.
- `NO CUMPLE`: falta el mecanismo requerido o existe evidencia de placeholder/no funcional.
- `NO EVIDENCIADO`: no se puede verificar concluyentemente en el repositorio.

## Matriz

| ID | Fuente oficial | Requisito | Estado | Evidencia en repositorio | Riesgo si falta | Accion minima necesaria |
|---|---|---|---|---|---|---|
| L11-01 | Ley 11/2021 | Evitar software que permita alteracion, supresion u ocultacion no trazada de registros de facturacion. | PARCIAL | Backend bloquea editar/borrar si `status !== DRAFT` en `artifacts/api-server/src/routes/invoices.ts`. | Manipulacion por acceso directo a BD o rutas no cubiertas. | Controles en BD, auditoria append-only y pruebas negativas. |
| L11-02 | Ley 11/2021 | Garantizar integridad, conservacion, accesibilidad, legibilidad, trazabilidad e inalterabilidad. | PARCIAL | Tablas de facturas, registros VERI*FACTU y auditoria existen en `lib/db/src/schema`. | No poder defender historico completo ante revision. | Implementar evento reglamentario, exportacion, validacion, logs completos y retencion. |
| L11-03 | Ley 11/2021 | Evitar doble uso o manipulacion opaca. | NO EVIDENCIADO | No se evidencia mecanismo anti-tamper global, sellado de eventos, control de version de software ni declaracion responsable. | Riesgo de considerarse software manipulable. | Catalogo de eventos, sellado, hash oficial, controles administrativos y documentacion. |
| L11-04 | Ley 11/2021 | Conservar registros accesibles y legibles. | PARCIAL | Persistencia en PostgreSQL y HTML de factura en ruta `/pdf`. | Datos no exportables o no verificables en formato oficial. | Exportacion reglamentaria, almacenamiento payload XML validado, procedimiento de conservacion. |
| RD-01 | RD 1007/2023 | Existencia de SIF para expedicion de facturas. | PARCIAL | API y UI gestionan facturas, clientes, productos y organizaciones. | Sistema funcional pero no necesariamente SIF conforme. | Completar requisitos reglamentarios, no solo negocio. |
| RD-02 | RD 1007/2023 | Registro de facturacion de alta. | PARCIAL | `verifactuRecordsTable.recordType`; creacion `ALTA` en `emit` y `emitImmediately`. | Alta incompleta o no conforme. | Ajustar contenido exacto a Orden/XSD y conservar XML validado. |
| RD-03 | RD 1007/2023 | Registro de anulacion. | PARCIAL | Ruta `POST /invoices/:id/cancel` intenta crear `ANULACION`. | Anulaciones sin registro reglamentario correcto. | Separar registros por tipo y revisar restriccion unique por `invoiceId`. |
| RD-04 | RD 1007/2023 | Encadenamiento de registros. | PARCIAL | `previousHash` y busqueda de ultimo registro por `taxpayerId` en `verifactu.ts`. | Cadena rompible o no oficial. | Implementar algoritmo oficial, orden estable, concurrencia y tests con vectores. |
| RD-05 | RD 1007/2023 | Inalterabilidad de registros. | PARCIAL | Bloqueo en rutas para facturas emitidas. Sin triggers o append-only. | Alteracion directa en BD. | Triggers, constraints, politicas append-only y auditoria inmutable. |
| RD-06 | RD 1007/2023 | Trazabilidad de operaciones y eventos. | NO CUMPLE | `auditLogsTable` existe pero no se evidencia uso sistematico en emitir/anular/editar/configurar. | Imposibilidad de reconstruir historial. | Registrar eventos de usuario, sistema, errores AEAT, cambios de configuracion y anulaciones. |
| RD-07 | RD 1007/2023 | Numeracion y series controladas. | PARCIAL | `invoiceSeriesTable.currentNumber`, `seriesId`, generacion en `routes/invoices.ts`. | Duplicados o huecos por concurrencia. | Unicos por taxpayer/serie/numero, transacciones, locks y tests concurrentes. |
| RD-08 | RD 1007/2023 | Identificacion del sistema informatico. | PARCIAL | `sifProductCode`, `sifInstallationNumber`, `SistemaInformatico=VeriFactuSaaS-v1.0`. | Identificacion incompleta del productor/version. | Parametrizar productor, version, instalacion y evidenciarlo en XML/PDF/eventos. |
| RD-09 | RD 1007/2023 | Remision VERI*FACTU si se opta por modalidad verificable. | NO CUMPLE | `submitToAeat` es placeholder y devuelve error `TODO`. | No hay remision real a AEAT. | Cliente SOAP/XML real, certificados, entornos test/prod, acuses y reintentos. |
| HAC-01 | Orden HAC/1177/2024 | Estructura oficial XML de alta. | NO CUMPLE | XML builder contiene comentarios `placeholder` y `TBD`. | Rechazo AEAT y no conformidad tecnica. | Usar XSD oficial, namespaces y validacion local. |
| HAC-02 | Orden HAC/1177/2024 | Estructura oficial XML de anulacion. | NO CUMPLE | Misma construccion placeholder; no se evidencia XML especifico de anulacion oficial. | Anulaciones invalidas. | Implementar XML anulacion oficial y tests. |
| HAC-03 | Orden HAC/1177/2024 | Huella/hash conforme a campos y orden oficiales. | PARCIAL | SHA-256 y entrada concatenada en `buildHashInput`. Sin validacion oficial ni test vector. | Hash no aceptado o cadena no defendible. | Implementar especificacion exacta y test vectors oficiales/propios reproducibles. |
| HAC-04 | Orden HAC/1177/2024 | Encadenamiento independiente por obligado tributario. | PARCIAL | Ultimo registro filtrado por `taxpayerId`. | Mezcla por series, rectificaciones, anulaciones o concurrencia. | Definir cadena por NIF/obligado segun especificacion y bloquear concurrencia. |
| HAC-05 | Orden HAC/1177/2024 | Codigo QR reglamentario. | PARCIAL | `buildQrUrl` genera URL con `nif`, `numserie`, `fecha`, `importe`. | QR incompleto o no conforme. | Verificar parametros exactos oficiales, codificacion y pruebas de cotejo AEAT. |
| HAC-06 | Orden HAC/1177/2024 | Texto reglamentario en factura verificable. | PARCIAL | HTML `/pdf` incluye texto de factura verificable. | Texto incorrecto o ausencia en PDF real. | Ajustar literal oficial y validar PDF final. |
| HAC-07 | Orden HAC/1177/2024 | Registro de eventos del sistema. | NO CUMPLE | Tabla de auditoria existe, pero no catalogo ni eventos reglamentarios. | Falta de trazabilidad reglamentaria. | Catalogo de eventos y persistencia inmutable. |
| HAC-08 | Orden HAC/1177/2024 | Exportabilidad, legibilidad e interoperabilidad. | NO EVIDENCIADO | No se localiza export oficial por periodo ni generador de libro/registros. | No atender requerimientos de administracion. | Implementar exportacion oficial y procedimiento operativo. |
| HAC-09 | Orden HAC/1177/2024 | Identificacion productor/version/software. | PARCIAL | Valores parciales; XML usa `TODO_NIF_FABRICANTE`. | Declaracion responsable incompleta. | Definir datos reales de productor/version y usarlos en registros. |
| HAC-10 | Orden HAC/1177/2024 | Validaciones tecnicas previas. | NO CUMPLE | No hay validacion XSD ni suite de validaciones AEAT. | Rechazo tecnico masivo. | Integrar validadores XSD y reglas previas. |
| AEAT-01 | AEAT tecnica | Cliente basado en WSDL oficial. | NO CUMPLE | `submitToAeat` declara que falta WSDL/certificado. | No hay envio real. | Generar cliente SOAP desde WSDL oficial. |
| AEAT-02 | AEAT tecnica | XML ajustado a XSD oficial y validado localmente. | NO CUMPLE | No se evidencia XSD ni validador. | Rechazo por esquema. | Incluir XSD oficial versionado y validacion automatica. |
| AEAT-03 | AEAT tecnica | Manejo de respuestas, CSV, errores y estados. | PARCIAL | Campos `aeatResponse`, `aeatCsv`, `aeatErrorCode`, `aeatErrorMessage`; placeholder guarda error TODO. | Estados incorrectos o facturas marcadas indebidamente. | Parser real de respuestas AEAT y modelo de estados cerrado. |
| AEAT-04 | AEAT tecnica | Entorno pruebas/produccion configurable. | PARCIAL | `aeatEnvironment` en taxpayer y URLs sandbox/prod para QR. | Mezclar pruebas y produccion. | Configurar endpoints oficiales SOAP por entorno. |
| AEAT-05 | AEAT tecnica | Certificado electronico/firma si aplica. | NO CUMPLE | Comentario TODO en `submitToAeat`; no se evidencia gestion de certificado. | Imposibilidad de autenticacion/remision. | Almacen seguro de certificado, firma/autenticacion y rotacion. |
| AEAT-06 | AEAT tecnica | Reintentos y control de errores. | PARCIAL | `retryCount` existe, pero no se evidencia cola/worker. | Perdida o duplicidad de envios. | Cola idempotente, backoff, bloqueo y persistencia de intentos. |
| SEC-01 | Seguridad | Secretos no hardcodeados. | NO CUMPLE | `SESSION_SECRET ?? "fallback-secret-change-me"` en `auth.ts`. | Sesiones vulnerables si falta variable. | Fallar arranque si falta secreto fuerte. |
| SEC-02 | Seguridad | Control de permisos por rol. | PARCIAL | Membresias con rol; acceso por usuario/taxpayer en varias rutas. | Usuarios pueden emitir/anular sin autorizacion fina. | RBAC por accion y auditoria administrativa. |
| TEN-01 | Multiempresa | Aislamiento de datos por tenant/obligado. | PARCIAL | Uso general de `taxpayerId`. | Fuga o contaminacion entre clientes. | Tests multiempresa negativos y constraints. |
| TEN-02 | Multiempresa | Configuracion AEAT independiente por tenant. | PARCIAL | `taxpayerProfiles.aeatEnvironment`, `sifInstallationNumber`, `sifProductCode`. | Usar credenciales/configuracion incorrecta. | Certificados/config completa por obligado/tenant. |
| TEST-01 | Pruebas | Tests unitarios, integracion y e2e de cumplimiento. | NO CUMPLE | No se localizan tests automatizados relevantes. | Cumplimiento no demostrable. | Crear suite reproducible. |
| BUILD-01 | Calidad | Typecheck backend limpio. | NO CUMPLE | `pnpm --filter @workspace/api-server run typecheck` falla actualmente. | Deploy no fiable y cambios no verificables. | Corregir errores TypeScript antes de certificar. |
| DEP-01 | Operacion | Migraciones controladas. | PARCIAL | Docker ejecuta `drizzle push` al arranque. | Cambios de esquema no auditables. | Migraciones versionadas, rollback y procedimiento. |
| DOC-01 | Documentacion | Manual tecnico/operativo y base documental. | PARCIAL | `DEPLOY_EASYPANEL.md`, `EXTERNAL_API.md`; no hay dossier SIF completo previo. | Dificultad ante revision. | Completar documentacion de cumplimiento, pruebas y operacion. |

## Resultado global de matriz

No hay evidencia suficiente para afirmar cumplimiento completo de Ley 11/2021, RD 1007/2023, Orden HAC/1177/2024 ni documentacion tecnica AEAT.

El proyecto esta bien encaminado como aplicacion de facturacion y prototipo SIF, pero actualmente tiene implementaciones parciales y placeholders en los puntos mas criticos: XML oficial, WSDL AEAT, certificado, hash conforme, validacion XSD, registro de eventos, cola de reintentos y pruebas automatizadas.
