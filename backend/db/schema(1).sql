-- =====================================================================
-- Club Deportivo — Sistema de Reservas
-- ESQUEMA v2 — con PERSONA como entidad raíz (PostgreSQL 14+ / Supabase)
--
-- Reemplaza al esquema anterior (usuarios + no_socios duplicados) por
-- un modelo donde toda persona que interactúa con el club vive en una
-- sola tabla (`personas`), y "ser usuario del sistema" (socio, gerente
-- o administrador) es una condición aparte, modelada como subtipo 0..1.
-- Es idempotente: puede ejecutarse repetidas veces.
--
-- Decisiones de diseño / supuestos tomados para dejarlo funcional:
--  1. Autenticación propia (password_hash en `usuarios`), independiente
--     de Supabase Auth. Si más adelante deciden usar Supabase Auth, ese
--     campo se puede reemplazar por una FK a auth.users(id) sin tocar
--     el resto del modelo (usuarios.id_usuario ya es un UUID estable).
--  2. Cancelación con antelación mínima de 1 día (RF08/RF09): se aplica
--     solo a cancelaciones de origen AUTOGESTIONADA. El staff cancela
--     sin esa restricción seteando, dentro de la misma transacción:
--       SET LOCAL app.actor_rol = 'GERENTE';   -- o 'ADMINISTRADOR'
--  3. Al aprobar una solicitud de permiso, el usuario se crea en estado
--     PENDIENTE (no ACTIVO): RF17.1 dice que un usuario PENDIENTE no
--     reserva ni alquila, así que queda una activación explícita
--     posterior por Gerencia/Administración antes de poder operar.
--  4. persona.dni es obligatorio y único también para invitados.
--  5. Tarifas fijas por cancha (sin variación por franja/temporada);
--     queda como punto de extensión futuro (tabla de tarifas aparte).
--  6. Pagos/facturación fuera de alcance de este MVP: se calcula
--     monto_total automáticamente, pero no hay modelo de cobro.
--  7. El pase de una cancha a MANTENIMIENTO cancela reservas futuras
--     sin aplicar la política de antelación de 1 día (es una baja
--     forzada por el club, no una cancelación voluntaria del socio).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- =====================================================================
-- 0. LIMPIEZA (orden inverso a las dependencias)
-- =====================================================================
DROP VIEW IF EXISTS v_reservas_detalle CASCADE;

DROP TABLE IF EXISTS registros_auditoria           CASCADE;
DROP TABLE IF EXISTS detalle_alquiler_equipamiento CASCADE;
DROP TABLE IF EXISTS reservas                       CASCADE;
DROP TABLE IF EXISTS equipamientos                  CASCADE;
DROP TABLE IF EXISTS franjas_horarias               CASCADE;
DROP TABLE IF EXISTS canchas                        CASCADE;
DROP TABLE IF EXISTS solicitudes_permiso            CASCADE;
DROP TABLE IF EXISTS usuarios                       CASCADE;
DROP TABLE IF EXISTS direcciones_persona            CASCADE;
DROP TABLE IF EXISTS contactos_persona              CASCADE;
DROP TABLE IF EXISTS personas                       CASCADE;
DROP TABLE IF EXISTS disciplinas                    CASCADE;

DROP FUNCTION IF EXISTS fn_update_updated_at()               CASCADE;
DROP FUNCTION IF EXISTS fn_set_inactivated_at()               CASCADE;
DROP FUNCTION IF EXISTS fn_check_gestor_rol()                 CASCADE;
DROP FUNCTION IF EXISTS fn_procesar_solicitud()               CASCADE;
DROP FUNCTION IF EXISTS fn_before_insert_reserva()            CASCADE;
DROP FUNCTION IF EXISTS fn_before_update_reserva()            CASCADE;
DROP FUNCTION IF EXISTS fn_auditoria_reserva()                CASCADE;
DROP FUNCTION IF EXISTS fn_validar_alquiler_equipamiento()    CASCADE;
DROP FUNCTION IF EXISTS fn_set_fecha_devolucion_estimada()    CASCADE;
DROP FUNCTION IF EXISTS fn_recalcular_monto_reserva()         CASCADE;
DROP FUNCTION IF EXISTS fn_gestionar_devolucion_equipamiento() CASCADE;
DROP FUNCTION IF EXISTS fn_marcar_no_devueltos()              CASCADE;
DROP FUNCTION IF EXISTS fn_cancha_a_mantenimiento()           CASCADE;

