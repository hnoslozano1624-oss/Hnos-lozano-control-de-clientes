# Control de clientes · D&L Hnos. Lozano

Tablero interno (clientes, tareas, cobros, flujo de caja, cotizaciones, productos y prospección por correo) que se publica en Cloudflare con datos en D1.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `src/partes/parte1..5.html` | Código fuente del tablero (una sola página, dividida en 5 partes) |
| `src/shim.js` | Conecta el tablero con la API del Worker cuando corre en Cloudflare |
| `worker/index.js` | API del Worker: D1, archivos, ingreso con usuario y contraseña y envío con Resend |
| `build.mjs` | Une las partes, incrusta las imágenes y genera `dist/index.html` |
| `wrangler.jsonc` | Configuración del Worker `hnos-lozano-control-de-clientes` y de la base D1 |
| `assets/` | `logo_h.png`, `logo_sym.png`, `dylia.jpg` (subir manualmente; sin ellas el tablero compila, pero sin logos) |

## Despliegue

Cloudflare compila solo con cada cambio en `main` (Workers Builds). El comando de compilación es `node build.mjs` y el de despliegue `npx wrangler deploy`.

## Acceso al tablero

El tablero pide usuario y contraseña. Los usuarios se definen en una sola variable secreta del Worker (Settings → Variables and Secrets), con el nombre `USUARIOS` y este formato:

```
laura:SuClaveLarga1;diego:OtraClaveLarga2
```

Sin la variable `USUARIOS` el Worker no entrega ningún dato. Tras 8 intentos fallidos desde la misma conexión, el ingreso se bloquea 15 minutos. La sesión dura 14 días; cambiar `USUARIOS` cierra todas las sesiones.

## Otras variables del Worker

| Nombre | Tipo | Uso |
| --- | --- | --- |
| `USUARIOS` | Secreto | Usuarios y contraseñas (ver arriba) |
| `RESEND_API_KEY` | Secreto | Clave de Resend para enviar correos |
| `RESEND_FROM` | Texto | Remitente verificado, p. ej. `D&L <hola@midominio.com>` |
| `REPLY_TO` | Texto (opcional) | Correo al que llegan respuestas y bajas |

## Compilar localmente

```
node build.mjs            # versión Cloudflare -> dist/index.html
node build.mjs artifact   # versión para claude.ai -> dist/artifact.html
```

## Límites conocidos

- Archivos de soporte: hasta 1,4 MB cada uno (se guardan dentro de D1; las imágenes se reducen solas).
- Resend (plan gratuito): unos 100 correos por día.
- El repositorio es público: no guarde claves ni datos de clientes en él.
