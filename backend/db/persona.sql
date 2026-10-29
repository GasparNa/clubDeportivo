-- Habilitar extensión para generar UUIDs aleatorios (PostgreSQL 13+)
CREATE EXTENSION IF NOT EXISTS pgcrypto;



-- Tabla principal de personas
CREATE TABLE persona (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    fecha_nacimiento DATE,
    cuil TEXT UNIQUE,
    dni TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de contactos (emails y teléfonos)
CREATE TABLE contacto_persona (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_persona UUID NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
    tipo_contacto TEXT NOT NULL CHECK (tipo_contacto IN ('email', 'telefono')),
    valor_contacto TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de direcciones
CREATE TABLE direccion_persona (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_persona UUID NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
    tipo_direccion TEXT NOT NULL CHECK (tipo_direccion IN ('personal', 'laboral')),
    calle TEXT,
    numero TEXT,
    piso TEXT,
    departamento TEXT,
    codigo_postal TEXT,
    localidad TEXT,
    provincia TEXT,
    pais TEXT DEFAULT 'Argentina',
    estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_contacto_persona ON contacto_persona(id_persona, estado);

CREATE INDEX idx_direccion_persona ON direccion_persona(id_persona, estado);

CREATE INDEX idx_persona_dni ON persona(dni);

CREATE INDEX idx_persona_cuil ON persona(cuil);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_persona_updated_at BEFORE UPDATE ON persona
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_contacto_updated_at BEFORE UPDATE ON contacto_persona
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_direccion_updated_at BEFORE UPDATE ON direccion_persona
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();