-- =====================================================================
-- 1. PERSONAS — entidad raíz. Toda persona que interactúa con el club
--    (socio, invitado, personal) tiene una fila acá. Ser usuario del
--    sistema es una condición aparte (ver tabla usuarios).
-- =====================================================================
CREATE TABLE personas (
    id_persona        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni               TEXT NOT NULL UNIQUE,
    cuil              TEXT UNIQUE,
    nombre            TEXT NOT NULL,
    apellido          TEXT NOT NULL,
    fecha_nacimiento  DATE,
    creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE personas IS 'Entidad raíz de identidad: datos fijos, editables solo por Gerente/Admin (RF19.2). Un invitado puede pasar a ser socio sin duplicar su identidad.';

-- =====================================================================
-- 2. CONTACTOS Y DIRECCIONES — multivaluados, para cualquier persona
--    (además del email/teléfono principal que usan los usuarios para
--    login, ver tabla usuarios). Editables por el propio socio (RF19.1).
-- =====================================================================
CREATE TABLE contactos_persona (
    id_contacto     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_persona      UUID NOT NULL REFERENCES personas(id_persona) ON DELETE CASCADE,
    tipo_contacto   TEXT NOT NULL CHECK (tipo_contacto IN ('email', 'telefono')),
    valor_contacto  TEXT NOT NULL,
    estado          TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    inactivated_at  TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_contacto_inactivated_at CHECK (
        (estado = 'activo' AND inactivated_at IS NULL) OR
        (estado = 'inactivo' AND inactivated_at IS NOT NULL)
    ),
    UNIQUE (id_persona, tipo_contacto, valor_contacto)
);
COMMENT ON TABLE contactos_persona IS 'Contactos adicionales de una persona (secundarios; el de login vive en usuarios).';

CREATE TABLE direcciones_persona (
    id_direccion    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_persona      UUID NOT NULL REFERENCES personas(id_persona) ON DELETE CASCADE,
    tipo_direccion  TEXT NOT NULL CHECK (tipo_direccion IN ('personal', 'laboral')),
    calle           TEXT,
    numero          TEXT,
    piso            TEXT,
    departamento    TEXT,
    codigo_postal   TEXT,
    localidad       TEXT,
    provincia       TEXT,
    pais            TEXT NOT NULL DEFAULT 'Argentina',
    estado          TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    inactivated_at  TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_direccion_inactivated_at CHECK (
        (estado = 'activo' AND inactivated_at IS NULL) OR
        (estado = 'inactivo' AND inactivated_at IS NOT NULL)
    )
);
COMMENT ON TABLE direcciones_persona IS 'Direcciones de una persona (opcional; estructurada en vez de texto libre).';

CREATE INDEX idx_personas_apellido_nombre  ON personas (apellido, nombre);
CREATE INDEX idx_contactos_persona_activo  ON contactos_persona (id_persona) WHERE estado = 'activo';
CREATE INDEX idx_direcciones_persona_activo ON direcciones_persona (id_persona) WHERE estado = 'activo';

-- updated_at genérico, reutilizado por varias tablas
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_personas_updated_at   BEFORE UPDATE ON personas          FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_contactos_updated_at  BEFORE UPDATE ON contactos_persona FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_direcciones_updated_at BEFORE UPDATE ON direcciones_persona FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE OR REPLACE FUNCTION fn_set_inactivated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado = 'activo' AND NEW.estado = 'inactivo' THEN
        NEW.inactivated_at = now();
    ELSIF OLD.estado = 'inactivo' AND NEW.estado = 'activo' THEN
        NEW.inactivated_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contactos_inactivated_at  BEFORE UPDATE ON contactos_persona  FOR EACH ROW EXECUTE FUNCTION fn_set_inactivated_at();
CREATE TRIGGER trg_direcciones_inactivated_at BEFORE UPDATE ON direcciones_persona FOR EACH ROW EXECUTE FUNCTION fn_set_inactivated_at();

-- =====================================================================
-- 3. USUARIOS — subtipo de PERSONAS (0..1): quienes tienen cuenta en
--    el sistema (Socio, Gerente o Administrador). id_usuario = id_persona.
-- =====================================================================
CREATE TABLE usuarios (
    id_usuario                    UUID PRIMARY KEY REFERENCES personas(id_persona) ON DELETE RESTRICT,
    rol                           TEXT NOT NULL DEFAULT 'SOCIO' CHECK (rol IN ('SOCIO', 'GERENTE', 'ADMINISTRADOR')),
    estado                        TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ACTIVO', 'SUSPENDIDO')),
    email                         TEXT NOT NULL UNIQUE,
    telefono                      TEXT NOT NULL,
    password_hash                 TEXT,
    incumplimientos_equipamiento  INT NOT NULL DEFAULT 0 CHECK (incumplimientos_equipamiento >= 0),
    creado_en                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en                TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE usuarios IS 'Cuenta de sistema de una persona (RF06, RF11, RF17, RF19). 1:1 con personas.';
COMMENT ON COLUMN usuarios.estado IS 'PENDIENTE: recién creado, no reserva ni alquila (RF17.1). SUSPENDIDO: no crea reservas nuevas (RF17.2). Solo ACTIVO opera con normalidad.';

CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- =====================================================================
-- 4. SOLICITUDES DE PERMISO — siempre referencian una persona ya
--    existente: si alguien ya jugó como invitado y ahora pide ser
--    socio, el backend reutiliza esa fila de `personas` (buscándola
--    por DNI) en vez de duplicar datos. Para altas 100% nuevas, el
--    backend crea primero la persona y recién después la solicitud.
-- =====================================================================
CREATE TABLE solicitudes_permiso (
    id_solicitud         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_persona           UUID NOT NULL REFERENCES personas(id_persona),
    email                TEXT NOT NULL,
    telefono             TEXT NOT NULL,
    origen               TEXT NOT NULL CHECK (origen IN ('AUTOREGISTRO', 'GESTIONADA_POR_PERSONAL')),
    estado               TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
    id_gestor_aprobador  UUID REFERENCES usuarios(id_usuario),
    id_usuario_generado  UUID UNIQUE REFERENCES usuarios(id_usuario),
    fecha_solicitud      TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_resolucion     TIMESTAMPTZ,
    CONSTRAINT ck_solicitud_usuario_si_aprobada CHECK (
        (estado = 'APROBADA' AND id_usuario_generado IS NOT NULL) OR
        (estado <> 'APROBADA' AND id_usuario_generado IS NULL)
    )
);
COMMENT ON TABLE solicitudes_permiso IS 'Alta de socio por autoregistro o gestionada por personal (RF11).';

-- Máximo una solicitud PENDIENTE por persona a la vez.
CREATE UNIQUE INDEX uq_solicitud_pendiente_por_persona ON solicitudes_permiso (id_persona) WHERE estado = 'PENDIENTE';

-- Un CHECK no puede consultar otra tabla: se valida por trigger que el
-- aprobador sea Gerente o Administrador.
CREATE OR REPLACE FUNCTION fn_check_gestor_rol()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_gestor_aprobador IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM usuarios
            WHERE id_usuario = NEW.id_gestor_aprobador
              AND rol IN ('GERENTE', 'ADMINISTRADOR')
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

-- Al aprobar: crea la fila en usuarios (estado PENDIENTE, RF17.1) y
-- completa id_usuario_generado + fecha_resolucion + auditoría.
-- Al rechazar: solo completa fecha_resolucion + auditoría.
CREATE OR REPLACE FUNCTION fn_procesar_solicitud()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'APROBADA' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
        IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = NEW.id_persona) THEN
            INSERT INTO usuarios (id_usuario, rol, estado, email, telefono)
            VALUES (NEW.id_persona, 'SOCIO', 'PENDIENTE', NEW.email, NEW.telefono);
        END IF;
        NEW.id_usuario_generado := NEW.id_persona;
        NEW.fecha_resolucion := now();

        INSERT INTO registros_auditoria (actor_tipo, id_usuario, evento, entidad, id_entidad, detalle)
        VALUES ('SISTEMA', NEW.id_gestor_aprobador, 'SOLICITUD_APROBADA', 'solicitudes_permiso', NEW.id_solicitud,
                jsonb_build_object('id_persona', NEW.id_persona));

    ELSIF NEW.estado = 'RECHAZADA' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
        NEW.fecha_resolucion := now();

        INSERT INTO registros_auditoria (actor_tipo, id_usuario, evento, entidad, id_entidad, detalle)
        VALUES ('SISTEMA', NEW.id_gestor_aprobador, 'SOLICITUD_RECHAZADA', 'solicitudes_permiso', NEW.id_solicitud,
                jsonb_build_object('id_persona', NEW.id_persona));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_procesar_solicitud
    BEFORE UPDATE ON solicitudes_permiso
    FOR EACH ROW EXECUTE FUNCTION fn_procesar_solicitud();

-- =====================================================================
-- 5. DISCIPLINAS
-- =====================================================================
CREATE TABLE disciplinas (
    id_disciplina UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        TEXT NOT NULL UNIQUE,
    descripcion   TEXT,
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE disciplinas IS 'Catálogo de disciplinas deportivas (RF01).';

-- =====================================================================
-- 6. CANCHAS
-- =====================================================================
CREATE TABLE canchas (
    id_cancha     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_disciplina UUID NOT NULL REFERENCES disciplinas(id_disciplina),
    nombre        TEXT NOT NULL,
    superficie    TEXT,
    precio_base   NUMERIC(10,2) NOT NULL CHECK (precio_base >= 0),
    estado        TEXT NOT NULL DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE', 'MANTENIMIENTO')),
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_disciplina, nombre)
);
COMMENT ON TABLE canchas IS 'Cancha con disciplina, superficie, estado y precio (RF01, RF15).';

-- =====================================================================
-- 7. FRANJAS HORARIAS — grilla recurrente por cancha (día de semana +
--    rango horario). La fecha puntual de cada ocurrencia vive en
--    reservas.fecha.
-- =====================================================================
CREATE TABLE franjas_horarias (
    id_franja   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cancha   UUID NOT NULL REFERENCES canchas(id_cancha) ON DELETE CASCADE,
    dia_semana  SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=domingo ... 6=sábado
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL CHECK (hora_fin > hora_inicio),
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_cancha, dia_semana, hora_inicio)
);
COMMENT ON TABLE franjas_horarias IS 'Grilla de turnos por cancha (RF02, RF03).';

