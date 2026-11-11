-- Aplicamos la tabla y los datos iniciales juntos para evitar una preparación parcial.
BEGIN;

CREATE TABLE workspaces (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL
);

INSERT INTO workspaces (name) VALUES
    ('Japan'),
    ('Recetas'),
    ('Personal Library');

COMMIT;
