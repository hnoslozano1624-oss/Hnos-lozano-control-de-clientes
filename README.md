# Control de clientes · D&L Hnos. Lozano

Tablero interno (clientes, tareas, cobros, flujo de caja, cotizaciones, productos y prospección por correo) que se publica en Cloudflare con datos en D1.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `src/partes/parte1..5.html` | Código fuente del tablero (una sola página, dividida en 5 partes) |
| `src/shim.js` | Conecta el tablero con la API del Worker cuando corre en Cloudflare |
| `worker/index.js` | API del Worker: D1, archivos, verificación de Cloudflare Access y envío con Resend |
| `build.mjs` | Une las partes, incrusta las imágenes y genera `dist/index.html` |
| `wrangler.jsonc` | Configuración del Worker `hnos-lozano-control-de-clientes` y de la base D1 |
| `assets/` | `logo_h.png`, `logo_sym.png`, `dylia.jpg` (subir manualmente; sin ellas el tablero compila, pero sin logos) |

## Despliegue

Cloudflare compila solo con cada cambio en `main` (Workers Builds). El comando de compilación es `node build.mjs` y el de despliegue `npx wrangler deploy`.

## Variables del Worker (Settings → Variables and Secrets)

| Nombre | Tipo | Uso |
| --- | --- | --- |
| `ACCESS_TEAM` | Texto | Dominio del equipo de Zero Trust (p. ej. `miempresa.cloudflareaccess.com`) |
| `ACCESS_AUD` | Texto | «Application Audience (AUD) Tag» de la aplicación de Access |
| `ALLOWED_EMAILS` | Texto | Correos autorizados, separados por coma |
| `RESEND_API_KEY` | Secreto | Clave de Resend |
| `RESEND_FROM` | Texto | Remitente verificado, p. ej. `D&L <hola@midominio.com>` |
| `REPLY_TO` | Texto (opcional) | Correo al que llegan respuestas y bajas |

Sin `ACCESS_TEAM` y `ACCESS_AUD` el Worker no entrega ningún dato (por seguridad).

## Compilar localmente

```
node build.mjs            # versión Cloudflare -> dist/index.html
node build.mjs artifact   # versión para claude.ai -> dist/artifact.html
```

## Límites conocidos

- Archivos de soporte: hasta 1,4 MB cada uno (se guardan dentro de D1; las imágenes se reducen solas).
- Resend (plan gratuito): unos 100 correos por día.
- El repositorio es público: no guarde claves ni datos de clientes en él.
