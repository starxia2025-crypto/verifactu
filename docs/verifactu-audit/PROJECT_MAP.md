# PROJECT_MAP - Auditoria SIF / VERI*FACTU

Fecha de auditoria: 2026-04-11  
Repositorio auditado: `D:\Starxia\verifactu`  
Alcance: inspeccion estatica del repositorio actual. No se han modificado ficheros de aplicacion.

## Fuentes oficiales usadas como referencia

- AEAT - Sistemas Informaticos de Facturacion y VERI*FACTU: https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html
- AEAT - Servicios VERI*FACTU disponibles, remision y cotejo QR: https://sede.agenciatributaria.gob.es/Sede/todas-noticias/2025/abril/30/servicios-verifactu-disponibles.html
- BOE - Ley 11/2021: https://www.boe.es/buscar/act.php?id=BOE-A-2021-11473
- BOE - Real Decreto 1007/2023: https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840
- BOE - Orden HAC/1177/2024: https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138

## Arquitectura detectada

El proyecto es un monorepo `pnpm` con tres areas principales:

- Frontend web: `artifacts/verifactu`, aplicacion React/Vite.
- Backend API: `artifacts/api-server`, servidor Node/Express.
- Base de datos compartida: `lib/db`, esquemas Drizzle/PostgreSQL.

Ficheros de despliegue relevantes:

- `Dockerfile.api`: construye backend y ejecuta `pnpm --filter @workspace/db run push` antes de iniciar la API.
- `Dockerfile.web`: construye frontend y sirve estaticos con nginx.
- `DEPLOY_EASYPANEL.md`: documentacion de despliegue en EasyPanel.
- `EXTERNAL_API.md`: documentacion de una API externa para integraciones ERP.

## Stack tecnico

- Lenguaje: TypeScript.
- Backend: Express, Drizzle ORM, PostgreSQL.
- Frontend: React, Vite, CSS propio.
- Monorepo: pnpm workspaces.
- Autenticacion: sesiones/cookies y utilidades propias en `artifacts/api-server/src/lib/auth.ts`.
- Integraciones externas: conectores configurables en backend para PostgreSQL, MySQL, SQL Server, DBF, Excel y CSV.

## Modulos de facturacion localizados

- Rutas principales: `artifacts/api-server/src/routes/invoices.ts`.
- Logica VERI*FACTU: `artifacts/api-server/src/lib/verifactu.ts`.
- Esquema de facturas: `lib/db/src/schema/invoices.ts`.
- Esquema de registros VERI*FACTU: `lib/db/src/schema/verifactu.ts`.
- Series: `lib/db/src/schema/series.ts`.
- Contribuyentes/obligados: `lib/db/src/schema/taxpayers.ts`.
- Organizaciones y membresias: `lib/db/src/schema/organizations.ts`.
- Logs de auditoria: `lib/db/src/schema/audit.ts`.
- API keys: `lib/db/src/schema/api-keys.ts`.
- Fuentes de integracion: `lib/db/src/schema/integration-sources.ts`.

## Modelos/tablas implicadas

### Facturas

`invoicesTable` contiene, entre otros:

- `taxpayerId`, `seriesId`, `clientId`
- `invoiceNumber`
- `invoiceType`
- `status`
- `issueDate`, `dueDate`
- importes `subtotal`, `vatTotal`, `total`
- `originSource`
- `rectifiedInvoiceId`
- `cancellationReason`
- `createdAt`, `updatedAt`

`invoiceLinesTable` contiene lineas de factura, importes, IVA, descuentos y referencia opcional a producto.

### Registros VERI*FACTU

`verifactuRecordsTable` contiene:

- `invoiceId` con restriccion `unique`
- `taxpayerId`
- `recordType` (`ALTA` por defecto)
- `status` (`PENDING` por defecto)
- `hash`, `previousHash`
- `qrUrl`
- `xmlPayload`
- `submittedAt`
- `aeatResponse`, `aeatCsv`, `aeatErrorCode`, `aeatErrorMessage`
- `retryCount`
- timestamps

