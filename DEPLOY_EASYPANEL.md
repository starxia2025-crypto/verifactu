# Deploy en Easypanel

Este repositorio queda preparado para desplegarse en Easypanel con tres servicios:

- `verifactu-web`
- `verifactu-api`
- `verifactu-db`

## Dockerfiles

- `Dockerfile.web`: construye el frontend `artifacts/verifactu` y lo sirve con Nginx.
- `Dockerfile.api`: construye el backend `artifacts/api-server` y lo ejecuta con Node.js.

## Servicio `verifactu-web`

Usa:

- Dockerfile: `Dockerfile.web`
- Puerto interno: `80`

Variable recomendada:

- `API_BASE_URL=https://api.tu-dominio.com`

Si vas a publicar web y api bajo el mismo dominio y enrutar `/api` hacia el backend, puedes dejar `API_BASE_URL` vacio.

## Servicio `verifactu-api`

Usa:

- Dockerfile: `Dockerfile.api`
- Puerto interno: `8080`

Variables minimas:

- `PORT=8080`
- `NODE_ENV=production`
- `DATABASE_URL=postgresql://usuario:password@verifactu-db:5432/verifactu`
- `SESSION_SECRET=pon-aqui-un-secreto-largo-y-unico`
- `LOG_LEVEL=info`

## Notas

- El frontend soporta configuracion runtime mediante `API_BASE_URL`, asi no necesitas reconstruir la imagen para cambiar la URL del backend.
- El backend requiere que `DATABASE_URL` exista al arrancar.
- La integracion real con AEAT sigue siendo parcial en el codigo actual; estos Dockerfiles preparan el despliegue de la app tal como esta hoy.
