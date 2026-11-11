import os

import psycopg
from fastapi import FastAPI, HTTPException

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db():
    database_url = os.getenv("DATABASE_URL")
    password = os.getenv("POSTGRES_PASSWORD")
    if not database_url or not password:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")

    try:
        with psycopg.connect(
            database_url, password=password, connect_timeout=3
        ) as connection:
            connection.execute("SELECT 1")
    except psycopg.Error:
        raise HTTPException(
            status_code=503, detail="Base de datos no disponible"
        ) from None

    return {"status": "ok"}


@app.get("/workspaces")
def list_workspaces():
    database_url = os.getenv("DATABASE_URL")
    password     = os.getenv("POSTGRES_PASSWORD")

    if not database_url or not password:
        raise HTTPException(
            status_code=503, detail="No se han podido consultar los espacios"
        )

    try:
        with psycopg.connect(
            database_url, password=password, connect_timeout=3
        ) as connection:
            rows = connection.execute(
                "SELECT id, name FROM workspaces ORDER BY id"
            ).fetchall()
    except psycopg.Error:
        raise HTTPException(
            status_code=503, detail="No se han podido consultar los espacios"
        ) from None

    return [{"id": workspace_id, "name": name} for workspace_id, name in rows]
