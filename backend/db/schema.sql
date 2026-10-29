-- =============================================================================
-- Club Deportivo - Sistema de Reservas
-- Esquema de Base de Datos (PostgreSQL / Supabase)
-- Basado en: Requerimientos - Ing. de Software (v5)
-- =============================================================================

-- =============================================================================
-- ENUMS (via CHECK constraints para flexibilidad en Supabase)
-- =============================================================================

-- =============================================================================
-- 1. DISCIPLINAS
-- Tenis, Fútbol, Pádel
-- =============================================================================
CREATE TABLE IF NOT EXISTS disciplinas (
    id          SERIAL PRIMARY KEY,
    nombre      TEXT NOT NULL UNIQUE,
    descripcion TEXT
);

-- =============================================================================
-- 2. SOLICITUDES DE PERMISO DE SOCIO
-- Autoregistro (RF11.1) o gestionada por Gerente/Administrador (RF11.1, RF11.4)
-- =============================================================================
CREATE TABLE IF NOT EXISTS solicitudes_permiso (
    id                   SERIAL PRIMARY KEY,
    nombre               TEXT NOT NULL,
    email                TEXT NOT NULL,
    telefono             TEXT NOT NULL,
    dni                  TEXT NOT NULL,
    origen               TEXT NOT NULL CHECK (origen IN ('AUTOREGISTRO', 'GESTIONADA_POR_PERSONAL')),
    id_gestor_aprobador  INTEGER,
    fecha_solicitud      TIMESTAMPTZ NOT NULL DEFAULT now(),
    estado               TEXT NOT NULL CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
    fecha_resolucion     TIMESTAMPTZ,
    CONSTRAINT uq_solicitud_email UNIQUE (email)
);

-- =============================================================================
-- 3. USUARIOS / SOCIOS
-- Estado Pendiente: no puede reservar ni alquilar (RF17.1)
-- Datos fijos editables solo por Gerente/Admin (RF19.2)
-- Datos de contacto editables por el socio (RF19.1)
-- =============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id                  SERIAL PRIMARY KEY,
    rol                 TEXT NOT NULL CHECK (rol IN ('SOCIO', 'GERENTE', 'ADMINISTRADOR')),
    estado              TEXT NOT NULL CHECK (estado IN ('PENDIENTE', 'ACTIVO', 'SUSPENDIDO')),
    id_solicitud_origen INTEGER,
    -- Datos fijos (RF19.2)
    dni                 TEXT NOT NULL UNIQUE,
    nombre              TEXT NOT NULL,
    apellido            TEXT NOT NULL,
    fecha_nacimiento    DATE NOT NULL,
    -- Datos de contacto (RF19.1)
    email               TEXT NOT NULL UNIQUE,
    telefono            TEXT NOT NULL,
    domicilio           TEXT,
    -- Auth
    password_hash       TEXT,
    CONSTRAINT fk_usuarios_solicitud FOREIGN KEY (id_solicitud_origen)
        REFERENCES solicitudes_permiso(id) ON DELETE SET NULL
);

-- =============================================================================
-- 4. NO SOCIOS (INVITADOS)
-- Reservas cargadas por Gerencia/Administración (RF21)
-- =============================================================================
CREATE TABLE IF NOT EXISTS no_socios (
    id       SERIAL PRIMARY KEY,
    nombre   TEXT NOT NULL,
    telefono TEXT NOT NULL,
    dni      TEXT
);

-- =============================================================================
-- 5. CANCHAS
-- Relación: Disciplina 1:N Cancha ; Cancha 1:N Franja Horaria
-- =============================================================================
CREATE TABLE IF NOT EXISTS canchas (
    id               SERIAL PRIMARY KEY,
    id_disciplina    INTEGER NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    nombre           TEXT NOT NULL,
    tipo_superficie  TEXT,
    estado           TEXT NOT NULL DEFAULT 'DISPONIBLE'
                     CHECK (estado IN ('DISPONIBLE', 'MANTENIMIENTO')),
    precio_base_hora NUMERIC(10,2) NOT NULL CHECK (precio_base_hora >= 0),
    CONSTRAINT uq_cancha_disciplina_nombre UNIQUE (id_disciplina, nombre)
);

-- =============================================================================
-- 6. FRANJAS HORARIAS
-- Grilla de turnos por cancha (RF03.1, RF02)
-- =============================================================================
CREATE TABLE IF NOT EXISTS franjas_horarias (
    id          SERIAL PRIMARY KEY,
    id_cancha   INTEGER NOT NULL REFERENCES canchas(id) ON DELETE CASCADE,
    dia_semana  SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1 = Lunes ... 7 = Domingo
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL,
    CONSTRAINT ck_franja_horario_valido CHECK (hora_fin > hora_inicio),
    CONSTRAINT uq_franja UNIQUE (id_cancha, dia_semana, hora_inicio, hora_fin)
);

