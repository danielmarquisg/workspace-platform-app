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
    return [
        {"id": 1, "name": "Japan"},
        {"id": 2, "name": "Recetas"},
        {"id": 3, "name": "Personal Library"},
    ]
