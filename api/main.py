from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/workspaces")
def list_workspaces():
    return [
        {"id": 1, "name": "Japan"},
        {"id": 2, "name": "Recetas"},
        {"id": 3, "name": "Personal Library"},
    ]