-- =====================================================================
-- 8. EQUIPAMIENTOS
-- =====================================================================
CREATE TABLE equipamientos (
    id_equipamiento  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_disciplina    UUID NOT NULL REFERENCES disciplinas(id_disciplina),
    nombre           TEXT NOT NULL,
    stock_total      INT NOT NULL CHECK (stock_total >= 0),
    stock_disponible INT NOT NULL CHECK (stock_disponible >= 0),
    precio_alquiler  NUMERIC(10,2) NOT NULL CHECK (precio_alquiler >= 0),
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (stock_disponible <= stock_total)
);
COMMENT ON TABLE equipamientos IS 'Artículos deportivos con stock y precio de alquiler (RF12, RF13).';

-- =====================================================================
-- 9. RESERVAS — una sola FK a personas (ya no hace falta el XOR
--    socio/no-socio: el tipo de reservante se deduce de si existe fila
--    en usuarios para esa persona).
-- =====================================================================
CREATE TABLE reservas (
    id_reserva     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_franja      UUID NOT NULL REFERENCES franjas_horarias(id_franja),
    fecha          DATE NOT NULL,
    id_persona     UUID NOT NULL REFERENCES personas(id_persona),
    estado         TEXT NOT NULL DEFAULT 'CONFIRMADA' CHECK (estado IN ('CONFIRMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA')),
    origen         TEXT NOT NULL DEFAULT 'AUTOGESTIONADA' CHECK (origen IN ('AUTOGESTIONADA', 'MANUAL_GERENCIA')),
    monto_total    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monto_total >= 0),
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelado_en   TIMESTAMPTZ
);
COMMENT ON TABLE reservas IS 'Reserva de una franja por cualquier persona -socio, invitado o personal- (RF02-RF05, RF07-RF10, RF16-RF18, RF20, RF22).';

