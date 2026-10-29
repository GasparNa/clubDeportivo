SCHEMA.SQL
-- =====================================================================
-- Sistema de Reservas Club Deportivo — Modelo Físico v2
-- PostgreSQL 14+ / Supabase
--
-- Este esquema fortalece las debilidades detectadas en la revisión del
-- modelo v1 (ver informe-modelo-datos.md). Cada bloque referencia el
-- número de debilidad que corrige.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- =====================================================================
-- 1. DISCIPLINAS
-- =====================================================================
CREATE TABLE disciplinas (
    id_disciplina UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        TEXT NOT NULL UNIQUE,        -- Futbol, Tenis, Padel
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 2. USUARIOS (Socios, Gerentes, Administradores)
-- =====================================================================
CREATE TABLE usuarios (
    id_usuario                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni                          TEXT NOT NULL UNIQUE,
    email                        TEXT NOT NULL UNIQUE,
    nombre                       TEXT NOT NULL,
    apellido                     TEXT NOT NULL,
    telefono_contacto            TEXT,
    email_contacto               TEXT,                    -- separado del email de login (dato fijo vs contacto)
    rol                          TEXT NOT NULL DEFAULT 'SOCIO'
        CHECK (rol IN ('SOCIO','GERENTE','ADMINISTRADOR')),
    estado                       TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE','ACTIVO','SUSPENDIDO')),
    incumplimientos_equipamiento INT NOT NULL DEFAULT 0     -- fortalece debilidad #7 (RF13.4)
        CHECK (incumplimientos_equipamiento >= 0),
    creado_en                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 3. SOLICITUDES DE PERMISO
-- =====================================================================
CREATE TABLE solicitudes_permiso (
    id_solicitud        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                TEXT NOT NULL UNIQUE,
    dni                  TEXT NOT NULL,
    nombre               TEXT NOT NULL,
    apellido             TEXT NOT NULL,
    origen               TEXT NOT NULL
        CHECK (origen IN ('AUTOREGISTRO','GESTIONADA_POR_PERSONAL')),
    estado               TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE','APROBADA','RECHAZADA')),
    id_gestor_aprobador  UUID REFERENCES usuarios(id_usuario),
    id_usuario_generado  UUID UNIQUE REFERENCES usuarios(id_usuario), -- 1:1 con el usuario creado
    creado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
    resuelto_en          TIMESTAMPTZ,
    -- coherencia: solo hay usuario generado si la solicitud fue aprobada
    CHECK (
        (estado = 'APROBADA' AND id_usuario_generado IS NOT NULL)
        OR (estado <> 'APROBADA' AND id_usuario_generado IS NULL)
    )
);

-- Fortalece: id_gestor_aprobador debe ser GERENTE o ADMINISTRADOR
-- (un CHECK no puede consultar otra tabla, así que se resuelve con trigger)
CREATE OR REPLACE FUNCTION fn_check_gestor_rol()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_gestor_aprobador IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM usuarios
            WHERE id_usuario = NEW.id_gestor_aprobador
              AND rol IN ('GERENTE','ADMINISTRADOR')
        ) THEN
            RAISE EXCEPTION 'id_gestor_aprobador debe pertenecer a un Gerente o Administrador';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_gestor_rol
    BEFORE INSERT OR UPDATE ON solicitudes_permiso
    FOR EACH ROW EXECUTE FUNCTION fn_check_gestor_rol();

-- =====================================================================
-- 4. NO SOCIOS (invitados)
-- =====================================================================
CREATE TABLE no_socios (
    id_no_socio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni         TEXT NOT NULL UNIQUE,   -- fortalece debilidad #6: evita duplicar invitados
    email       TEXT,
    nombre      TEXT NOT NULL,
    apellido    TEXT NOT NULL,
    telefono    TEXT,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 5. CANCHAS
-- =====================================================================
CREATE TABLE canchas (
    id_cancha     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_disciplina UUID NOT NULL REFERENCES disciplinas(id_disciplina),
    nombre        TEXT NOT NULL,
    superficie    TEXT,
    precio_base   NUMERIC(10,2) NOT NULL CHECK (precio_base >= 0),
    estado        TEXT NOT NULL DEFAULT 'DISPONIBLE'
        CHECK (estado IN ('DISPONIBLE','MANTENIMIENTO')),
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_disciplina, nombre)
);

-- =====================================================================
-- 6. FRANJAS HORARIAS
--    Grilla RECURRENTE por cancha (día de semana + rango horario).
--    La fecha puntual de cada ocurrencia vive en `reservas.fecha`.
--    (fortalece debilidad #2: se explicita el modelo temporal)
-- =====================================================================
CREATE TABLE franjas_horarias (
    id_franja   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cancha   UUID NOT NULL REFERENCES canchas(id_cancha),
    dia_semana  SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=domingo
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL CHECK (hora_fin > hora_inicio),
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_cancha, dia_semana, hora_inicio)
);

-- =====================================================================
-- 7. EQUIPAMIENTOS
-- =====================================================================
CREATE TABLE equipamientos (
    id_equipamiento  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_disciplina    UUID NOT NULL REFERENCES disciplinas(id_disciplina), -- soporta RF12.2
    nombre           TEXT NOT NULL,
    stock_total      INT NOT NULL CHECK (stock_total >= 0),
    stock_disponible INT NOT NULL CHECK (stock_disponible >= 0),
    precio_alquiler  NUMERIC(10,2) NOT NULL CHECK (precio_alquiler >= 0),
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (stock_disponible <= stock_total)
);

-- =====================================================================
-- 8. RESERVAS
--    id_cancha NO se guarda acá: se deriva de id_franja -> id_cancha.
--    (fortalece debilidad #3: elimina la redundancia/inconsistencia
--    cancha-vs-franja del modelo v1)
-- =====================================================================
CREATE TABLE reservas (
    id_reserva     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_franja      UUID NOT NULL REFERENCES franjas_horarias(id_franja),
    fecha          DATE NOT NULL,
    id_usuario     UUID REFERENCES usuarios(id_usuario),
    id_no_socio    UUID REFERENCES no_socios(id_no_socio),
    estado         TEXT NOT NULL DEFAULT 'CONFIRMADA'
        CHECK (estado IN ('CONFIRMADA','EN_CURSO','COMPLETADA','CANCELADA')),
    origen         TEXT NOT NULL DEFAULT 'AUTOGESTIONADA'
        CHECK (origen IN ('AUTOGESTIONADA','MANUAL_GERENCIA')),
    precio_pagado  NUMERIC(10,2) NOT NULL CHECK (precio_pagado >= 0), -- fortalece debilidad #5
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 3.1 XOR de reservante (se mantiene del modelo v1, sigue siendo correcto)
    CHECK (
        (id_usuario IS NOT NULL AND id_no_socio IS NULL)
        OR
        (id_usuario IS NULL AND id_no_socio IS NOT NULL)
    )
);

-- Fortalece debilidad #1: unicidad real de "franja ocupada".
-- Solo los estados que efectivamente ocupan el turno bloquean el slot;
-- CANCELADA/COMPLETADA pueden repetirse históricamente sobre el mismo slot.
CREATE UNIQUE INDEX uq_franja_ocupada
    ON reservas (id_franja, fecha)
    WHERE estado IN ('CONFIRMADA', 'EN_CURSO');

CREATE INDEX idx_reservas_usuario_estado ON reservas (id_usuario, estado);
CREATE INDEX idx_reservas_fecha ON reservas (fecha);

-- Fortalece debilidad #4: RF16 (máx. 2 reservas CONFIRMADA por socio)
-- con lock transaccional para evitar condición de carrera entre inserts
-- concurrentes del mismo socio.
CREATE OR REPLACE FUNCTION fn_check_max_reservas_activas()
RETURNS TRIGGER AS $$
DECLARE
    v_cantidad INT;
BEGIN
    IF NEW.estado = 'CONFIRMADA' AND NEW.id_usuario IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(hashtext(NEW.id_usuario::text));

        SELECT count(*) INTO v_cantidad
        FROM reservas
        WHERE id_usuario = NEW.id_usuario
          AND estado = 'CONFIRMADA'
          AND id_reserva <> COALESCE(NEW.id_reserva, '00000000-0000-0000-0000-000000000000'::uuid);

        IF v_cantidad >= 2 THEN
            RAISE EXCEPTION 'El socio ya tiene el máximo de 2 reservas CONFIRMADA permitidas (RF16)';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_max_reservas_activas
    BEFORE INSERT OR UPDATE ON reservas
    FOR EACH ROW EXECUTE FUNCTION fn_check_max_reservas_activas();

-- Vista de conveniencia: reintroduce cancha/disciplina para consultas,
-- sin necesidad de desnormalizar la tabla reservas.
CREATE VIEW v_reservas_detalle AS
SELECT
    r.id_reserva,
    r.fecha,
    c.id_cancha,
    c.nombre        AS cancha_nombre,
    c.id_disciplina,
    f.dia_semana,
    f.hora_inicio,
    f.hora_fin,
    r.id_usuario,
    r.id_no_socio,
    r.estado,
    r.origen,
    r.precio_pagado
FROM reservas r
JOIN franjas_horarias f ON f.id_franja = r.id_franja
JOIN canchas c           ON c.id_cancha = f.id_cancha;

-- =====================================================================
-- 9. DETALLE ALQUILER EQUIPAMIENTO
-- =====================================================================
CREATE TABLE detalle_alquiler_equipamiento (
    id_detalle                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_reserva                UUID NOT NULL REFERENCES reservas(id_reserva),
    id_equipamiento           UUID NOT NULL REFERENCES equipamientos(id_equipamiento),
    cantidad                  INT NOT NULL CHECK (cantidad > 0),           -- RF12.1
    precio_unitario           NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0), -- fortalece debilidad #5
    fecha_devolucion_estimada TIMESTAMPTZ,                                  -- se completa por trigger, RF13.1
    fecha_devolucion_real     TIMESTAMPTZ,
    estado_devolucion         TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado_devolucion IN ('PENDIENTE','DEVUELTO','DEVUELTO_TARDE','NO_DEVUELTO')),
    creado_en                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fortalece RF13.1: calcula fecha_devolucion_estimada = fin de franja + 15 min
