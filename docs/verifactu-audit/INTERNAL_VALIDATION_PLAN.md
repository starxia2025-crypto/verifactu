# INTERNAL_VALIDATION_PLAN - Pruebas internas SIF / VERI*FACTU

Fecha: 2026-04-11  
Objetivo: definir una verificacion reproducible para pasar de "parece implementado" a "esta evidenciado".

## Estado actual de pruebas

Resultado observado:

- No se localizaron tests automatizados relevantes (`*.test.*`, `*.spec.*`, `*.e2e.*`).
- El frontend ha llegado a pasar `pnpm --filter @workspace/verifactu run typecheck`.
- El backend falla actualmente `pnpm --filter @workspace/api-server run typecheck`.

Comandos base que deben quedar limpios antes de hablar de cumplimiento:

```powershell
pnpm install
pnpm run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/verifactu run typecheck
```

## A. Pruebas unitarias necesarias

### Hash / huella

- Genera hash con factura minima valida.
- Genera hash con factura con IVA multiple.
- Genera hash con factura rectificativa.
- Genera hash con registro de anulacion.
- Verifica que el orden/campos coinciden con especificacion oficial.
- Verifica que cambiar cualquier campo relevante cambia el hash.
- Verifica que `previousHash` se incorpora correctamente.
- Verifica con vectores reproducibles versionados.

Estado actual: `NO CUMPLE`, no hay tests.

### Numeracion

- Primera factura de una serie.
- Incremento correcto por obligado/serie/ejercicio.
- Dos series independientes.
- Dos obligados independientes.
- Concurrencia simulada para evitar duplicados.
- Fallo de emision y tratamiento de huecos.

Estado actual: `NO CUMPLE`, no hay tests.

### Bloqueo de edicion

- Factura `DRAFT` editable.
- Factura `EMITTED` no editable.
- Factura `CANCELLED` no editable.
- Factura `RECTIFIED` no editable.
- Edicion de lineas bloqueada tras emision.

Estado actual: `NO CUMPLE`, no hay tests.

### Anulacion

- Solo se puede anular factura emitida.
- Anulacion genera registro reglamentario independiente.
- Anulacion no borra registro de alta.
- Anulacion conserva razon, timestamp, usuario y hash.

Estado actual: `NO CUMPLE`, no hay tests.

### XML/XSD

- XML de alta valida contra XSD oficial.
- XML de anulacion valida contra XSD oficial.
- XML invalido falla localmente antes de enviar.
- Namespaces/versiones correctas.
- Regeneracion reproducible desde datos persistidos.

Estado actual: `NO CUMPLE`, XML es placeholder.

### Respuestas AEAT

- Parsear aceptada.
- Parsear aceptada con errores/subsanable si aplica.
- Parsear rechazada.
- Parsear error tecnico temporal.
- Persistir CSV/codigo/mensaje.
- No marcar enviado sin acuse valido.

Estado actual: `PARCIAL`, campos existen pero no parser real.

### QR

- Construir payload oficial.
- Codificar caracteres especiales.
- Fechas e importes en formato oficial.
- Generar imagen QR.
- Verificar URL sandbox/prod.

Estado actual: `PARCIAL`.

## B. Pruebas de integracion necesarias

- Crear factura borrador y verificar persistencia de cabecera y lineas.
- Emitir factura y verificar numero, estado, registro `ALTA`, hash, previousHash, XML y QR.
- Anular factura y verificar registro `ANULACION` independiente, cadena y evento.
- Intentar editar factura emitida desde API y esperar error.
- Intentar borrar factura emitida desde API y esperar error.
- Enviar a AEAT en modo test con certificado de pruebas/configuracion oficial.
- Simular fallo temporal AEAT, persistir intento y reintentar por cola.
- Simular rechazo AEAT y guardar codigo/mensaje sin marcar aceptada.
- Crear dos tenants y verificar que no se mezclan clientes, series, hashes ni facturas.
- Importar datos externos y verificar que queda auditado el origen.

Estado actual: `NO CUMPLE`, no hay suite de integracion.

## C. Pruebas E2E necesarias

- Login.
- Seleccion de organizacion y taxpayer.
- Crear cliente.
- Crear producto.
- Crear borrador.
- Emitir factura.
- Ver factura emitida no editable.
- Descargar/visualizar PDF con QR.
- Ver estado fiscal: pendiente, aceptada, rechazada, error.
- Envio AEAT en test.
- Consulta de eventos.
- Cambio de idioma y placeholders.
- Flujo multiempresa: cambiar de taxpayer y comprobar aislamiento.

Estado actual: `NO CUMPLE`, no se evidencia Playwright/Cypress ni equivalente.

## D. Pruebas negativas necesarias

- Editar emitida.
- Borrar emitida.
- Borrar registro VERI*FACTU por API.
- Duplicar numero de factura.
- Romper `previousHash`.
- Enviar XML invalido.
- Enviar sin certificado.
- Enviar con certificado caducado.
- Usar tenant equivocado.
- Usar API key de otro taxpayer.
- Ejecutar integracion SQL no read-only.
- Acceder a endpoint administrativo sin permiso.
- Cambiar configuracion AEAT sin rol autorizado.

Estado actual: `NO CUMPLE`, no hay pruebas negativas.

## E. Pruebas operativas y documentales

- Restaurar backup y verificar conservacion de cadena.
- Exportar registros por periodo.
- Recalcular y verificar hash historico.
- Verificar migraciones en base limpia.
- Verificar despliegue EasyPanel con variables obligatorias.
- Verificar que faltan secretos provoca error de arranque, no fallback inseguro.
- Verificar rotacion de certificado.
- Verificar logs sin exponer secretos.
- Generar dossier de version: commit, version software, migraciones, XSD usado y checksums.

Estado actual: `NO CUMPLE` o `NO EVIDENCIADO`.

## Orden recomendado de implementacion de pruebas

1. Corregir typecheck backend.
2. Crear tests unitarios para hash, QR, numeracion y bloqueo de estado.
3. Integrar XSD oficial y tests XML.
4. Crear tests de integracion de emitir/anular/rectificar.
5. Crear parser de respuestas AEAT con fixtures.
6. Crear cola/reintentos con pruebas.
7. Crear E2E del flujo completo.
8. Preparar pruebas con entorno AEAT test.

## Criterio de salida para "preparado para pruebas oficiales"

El sistema solo deberia considerarse preparado para pruebas oficiales cuando:

- Typecheck y tests pasan.
- XML alta/anulacion valida contra XSD oficial.
- Hash tiene tests reproducibles.
- QR se verifica contra formato oficial.
- Cliente AEAT test envia y parsea respuesta real.
- Factura emitida no puede editarse ni borrarse desde API ni BD sin evento.
- Anulacion crea registro independiente.
- Multiempresa esta cubierta por pruebas negativas.
- Existe dossier documental de version.