-- Unicidad real de "franja ocupada": solo los estados que efectivamente
-- ocupan el turno bloquean el slot.
CREATE UNIQUE INDEX uq_franja_ocupada
    ON reservas (id_franja, fecha)
    WHERE estado IN ('CONFIRMADA', 'EN_CURSO');

CREATE INDEX idx_reservas_fecha            ON reservas (fecha);
CREATE INDEX idx_reservas_persona_estado   ON reservas (id_persona, estado);
CREATE INDEX idx_franjas_cancha_dia        ON franjas_horarias (id_cancha, dia_semana);
CREATE INDEX idx_canchas_disciplina_estado ON canchas (id_disciplina, estado);

-- Vista de conveniencia para disponibilidad y listados.
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
    r.id_persona,
    p.nombre        AS persona_nombre,
    p.apellido      AS persona_apellido,
    u.rol           AS reservante_rol,      -- NULL si es invitado
    r.estado,
    r.origen,
    r.monto_total
FROM reservas r
JOIN franjas_horarias f ON f.id_franja = r.id_franja
JOIN canchas c          ON c.id_cancha = f.id_cancha
JOIN personas p         ON p.id_persona = r.id_persona
LEFT JOIN usuarios u    ON u.id_usuario = r.id_persona;

-- RF17: solo un usuario ACTIVO puede tener reservas CONFIRMADA nuevas
-- (los invitados -sin fila en usuarios- no tienen esta restricción).
-- RF16: máximo 2 reservas CONFIRMADA simultáneas por usuario, con lock
-- transaccional para evitar condición de carrera (RNF03).
-- También fija el monto base (precio de la cancha) al crear la reserva.
CREATE OR REPLACE FUNCTION fn_before_insert_reserva()
RETURNS TRIGGER AS $$
DECLARE
    v_estado_usuario TEXT;
    v_cantidad       INT;
    v_precio_base    NUMERIC(10,2);
