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

## Base de datos local

Usamos PostgreSQL 16 con Docker Compose para preparar la persistencia de la aplicación.

Desde la raíz del repositorio, crea la configuración local:

```bash
cp .env.example .env
```

Edita `.env` y asigna una contraseña a `POSTGRES_PASSWORD`. Este archivo está excluido de Git para evitar publicar credenciales; `.env.example` sirve como plantilla y se guarda sin contraseña.

Después, arranca la base de datos y comprueba que responde a una consulta:

```bash
docker compose up -d --wait
docker compose exec db psql -U workspace -d workspace -c "SELECT current_database();"
```

La base de datos escucha en `127.0.0.1:5432`. La base y el usuario se llaman `workspace`; la contraseña se toma de `POSTGRES_PASSWORD` en `.env`. Esta configuración es solo para desarrollo local.

PostgreSQL establece la contraseña al inicializar un volumen vacío. Si la base de datos ya tiene datos, cambiar `.env` no cambia la contraseña del usuario existente.

Los datos se guardan en el volumen `postgres_data` y se conservan al detener y volver a crear el contenedor. Para detenerlo:

```bash
docker compose down
```

## Preparar los workspaces

Con PostgreSQL arrancado, aplica el archivo SQL desde la raíz del repositorio:

```bash
docker compose exec -T db psql -U workspace -d workspace -v ON_ERROR_STOP=1 < db/001_create_workspaces.sql
```

El archivo crea la tabla `workspaces`, con un identificador generado por PostgreSQL y un nombre, y carga Japan, Recetas y Personal Library. La creación y la carga se ejecutan en una sola transacción.

Ejecuta este paso una sola vez por base de datos. Si la tabla ya existe, el comando falla antes de cargar los datos. Al reiniciar el contenedor, la tabla y los espacios se conservan en el volumen.

## Probar la API

Con PostgreSQL arrancado, FastAPI puede comprobar la conexión ejecutando `SELECT 1`. Esta consulta verifica el acceso desde la API sin modificar datos.

La dirección de conexión se configura con `DATABASE_URL` y la contraseña se toma de `POSTGRES_PASSWORD`. Si ya tenías un `.env`, añade la línea `DATABASE_URL` de `.env.example` conservando tu contraseña.

Los endpoints comparten la función `database_connection`, que lee la configuración y gestiona una conexión por operación. Al terminar, confirma los cambios si todo ha ido bien o los revierte si la operación falla, y cierra la conexión.

Desde la raíz del repositorio, prepara el entorno de Python y arranca la API:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn api.main:app --env-file .env --host 127.0.0.1 --port 8000
```

`--env-file .env` carga las variables de configuración para la API. En otra terminal, comprueba la conexión:

```bash
curl -i http://127.0.0.1:8000/health/db
```

Si puede consultar PostgreSQL, responde con HTTP `200` y `{"status":"ok"}`. Si falta configuración o la conexión falla, responde con HTTP `503` y `{"detail":"Base de datos no disponible"}`, sin mostrar credenciales ni detalles internos.

`GET /health` comprueba que la API responde y funciona aunque PostgreSQL esté detenido.

Para consultar los espacios guardados en la tabla:

```bash
curl -i http://127.0.0.1:8000/workspaces
```

`GET /workspaces` devuelve los campos `id` y `name`, ordenados por identificador. Si la tabla está vacía, devuelve `[]`. Si falta configuración o falla la consulta, responde con HTTP `503` y `{"detail":"No se han podido consultar los espacios"}`.

### Crear un workspace

Con la tabla preparada y la API en marcha, envía el nombre del nuevo espacio:

```bash
curl -i -X POST http://127.0.0.1:8000/workspaces \
  -H 'Content-Type: application/json' \
  --data '{"name":"Fotografía"}'
```

`POST /workspaces` guarda el espacio y responde con HTTP `201`, el identificador generado por PostgreSQL y el nombre guardado. Cada petición válida crea un registro nuevo.

El nombre es obligatorio y debe ser texto. Se eliminan los espacios de los extremos antes de comprobar que tenga contenido. Si falta, está vacío o contiene solo espacios, la API responde con HTTP `422` sin crear el registro.

El nombre se envía como parámetro de la consulta SQL para mantener los datos separados de la instrucción. Si falta configuración o falla la operación en PostgreSQL, la API devuelve HTTP `503` con `{"detail":"No se ha podido crear el espacio"}`.

Para comprobar que se ha guardado, vuelve a consultar:

```bash
curl -i http://127.0.0.1:8000/workspaces
```

### Renombrar un workspace

Consulta `GET /workspaces` y elige el identificador del espacio que quieres renombrar. Sustituye el `4` de este ejemplo por ese identificador:

```bash
curl -i -X PATCH http://127.0.0.1:8000/workspaces/4 \
  -H 'Content-Type: application/json' \
  --data '{"name":"Fotografía de viajes"}'
```

`PATCH /workspaces/{workspace_id}` modifica el nombre y responde con HTTP `200`, el mismo identificador y el nombre guardado. La actualización se filtra por id y utiliza parámetros SQL.

El nombre sigue las mismas reglas que al crear un espacio: es obligatorio, se recortan los extremos y debe tener contenido. Un nombre inválido o un identificador que no se pueda interpretar como entero devuelve HTTP `422`.

Si el identificador no existe, responde con HTTP `404` y `{"detail":"Espacio no encontrado"}`. Si falta configuración o falla la operación en PostgreSQL, responde con HTTP `503` y `{"detail":"No se ha podido renombrar el espacio"}`.

Vuelve a consultar `GET /workspaces` para comprobar el cambio. La operación conserva el identificador y la cantidad de espacios.

Para detener la API, pulsa `Ctrl+C`.