-- =============================================================================
-- 7. EQUIPAMIENTO DEPORTIVO
-- Stock y precio de alquiler (RF12, RF13)
-- =============================================================================
CREATE TABLE IF NOT EXISTS equipamientos (
    id                 SERIAL PRIMARY KEY,
    nombre             TEXT NOT NULL,
    id_disciplina      INTEGER NOT NULL REFERENCES disciplinas(id),
    stock_disponible   INTEGER NOT NULL CHECK (stock_disponible >= 0),
    precio_alquiler    NUMERIC(10,2) NOT NULL CHECK (precio_alquiler >= 0)
);

-- =============================================================================
-- 8. RESERVAS
-- Regla de negocio clave: exactamente uno de id_usuario / id_no_socio
-- (nunca ambos, nunca ninguno).
-- Estado de cancha en Mantenimiento -> cancela reservas futuras (RF15)
-- =============================================================================
CREATE TABLE IF NOT EXISTS reservas (
    id            SERIAL PRIMARY KEY,
    id_usuario    INTEGER,
    id_no_socio   INTEGER,
    id_cancha     INTEGER NOT NULL REFERENCES canchas(id),
    id_franja     INTEGER NOT NULL REFERENCES franjas_horarias(id),
    fecha         DATE NOT NULL,
    estado        TEXT NOT NULL DEFAULT 'CONFIRMADA'
                  CHECK (estado IN ('CONFIRMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA')),
    monto_total   NUMERIC(10,2) NOT NULL CHECK (monto_total >= 0),
    origen        TEXT NOT NULL CHECK (origen IN ('AUTOGESTIONADA', 'MANUAL_GERENCIA')),
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelado_en  TIMESTAMPTZ,
    -- XOR: exactamente uno de usuario / no socio
    CONSTRAINT ck_reserva_unico_reservante CHECK (
        (id_usuario IS NOT NULL AND id_no_socio IS NULL)
        OR
        (id_usuario IS NULL AND id_no_socio IS NOT NULL)
    ),
    CONSTRAINT fk_reservas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    CONSTRAINT fk_reservas_no_socio FOREIGN KEY (id_no_socio) REFERENCES no_socios(id),
    -- Una reserva valida solo franjas del propio dia de la cancha
    CONSTRAINT uq_reserva_franja UNIQUE (id_cancha, id_franja, fecha, estado)
);

-- =============================================================================
-- 9. DETALLE ALQUILER EQUIPAMIENTO
-- Reserva 1:N Detalle (RF03.2, RF12, RF13)
-- Stock se valida antes de confirmar (RF12.3) y se repone al devolver (RF13)
-- =============================================================================
CREATE TABLE IF NOT EXISTS detalle_alquiler_equipamiento (
    id_reserva              INTEGER NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
    id_equipamiento         INTEGER NOT NULL REFERENCES equipamientos(id),
    cantidad                INTEGER NOT NULL CHECK (cantidad > 0),
    subtotal                NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    fecha_devolucion_estimada TIMESTAMPTZ,
    fecha_devolucion_real   TIMESTAMPTZ,
    estado_devolucion       TEXT NOT NULL DEFAULT 'PENDIENTE'
                            CHECK (estado_devolucion IN ('PENDIENTE', 'DEVUELTO', 'DEVUELTO_TARDE', 'NO_DEVUELTO')),
    PRIMARY KEY (id_reserva, id_equipamiento)
);

-- =============================================================================
-- 10. REGISTRO DE AUDITORÍA
-- Trazabilidad inmutable e indefinida (RF14, RNF05)
-- =============================================================================
CREATE TABLE IF NOT EXISTS registros_auditoria (
    id                  SERIAL PRIMARY KEY,
    tipo_evento         TEXT NOT NULL,
    id_usuario_actor    INTEGER REFERENCES usuarios(id),
    entidad_afectada    TEXT NOT NULL,
    id_entidad_afectada INTEGER,
    fecha_hora          TIMESTAMPTZ NOT NULL DEFAULT now(),
    detalle             TEXT
);

-- =============================================================================
-- INDICES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_estado      ON usuarios (rol, estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado       ON solicitudes_permiso (estado);
CREATE INDEX IF NOT EXISTS idx_canchas_disciplina       ON canchas (id_disciplina);
CREATE INDEX IF NOT EXISTS idx_franjas_cancha_dia       ON franjas_horarias (id_cancha, dia_semana);
CREATE INDEX IF NOT EXISTS idx_equipamientos_disciplina ON equipamientos (id_disciplina);
CREATE INDEX IF NOT EXISTS idx_reservas_cancha_fecha    ON reservas (id_cancha, fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario         ON reservas (id_usuario) WHERE id_usuario IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reservas_no_socio        ON reservas (id_no_socio) WHERE id_no_socio IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_detalle_reserva          ON detalle_alquiler_equipamiento (id_reserva);
CREATE INDEX IF NOT EXISTS idx_auditoria_actor          ON registros_auditoria (id_usuario_actor);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha          ON registros_auditoria (fecha_hora);

-- =============================================================================
-- DATOS INICIALES DE REFERENCIA
-- =============================================================================
INSERT INTO disciplinas (nombre, descripcion)
VALUES
    ('Fútbol', 'Canchas de fútbol 5/7/11'),
    ('Tenis', 'Canchas de tenis'),
    ('Pádel', 'Canchas de pádel')
ON CONFLICT (nombre) DO NOTHING;