BEGIN
    SELECT estado INTO v_estado_usuario FROM usuarios WHERE id_usuario = NEW.id_persona;

    IF v_estado_usuario IS NOT NULL AND v_estado_usuario <> 'ACTIVO' AND NEW.estado = 'CONFIRMADA' THEN
        RAISE EXCEPTION 'El usuario debe estar ACTIVO para crear una reserva (RF17)';
    END IF;

    IF v_estado_usuario IS NOT NULL AND NEW.estado = 'CONFIRMADA' THEN
        PERFORM pg_advisory_xact_lock(hashtext(NEW.id_persona::text));

        SELECT count(*) INTO v_cantidad
        FROM reservas
        WHERE id_persona = NEW.id_persona AND estado = 'CONFIRMADA';

        IF v_cantidad >= 2 THEN
            RAISE EXCEPTION 'El socio ya tiene el máximo de 2 reservas CONFIRMADA permitidas (RF16)';
        END IF;
    END IF;

    SELECT c.precio_base INTO v_precio_base
    FROM franjas_horarias f JOIN canchas c ON c.id_cancha = f.id_cancha
    WHERE f.id_franja = NEW.id_franja;

    NEW.monto_total := v_precio_base;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_before_insert_reserva
    BEFORE INSERT ON reservas
    FOR EACH ROW EXECUTE FUNCTION fn_before_insert_reserva();

-- Transiciones de estado válidas + política de cancelación (RF08/RF09).
CREATE OR REPLACE FUNCTION fn_before_update_reserva()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_rol    TEXT := current_setting('app.actor_rol', true);
    v_inicio_turno TIMESTAMPTZ;
BEGIN
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
        IF NOT (
            (OLD.estado = 'CONFIRMADA' AND NEW.estado IN ('EN_CURSO', 'CANCELADA')) OR
            (OLD.estado = 'EN_CURSO'   AND NEW.estado IN ('COMPLETADA', 'CANCELADA'))
        ) THEN
            RAISE EXCEPTION 'Transición de estado inválida: % -> %', OLD.estado, NEW.estado;
        END IF;

        IF NEW.estado = 'CANCELADA' THEN
            IF NEW.origen = 'AUTOGESTIONADA' AND COALESCE(v_actor_rol, 'SOCIO') = 'SOCIO' THEN
                SELECT (NEW.fecha + f.hora_inicio) AT TIME ZONE 'America/Argentina/Cordoba'
                  INTO v_inicio_turno
                FROM franjas_horarias f
                WHERE f.id_franja = NEW.id_franja;

                IF now() > v_inicio_turno - INTERVAL '1 day' THEN
                    RAISE EXCEPTION 'La cancelación debe hacerse con al menos 1 día de antelación (RF08/RF09)';
                END IF;
            END IF;
            NEW.cancelado_en := now();
        END IF;
    END IF;

    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_before_update_reserva
    BEFORE UPDATE ON reservas
    FOR EACH ROW EXECUTE FUNCTION fn_before_update_reserva();

-- RF14/RNF05: auditoría de alta y cambios de estado de reserva.
CREATE OR REPLACE FUNCTION fn_auditoria_reserva()
RETURNS TRIGGER AS $$
DECLARE
    v_id_usuario UUID;
BEGIN
    SELECT id_usuario INTO v_id_usuario FROM usuarios WHERE id_usuario = NEW.id_persona;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO registros_auditoria (actor_tipo, id_usuario, evento, entidad, id_entidad, detalle)
        VALUES ('SISTEMA', v_id_usuario, 'RESERVA_CREADA', 'reservas', NEW.id_reserva,
                jsonb_build_object('estado', NEW.estado, 'origen', NEW.origen, 'id_persona', NEW.id_persona));
    ELSIF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO registros_auditoria (actor_tipo, id_usuario, evento, entidad, id_entidad, detalle)
        VALUES ('SISTEMA', v_id_usuario, 'RESERVA_CAMBIO_ESTADO', 'reservas', NEW.id_reserva,
                jsonb_build_object('estado_anterior', OLD.estado, 'estado_nuevo', NEW.estado));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditoria_reserva
    AFTER INSERT OR UPDATE ON reservas
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria_reserva();

