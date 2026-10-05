# Control de clientes — D&L Hnos. Lozano

Tablero de gestión de D&L Hnos. Lozano (una sola página HTML con JavaScript, publicada como Artifact de Claude).

Módulos: Panel general, Clientes, Flujo de caja, Prospección (correo masivo desde Gmail), Cotizaciones (con PDF) y Productos.

## Estructura

- `src/partes/parte1.html` … `parte5.html`: código fuente dividido en 5 partes (se unen en orden).
- `assets/`: imágenes que usa la página. Deben estar estos 3 archivos: `logo_h.png` (logo horizontal), `logo_sym.png` (símbolo) y `dylia.jpg` (imagen de DYLIA).
- `build.py`: une las partes, incrusta las imágenes y genera `clientes-dl.html`.

## Pendiente de subir

Las 3 imágenes de `assets/` se suben aparte (desde GitHub: Add file → Upload files, dentro de la carpeta `assets`), porque la herramienta de carga solo admite texto.

## Cómo generar la página

```
python3 build.py
```

Resultado: `clientes-dl.html`, listo para publicar como Artifact.

## Notas

- Los datos (clientes, pagos, cotizaciones, contactos) viven en la base de datos del Artifact, no en este repositorio.
- El envío de correos requiere el conector de Gmail activo en la cuenta de Claude de quien envía.