### Auditoria

`auditLogsTable` existe con:

- `userId`, `taxpayerId`
- `action`, `entityType`, `entityId`
- `description`, `metadata`
- `createdAt`

No se ha evidenciado un uso sistematico de esta tabla en todos los flujos criticos de facturacion.

## Flujo actual de factura

### Crear borrador

`POST /taxpayers/:taxpayerId/invoices` crea factura en estado `DRAFT` y sus lineas. Si se recibe `emitImmediately`, intenta emitirla en el mismo flujo.

### Editar borrador

`PATCH /invoices/:id` permite editar solo si `status === "DRAFT"`. Si se editan lineas, borra lineas anteriores y crea nuevas.

### Borrar borrador

`DELETE /invoices/:id` permite borrar solo si `status === "DRAFT"`.

### Emitir

`POST /invoices/:id/emit`:

- comprueba que la factura esta en `DRAFT`
- asigna numero usando serie o fallback
- cambia estado a `EMITTED`
- crea registro `ALTA` si no existe
- llama a `registerAeatAttempt`

### Anular

`POST /invoices/:id/cancel`:

- exige factura `EMITTED`
- marca factura como `CANCELLED`
- crea registro `ANULACION`

La tabla `verifactuRecordsTable` define `invoiceId` como unico, lo que entra en tension con tener un registro de alta y otro de anulacion para la misma factura. Esto es un falso cumplimiento aparente y debe revisarse.

### Rectificar

`POST /invoices/:id/rectify` crea una nueva factura en borrador ligada por `rectifiedInvoiceId` y marca la original como `RECTIFIED`.

## Modo borrador / emitida / anulada

Existe control de estados en backend:

- `DRAFT`
- `EMITTED`
- `CANCELLED`
- `RECTIFIED`

El bloqueo de edicion/borrado de emitidas se implementa en rutas backend, pero no se evidencian triggers o restricciones equivalentes en base de datos.

## Multiempresa / multitenant

El modelo usa:

- `organizations`
- `organizationMemberships`
- `taxpayerProfiles`
- `taxpayerId` en facturas, series, registros VERI*FACTU y fuentes de integracion

Hay aislamiento por `taxpayerId` en muchas consultas. El encadenamiento hash busca el ultimo registro por `taxpayerId`. No se evidencia una politica completa de permisos por rol para emitir, anular o configurar.

## Generacion de PDF

`GET /invoices/:id/pdf` devuelve HTML con apariencia de factura. El propio codigo lo identifica como placeholder HTML, no como generacion PDF robusta. Incluye texto de factura verificable, tabla de lineas y datos de QR si existen.

Estado: `PARCIAL`.

## Integracion AEAT

`artifacts/api-server/src/lib/verifactu.ts` contiene:

- generacion de hash SHA-256
- construccion de URL QR
- construccion de XML placeholder
- funcion `submitToAeat` placeholder

El codigo incluye comentarios explicitos:

- `Build XML placeholder (SOAP/WSDL spec TBD from AEAT documentation)`
- `This XML structure is a placeholder. The final WSDL/XSD spec from AEAT must be used.`
- `AEAT SOAP client placeholder`
- `TODO: Implement actual SOAP call with qualified electronic certificate`

Conclusion: no existe cliente AEAT real evidenciado, ni WSDL/XSD oficial integrado, ni certificado/firma funcional.

## Tests y cobertura aparente

No se han localizado tests automatizados `*.test.*`, `*.spec.*`, `*.e2e.*`, `playwright.config.*` en `artifacts`, `lib` o `scripts`.

Comandos revisados:

- `pnpm --filter @workspace/verifactu run typecheck`: previamente verificado como correcto durante el trabajo reciente.
- `pnpm --filter @workspace/api-server run typecheck`: falla actualmente por errores TypeScript, incluyendo exports ausentes de `@workspace/api-zod`, incompatibilidades Drizzle y export de `apiKeysTable`.

Estado de pruebas: `NO CUMPLE` para evidencia automatizada de cumplimiento SIF/VERI*FACTU.