-- =====================================================================
-- 10. DETALLE ALQUILER EQUIPAMIENTO
-- =====================================================================
CREATE TABLE detalle_alquiler_equipamiento (
    id_detalle                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_reserva                UUID NOT NULL REFERENCES reservas(id_reserva) ON DELETE CASCADE,
    id_equipamiento           UUID NOT NULL REFERENCES equipamientos(id_equipamiento),
    cantidad                  INT NOT NULL CHECK (cantidad > 0),
    precio_unitario           NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal                  NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    fecha_devolucion_estimada TIMESTAMPTZ,
    fecha_devolucion_real     TIMESTAMPTZ,
    estado_devolucion         TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_devolucion IN ('PENDIENTE', 'DEVUELTO', 'DEVUELTO_TARDE', 'NO_DEVUELTO')),
    creado_en                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_reserva, id_equipamiento)
);
COMMENT ON TABLE detalle_alquiler_equipamiento IS 'Equipamiento alquilado en cada reserva (RF03.2, RF12, RF13). Solo para reservas de usuarios ACTIVOS (los invitados no alquilan, RF21.3).';

CREATE INDEX idx_detalle_reserva ON detalle_alquiler_equipamiento (id_reserva);

-- Completa precio_unitario/subtotal si no vienen cargados y valida que:
-- a) la reserva sea de un usuario ACTIVO (no invitado, RF21.3);
-- b) el equipamiento sea de la disciplina de la cancha reservada (RF12.2);
-- c) haya stock suficiente, descontándolo de inmediato con lock de fila
--    (SELECT ... FOR UPDATE) para descuento atómico (RNF03).
CREATE OR REPLACE FUNCTION fn_validar_alquiler_equipamiento()
RETURNS TRIGGER AS $$
DECLARE
    v_id_persona        UUID;
    v_estado_usuario     TEXT;
    v_disciplina_cancha  UUID;
    v_disciplina_equipo  UUID;
    v_stock_disponible   INT;
    v_precio_alquiler    NUMERIC(10,2);
BEGIN
    SELECT r.id_persona, c.id_disciplina
      INTO v_id_persona, v_disciplina_cancha
    FROM reservas r
    JOIN franjas_horarias f ON f.id_franja = r.id_franja
    JOIN canchas c          ON c.id_cancha = f.id_cancha
    WHERE r.id_reserva = NEW.id_reserva;

    SELECT estado INTO v_estado_usuario FROM usuarios WHERE id_usuario = v_id_persona;

    IF v_estado_usuario IS NULL THEN
        RAISE EXCEPTION 'Un invitado no puede alquilar equipamiento (RF21.3)';
    ELSIF v_estado_usuario <> 'ACTIVO' THEN
        RAISE EXCEPTION 'El usuario debe estar ACTIVO para alquilar equipamiento (RF17)';
    END IF;

    SELECT id_disciplina, stock_disponible, precio_alquiler
      INTO v_disciplina_equipo, v_stock_disponible, v_precio_alquiler
    FROM equipamientos
    WHERE id_equipamiento = NEW.id_equipamiento
    FOR UPDATE;

    IF v_disciplina_equipo <> v_disciplina_cancha THEN
        RAISE EXCEPTION 'El equipamiento debe pertenecer a la disciplina de la cancha reservada (RF12.2)';
    END IF;

    IF v_stock_disponible < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el equipamiento solicitado (RF12.3)';
    END IF;

    IF NEW.precio_unitario IS NULL THEN
        NEW.precio_unitario := v_precio_alquiler;
    END IF;
    NEW.subtotal := NEW.precio_unitario * NEW.cantidad;

    UPDATE equipamientos SET stock_disponible = stock_disponible - NEW.cantidad
    WHERE id_equipamiento = NEW.id_equipamiento;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_alquiler_equipamiento
    BEFORE INSERT ON detalle_alquiler_equipamiento
    FOR EACH ROW EXECUTE FUNCTION fn_validar_alquiler_equipamiento();

-- RF13.1: fecha_devolucion_estimada = fin de franja + 15 min.
CREATE OR REPLACE FUNCTION fn_set_fecha_devolucion_estimada()
RETURNS TRIGGER AS $$
DECLARE
    v_hora_fin TIME;
    v_fecha    DATE;
