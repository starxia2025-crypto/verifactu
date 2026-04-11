# VeriFactu External API

Esta API permite que un ERP o sistema externo envíe datos a VeriFactu usando una clave API generada desde el panel web.

## Autenticación

Todas las peticiones protegidas usan:

```http
Authorization: Bearer TU_CLAVE_API
Content-Type: application/json
```

La clave API se crea desde `Integraciones -> Claves API para ERPs`. El token completo solo se muestra una vez.

## Health

```bash
curl https://TU_API/api/public/v1/health
```

## Crear o actualizar cliente

Si se envía `nif` y ya existe un cliente con ese NIF para el contribuyente, se actualiza.

```bash
curl -X POST https://TU_API/api/public/v1/clients \
  -H "Authorization: Bearer TU_CLAVE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cliente Demo S.L.",
    "nif": "B12345678",
    "nifType": "CIF",
    "email": "cliente@ejemplo.com",
    "country": "ES"
  }'
```

## Crear producto

```bash
curl -X POST https://TU_API/api/public/v1/products \
  -H "Authorization: Bearer TU_CLAVE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Servicio de consultoria",
    "description": "Servicio profesional mensual",
    "unitPrice": 250,
    "vatRate": 21,
    "unit": "ud"
  }'
```

## Crear factura

Por defecto se guarda como borrador. Si quieres emitir automáticamente, envía `emitImmediately: true` y crea la clave API con el permiso `invoices:emit`.

```bash
curl -X POST https://TU_API/api/public/v1/invoices \
  -H "Authorization: Bearer TU_CLAVE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "client": {
      "name": "Cliente Demo S.L.",
      "nif": "B12345678",
      "nifType": "CIF",
      "email": "cliente@ejemplo.com",
      "country": "ES"
    },
    "issueDate": "2026-04-11",
    "notes": "Factura enviada desde ERP externo",
    "emitImmediately": false,
    "lines": [
      {
        "description": "Servicio de consultoria",
        "quantity": 1,
        "unitPrice": 250,
        "vatRate": 21,
        "discount": 0
      }
    ]
  }'
```

## Seguridad recomendada

- Usa una clave distinta por cliente, ERP o entorno.
- Da permiso `invoices:emit` solo si el ERP debe poder emitir facturas directamente.
- Si no das `invoices:emit`, el ERP puede crear borradores y el usuario revisa/emite desde VeriFactu.
- Revoca claves que ya no se usen desde el panel.
- Usa siempre HTTPS en producción.