-- en vez de dejarlo librado a que el backend lo calcule bien siempre.
CREATE OR REPLACE FUNCTION fn_set_fecha_devolucion_estimada()
RETURNS TRIGGER AS $$
DECLARE
    v_hora_fin TIME;
    v_fecha    DATE;
BEGIN
    IF NEW.fecha_devolucion_estimada IS NULL THEN
        SELECT f.hora_fin, r.fecha INTO v_hora_fin, v_fecha
        FROM reservas r
        JOIN franjas_horarias f ON f.id_franja = r.id_franja
        WHERE r.id_reserva = NEW.id_reserva;

        -- Ajustar el nombre de zona horaria al del club si difiere.
        NEW.fecha_devolucion_estimada :=
            (v_fecha + v_hora_fin) AT TIME ZONE 'America/Argentina/Cordoba' + INTERVAL '15 minutes';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_fecha_devolucion_estimada
    BEFORE INSERT ON detalle_alquiler_equipamiento
    FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_devolucion_estimada();

-- =====================================================================
-- 10. REGISTROS DE AUDITORÍA
--     Fortalece debilidad #8: contempla actor humano o del sistema.
-- =====================================================================
CREATE TABLE registros_auditoria (
    id_registro UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_tipo  TEXT NOT NULL DEFAULT 'USUARIO'
        CHECK (actor_tipo IN ('USUARIO','SISTEMA')),
    id_usuario  UUID REFERENCES usuarios(id_usuario), -- NULL si actor_tipo = SISTEMA
    evento      TEXT NOT NULL,                        -- ej: 'RESERVA_CREADA', 'EQUIPAMIENTO_NO_DEVUELTO'
    entidad     TEXT NOT NULL,                         -- tabla/entidad afectada
    id_entidad  UUID,
    detalle     JSONB,
    fecha       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (actor_tipo = 'USUARIO' AND id_usuario IS NOT NULL)
        OR (actor_tipo = 'SISTEMA' AND id_usuario IS NULL)
    )
);