BEGIN
    IF NEW.fecha_devolucion_estimada IS NULL THEN
        SELECT f.hora_fin, r.fecha INTO v_hora_fin, v_fecha
        FROM reservas r JOIN franjas_horarias f ON f.id_franja = r.id_franja
        WHERE r.id_reserva = NEW.id_reserva;

        NEW.fecha_devolucion_estimada := (v_fecha + v_hora_fin) AT TIME ZONE 'America/Argentina/Cordoba' + INTERVAL '15 minutes';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_fecha_devolucion_estimada
    BEFORE INSERT ON detalle_alquiler_equipamiento
    FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_devolucion_estimada();

-- Mantiene reservas.monto_total = precio_base de la cancha + suma de
-- subtotales de equipamiento, recalculando ante cualquier alta, baja
-- o modificación de detalle_alquiler_equipamiento.
CREATE OR REPLACE FUNCTION fn_recalcular_monto_reserva()
RETURNS TRIGGER AS $$
DECLARE
    v_id_reserva  UUID := COALESCE(NEW.id_reserva, OLD.id_reserva);
    v_precio_base NUMERIC(10,2);
    v_suma_equipo NUMERIC(10,2);
BEGIN
    SELECT c.precio_base INTO v_precio_base
    FROM reservas r
    JOIN franjas_horarias f ON f.id_franja = r.id_franja
    JOIN canchas c          ON c.id_cancha = f.id_cancha
    WHERE r.id_reserva = v_id_reserva;

    SELECT COALESCE(SUM(subtotal), 0) INTO v_suma_equipo
    FROM detalle_alquiler_equipamiento WHERE id_reserva = v_id_reserva;

    UPDATE reservas SET monto_total = v_precio_base + v_suma_equipo, actualizado_en = now()
    WHERE id_reserva = v_id_reserva;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalcular_monto_reserva
    AFTER INSERT OR UPDATE OR DELETE ON detalle_alquiler_equipamiento
    FOR EACH ROW EXECUTE FUNCTION fn_recalcular_monto_reserva();

-- RF13.2/RF13.3/RF13.4: al registrar la devolución, repone stock salvo
-- NO_DEVUELTO, y lleva el contador de incumplimientos hasta suspender
-- la cuenta al tercero.
CREATE OR REPLACE FUNCTION fn_gestionar_devolucion_equipamiento()
RETURNS TRIGGER AS $$
DECLARE
    v_id_persona      UUID;
    v_incumplimientos INT;
BEGIN
    IF OLD.estado_devolucion IS DISTINCT FROM NEW.estado_devolucion THEN

        IF NEW.estado_devolucion IN ('DEVUELTO', 'DEVUELTO_TARDE') THEN
            UPDATE equipamientos SET stock_disponible = stock_disponible + NEW.cantidad
            WHERE id_equipamiento = NEW.id_equipamiento;
        END IF;

        IF NEW.estado_devolucion IN ('DEVUELTO_TARDE', 'NO_DEVUELTO') THEN
            SELECT r.id_persona INTO v_id_persona FROM reservas r WHERE r.id_reserva = NEW.id_reserva;

            UPDATE usuarios SET incumplimientos_equipamiento = incumplimientos_equipamiento + 1, actualizado_en = now()
            WHERE id_usuario = v_id_persona
            RETURNING incumplimientos_equipamiento INTO v_incumplimientos;

            IF v_incumplimientos IS NOT NULL THEN
                INSERT INTO registros_auditoria (actor_tipo, id_usuario, evento, entidad, id_entidad, detalle)
                VALUES ('SISTEMA', v_id_persona, 'INCUMPLIMIENTO_EQUIPAMIENTO', 'detalle_alquiler_equipamiento', NEW.id_detalle,
                        jsonb_build_object('estado_devolucion', NEW.estado_devolucion, 'total_incumplimientos', v_incumplimientos));

                IF v_incumplimientos >= 3 THEN
                    UPDATE usuarios SET estado = 'SUSPENDIDO', actualizado_en = now()
                    WHERE id_usuario = v_id_persona AND estado <> 'SUSPENDIDO';

                    INSERT INTO registros_auditoria (actor_tipo, id_usuario, evento, entidad, id_entidad, detalle)
                    VALUES ('SISTEMA', v_id_persona, 'USUARIO_SUSPENDIDO_POR_INCUMPLIMIENTOS', 'usuarios', v_id_persona,
                            jsonb_build_object('incumplimientos', v_incumplimientos));
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gestionar_devolucion_equipamiento
    AFTER UPDATE ON detalle_alquiler_equipamiento
    FOR EACH ROW EXECUTE FUNCTION fn_gestionar_devolucion_equipamiento();

