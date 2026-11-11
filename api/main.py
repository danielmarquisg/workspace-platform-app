import os
import psycopg
from fastapi    import FastAPI, HTTPException
from pydantic   import BaseModel, ConfigDict, Field
from contextlib import contextmanager

app = FastAPI()


class WorkspaceCreate(BaseModel):
    # Recortamos los extremos antes de validar para rechazar nombres que solo contienen espacios.
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str    = Field(min_length=1)


@contextmanager
def database_connection(error_detail):
    """Gestiona una conexión y traduce los fallos de PostgreSQL a HTTP 503.

    error_detail es el mensaje público fijo que aporta cada endpoint.
    Identifica la operación fallida sin exponer el error de PostgreSQL
    ni repetir su gestión en cada endpoint.
    """
    # Uvicorn carga .env al arrancar; aquí leemos las variables del entorno.
    database_url = os.getenv("DATABASE_URL")
    password     = os.getenv("POSTGRES_PASSWORD")

    if not database_url or not password:
        raise HTTPException( status_code=503, detail=error_detail)

    try:
        # El contexto confirma o revierte la transacción y cierra la conexión.
        # El try también incluye la confirmación, que puede fallar al salir.
        with psycopg.connect( database_url, password=password, connect_timeout=3) as connection:
            # Cedemos la conexión al endpoint y continuamos cuando termina su bloque with.
            yield connection

    except psycopg.Error:
        raise HTTPException( status_code=503, detail=error_detail) from None



@app.get("/health")
def health():
    # Esta ruta comprueba la API sin depender de PostgreSQL.
    return {"status": "ok"}


@app.get("/health/db")
def health_db():
    with database_connection( "Base de datos no disponible") as connection:
        # Comprobamos el acceso a SQL sin modificar datos ni depender de una tabla concreta.
        connection.execute("SELECT 1")

    return {"status": "ok"}


@app.get("/workspaces")
def list_workspaces():
    with database_connection( "No se han podido consultar los espacios") as connection:
        # El orden por id mantiene estable la respuesta entre consultas.
        rows = connection.execute(
            "SELECT id, name FROM workspaces ORDER BY id"
        ).fetchall()

    return [{"id": workspace_id, "name": name} for workspace_id, name in rows]


@app.post("/workspaces", status_code=201)
def create_workspace(workspace: WorkspaceCreate):
    with database_connection( "No se ha podido crear el espacio") as connection:
        # Enviamos el nombre como parámetro para tratarlo como dato, no como SQL.
        # RETURNING recupera el registro creado sin hacer otra consulta.
        row = connection.execute(
            "INSERT INTO workspaces (name) VALUES (%s) RETURNING id, name",
            (workspace.name,),
        ).fetchone()

    # Salimos del contexto antes de responder para confirmar la creación.
    return {"id": row[0], "name": row[1]}
