# workspace-platform-app

Aplicación web de Workspace Platform para organizar proyectos y recursos.

La versión actual incluye una portada y los espacios de Japan, Recetas y Personal Library. Usa HTML, CSS y Nginx, sin dependencias de compilación.

Se ha copiado desde [`web/` de gcp-infra-foundation](https://github.com/danielmarquisg/gcp-infra-foundation/tree/53184b83695399d9a6ed8157766eeb38fdb78ba2/web) para que la aplicación pueda evolucionar por separado de la infraestructura. Los archivos originales se conservan allí durante la transición.

## Probar en local

Desde la raíz del repositorio:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Abre [la portada](http://localhost:8080/) y visita los tres espacios. Cada uno tiene un enlace para volver a la portada.

## Probar con Docker

```bash
docker build --platform linux/amd64 -t workspace-platform-app:local .
docker run --rm --platform linux/amd64 -p 127.0.0.1:8080:80 workspace-platform-app:local
```

Detén el servidor de Python antes de usar el mismo puerto con Docker. Comprueba la portada, `/japan/`, `/recetas/` y `/personal-library/`, junto con sus enlaces y estilos. Para detener cualquiera de los servidores, pulsa `Ctrl+C`.

Usa la barra final en las rutas de los espacios, o abre su `index.html`: con un puerto local como `8080`, la redirección actual de Nginx para las rutas sin barra apunta al puerto `80`. Los enlaces de la aplicación ya abren los archivos `index.html`.

La imagen incorpora la web y fija la base de Nginx por digest para mantener una compilación reproducible. La construcción, las pruebas y la publicación en GHCR mediante GitHub Actions se añadirán en el siguiente paso.