-- Fortalece RNF05: solo-append a nivel de permisos, no solo de convención.
-- Ajustar el nombre de rol al que use realmente el backend/Supabase.
REVOKE UPDATE, DELETE ON registros_auditoria FROM PUBLIC;

-- Fortalece debilidad #7 (RF13.4): incumplimiento -> contador -> suspensión.
CREATE OR REPLACE FUNCTION fn_registrar_incumplimiento()
RETURNS TRIGGER AS $$
DECLARE
    v_id_usuario      UUID;
    v_incumplimientos INT;
BEGIN
    IF NEW.estado_devolucion IN ('DEVUELTO_TARDE', 'NO_DEVUELTO')
       AND (OLD.estado_devolucion IS DISTINCT FROM NEW.estado_devolucion) THEN

        SELECT r.id_usuario INTO v_id_usuario
        FROM reservas r WHERE r.id_reserva = NEW.id_reserva;

        IF v_id_usuario IS NOT NULL THEN
            UPDATE usuarios
               SET incumplimientos_equipamiento = incumplimientos_equipamiento + 1,
                   actualizado_en = now()
             WHERE id_usuario = v_id_usuario
             RETURNING incumplimientos_equipamiento INTO v_incumplimientos;

            INSERT INTO registros_auditoria (actor_tipo, evento, entidad, id_entidad, detalle)
            VALUES ('SISTEMA', 'INCUMPLIMIENTO_EQUIPAMIENTO', 'detalle_alquiler_equipamiento', NEW.id_detalle,
                    jsonb_build_object('estado_devolucion', NEW.estado_devolucion, 'total_incumplimientos', v_incumplimientos));

            IF v_incumplimientos >= 3 THEN
                UPDATE usuarios SET estado = 'SUSPENDIDO', actualizado_en = now()
                 WHERE id_usuario = v_id_usuario AND estado <> 'SUSPENDIDO';

                INSERT INTO registros_auditoria (actor_tipo, evento, entidad, id_entidad, detalle)
                VALUES ('SISTEMA', 'USUARIO_SUSPENDIDO_POR_INCUMPLIMIENTOS', 'usuarios', v_id_usuario,
                        jsonb_build_object('incumplimientos', v_incumplimientos));
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_registrar_incumplimiento
    AFTER UPDATE ON detalle_alquiler_equipamiento
    FOR EACH ROW EXECUTE FUNCTION fn_registrar_incumplimiento();

-- =====================================================================
-- 11. ROW LEVEL SECURITY — postura "deny-all" desde el día uno
--     Fortalece debilidad #9: no queda ninguna ventana sin RLS mientras
--     se terminan de definir las políticas granulares en la fase de
--     Backend (RF06.3). El backend (NestJS) debe usar la service_role
--     key de Supabase, que ignora RLS.
-- =====================================================================
ALTER TABLE disciplinas                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_permiso             ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_socios                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE canchas                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE franjas_horarias                ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamientos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_alquiler_equipamiento   ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_auditoria             ENABLE ROW LEVEL SECURITY;
-- Sin CREATE POLICY todavía => acceso denegado a cualquier rol que no sea
-- service_role. Las políticas por rol (SOCIO/GERENTE/ADMINISTRADOR) se
-- agregan en la fase de Backend.