-- RF13.3: marca NO_DEVUELTO tras 24hs sin devolución post-franja.
-- Programar como job periódico (pg_cron / Supabase scheduled function):
--   select cron.schedule('marcar-no-devueltos', '*/15 * * * *',
--   'select fn_marcar_no_devueltos()');
CREATE OR REPLACE FUNCTION fn_marcar_no_devueltos()
RETURNS void AS $$
BEGIN
    UPDATE detalle_alquiler_equipamiento
       SET estado_devolucion = 'NO_DEVUELTO'
     WHERE estado_devolucion = 'PENDIENTE'
       AND fecha_devolucion_estimada IS NOT NULL
       AND fecha_devolucion_estimada + INTERVAL '24 hours' < now();
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 11. REGISTROS DE AUDITORÍA — solo-append.
-- =====================================================================
CREATE TABLE registros_auditoria (
    id_registro UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_tipo  TEXT NOT NULL DEFAULT 'USUARIO' CHECK (actor_tipo IN ('USUARIO', 'SISTEMA')),
    id_usuario  UUID REFERENCES usuarios(id_usuario),
    evento      TEXT NOT NULL,
    entidad     TEXT NOT NULL,
    id_entidad  UUID,
    detalle     JSONB,
    fecha       TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE registros_auditoria IS 'Eventos de auditoría con actor y fecha (RF14, RNF05). Solo-append.';

CREATE INDEX idx_auditoria_actor ON registros_auditoria (id_usuario);
CREATE INDEX idx_auditoria_fecha ON registros_auditoria (fecha);

-- RNF05: solo-append a nivel de permisos, no solo de convención.
-- Ajustar el nombre de rol al que use realmente el backend/Supabase.
REVOKE UPDATE, DELETE ON registros_auditoria FROM PUBLIC;

-- =====================================================================
-- 12. RF15: cancha a MANTENIMIENTO -> cancela reservas CONFIRMADA
--     futuras y libera stock de equipamiento pendiente de retiro.
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_cancha_a_mantenimiento()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'MANTENIMIENTO' AND OLD.estado IS DISTINCT FROM NEW.estado THEN

        UPDATE equipamientos e
           SET stock_disponible = e.stock_disponible + d.cantidad
        FROM detalle_alquiler_equipamiento d
        JOIN reservas r         ON r.id_reserva = d.id_reserva
        JOIN franjas_horarias f ON f.id_franja = r.id_franja
        WHERE f.id_cancha = NEW.id_cancha
          AND r.estado = 'CONFIRMADA'
          AND r.fecha >= CURRENT_DATE
          AND d.estado_devolucion = 'PENDIENTE'
          AND e.id_equipamiento = d.id_equipamiento;

        -- Bypass de la política de antelación de 1 día: es una baja
        -- forzada por mantenimiento, no una cancelación del socio.
        PERFORM set_config('app.actor_rol', 'ADMINISTRADOR', true);

        UPDATE reservas r
           SET estado = 'CANCELADA'
        FROM franjas_horarias f
        WHERE f.id_franja = r.id_franja
          AND f.id_cancha = NEW.id_cancha
          AND r.estado = 'CONFIRMADA'
          AND r.fecha >= CURRENT_DATE;

        INSERT INTO registros_auditoria (actor_tipo, evento, entidad, id_entidad, detalle)
        VALUES ('SISTEMA', 'CANCHA_A_MANTENIMIENTO', 'canchas', NEW.id_cancha,
                jsonb_build_object('reservas_canceladas_desde', CURRENT_DATE));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cancha_a_mantenimiento
    AFTER UPDATE ON canchas
    FOR EACH ROW EXECUTE FUNCTION fn_cancha_a_mantenimiento();

-- =====================================================================
-- 13. ROW LEVEL SECURITY — postura "deny-all" desde el día uno.
--     Sin políticas todavía => acceso denegado a cualquier rol que no
--     sea service_role. El backend usa la service_role key de Supabase,
--     que ignora RLS. Las políticas por rol se agregan en la fase de
--     Backend (RF06.3).
-- =====================================================================
ALTER TABLE personas                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos_persona             ENABLE ROW LEVEL SECURITY;
ALTER TABLE direcciones_persona           ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_permiso           ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE canchas                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE franjas_horarias              ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamientos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_alquiler_equipamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_auditoria           ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 14. DATOS INICIALES DE REFERENCIA
-- =====================================================================
INSERT INTO disciplinas (nombre, descripcion)
VALUES
    ('Fútbol', 'Canchas de fútbol 5/7/11'),
    ('Tenis',  'Canchas de tenis'),
    ('Pádel',  'Canchas de pádel')
ON CONFLICT (nombre) DO NOTHING;
