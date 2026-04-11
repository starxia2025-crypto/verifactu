# IMPLEMENTATION_PROGRESS - Cambios aplicados tras auditoria

Fecha: 2026-04-11

Este documento resume la primera tanda de correcciones aplicadas despues de la auditoria inicial. No sustituye una certificacion SIF/VERI*FACTU ni una prueba oficial AEAT.

## Cambios implementados

- Huella/hash separada en `artifacts/api-server/src/lib/verifactu-core.ts`.
- Algoritmo SHA-256 con cadenas oficiales para:
  - registro de alta
  - registro de anulacion
  - evento interno SIF
- Tests con los tres vectores oficiales de AEAT para huella:
  - primer registro de alta
  - segundo registro de alta encadenado
  - registro de anulacion encadenado
- URL QR ajustada a:
  - entorno de pruebas `https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR`
  - entorno de produccion `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR`
  - fecha en formato `DD-MM-YYYY`
  - parametros oficiales `nif`, `numserie`, `fecha`, `importe`
- Eliminada la restriccion logica de un solo registro VERI*FACTU por factura.
- Nuevo `chainSequence` por taxpayer para cadena de registros.
- Nuevo almacenamiento de `hashInput`, `hashAlgorithm` y `generatedAt`.
- Nuevas tablas:
  - `sif_events`
  - `aeat_submissions`
- Eventos fiscales encadenados en los flujos principales de factura.
- Intentos AEAT persistidos separadamente de los registros fiscales.
- Estados AEAT ya no se marcan como aceptados sin acuse valido.
- Endurecimiento de `SESSION_SECRET` en produccion.
- Password hashing nuevo con PBKDF2-SHA256, manteniendo compatibilidad con hashes antiguos.
- SQL opcional de triggers de inmutabilidad en `lib/db/sql/001_sif_immutability.sql`.
- Typecheck completo del workspace pasando.

## Cambios que siguen pendientes

- Cliente SOAP/WSDL AEAT real.
- Firma/autenticacion con certificado electronico.
- Validacion XML contra XSD oficial.
- Parser completo de todas las respuestas y errores AEAT.
- Worker/cola real de reintentos.
- Aplicacion automatica del SQL de inmutabilidad en despliegue.
- Tests de integracion y E2E.
- Generacion PDF real con QR grafico ISO/IEC 18004:2015 nivel M.
- Dossier de declaracion responsable del productor.

## Comandos verificados

```powershell
pnpm --filter @workspace/scripts run test:verifactu
pnpm run typecheck
```
