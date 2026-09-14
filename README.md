# Apuntes — v1

PWA local para iPhone, sin cuentas ni servidor de datos.

## Archivos
- index.html
- styles.css
- app.js
- manifest.json
- sw.js
- icon-192.png
- icon-512.png

## Datos
Los apuntes se guardan en IndexedDB del navegador.
Exportar crea un JSON. Importar recupera esos registros.

## Publicación
Sube los 7 archivos a la raíz del repositorio/hosting que uses para la PWA.
Debe servirse por HTTPS para que el Service Worker funcione correctamente.
