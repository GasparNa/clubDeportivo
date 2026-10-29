-- =====================================================================
-- CLUB DEPORTIVO — SISTEMA DE RESERVAS
-- ESQUEMA v3 — PostgreSQL 14+ / Supabase
--
-- Principios:
--   1. PERSONAS es la entidad raíz.
--   2. CONTACTOS_PERSONA contiene todos los emails/teléfonos.
--   3. DIRECCIONES_PERSONA contiene las direcciones.
--   4. USUARIOS es un subtipo 0..1 de PERSONAS.
--   5. USUARIOS NO duplica email, teléfono, nombre, DNI, etc.
--   6. Una persona puede tener múltiples emails/teléfonos.
--   7. Una persona puede ser invitado y posteriormente socio sin duplicar su identidad.
--   8. Las reservas referencian PERSONAS.
--   9. La disponibilidad se garantiza mediante índice único parcial.
--  10. El stock de equipamiento se controla transaccionalmente.
--  11. La auditoría es append-only.
--  12. Las bajas lógicas conservan historial.
-- ====================================================================================


-- ====================================================================================
-- 0. EXTENSIONES
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- =====================================================================
-- 1. PERSONAS
-- =====================================================================

CREATE TABLE personas (
    id_persona UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),
    dni TEXT NOT NULL,
    cuil TEXT,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    fecha_nacimiento DATE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_personas_dni UNIQUE (dni),
    CONSTRAINT uq_personas_cuil UNIQUE (cuil),
    CONSTRAINT ck_personas_dni CHECK (length(trim(dni)) > 0),
    CONSTRAINT ck_personas_cuil
        CHECK (
            cuil IS NULL
            OR length(trim(cuil)) > 0
        )
);

COMMENT ON TABLE personas IS
'Entidad raíz de identidad. Toda persona que interactúa con el club existe aquí.';

COMMENT ON COLUMN personas.dni IS
'DNI de la persona. Identificador único dentro del sistema.';

COMMENT ON COLUMN personas.cuil IS
'CUIL/CUIT de la persona cuando corresponda.';


-- Búsquedas frecuentes por apellido/nombre.
CREATE INDEX idx_personas_apellido_nombre
    ON personas (apellido, nombre);


-- =====================================================================
-- 2. CONTACTOS DE PERSONA
-- =====================================================================

CREATE TABLE contactos_persona (
    id_contacto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_persona UUID NOT NULL REFERENCES personas(id_persona) ON DELETE CASCADE,
    tipo_contacto TEXT NOT NULL,
    valor_contacto TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ACTIVO',
    inactivated_at TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_contacto_tipo
        CHECK (
            tipo_contacto IN (
                'EMAIL',
                'TELEFONO'
            )
        ),
    CONSTRAINT ck_contacto_estado
        CHECK (
            estado IN (
                'ACTIVO',
                'INACTIVO'
            )
        ),
    CONSTRAINT ck_contacto_inactivated_at
        CHECK (
            (estado = 'ACTIVO' AND inactivated_at IS NULL)
            OR
            (estado = 'INACTIVO' AND inactivated_at IS NOT NULL)
        ),
    CONSTRAINT ck_contacto_valor
        CHECK (length(trim(valor_contacto)) > 0)
);

COMMENT ON TABLE contactos_persona IS
'Emails y teléfonos de una persona. Una persona puede tener múltiples contactos.';


-- No se permiten dos contactos activos idénticos
-- para la misma persona.
CREATE UNIQUE INDEX uq_contacto_persona_activo
    ON contactos_persona (
        id_persona,
        tipo_contacto,
        valor_contacto
    )
    WHERE estado = 'ACTIVO';


-- Un email activo no puede pertenecer simultáneamente
-- a dos personas.
CREATE UNIQUE INDEX uq_email_activo_global
    ON contactos_persona (lower(trim(valor_contacto)))
    WHERE tipo_contacto = 'EMAIL'
      AND estado = 'ACTIVO';


-- Búsqueda rápida de contactos de una persona.
CREATE INDEX idx_contactos_persona
    ON contactos_persona (id_persona)
    WHERE estado = 'ACTIVO';


-- =====================================================================
-- 3. DIRECCIONES
-- =====================================================================

CREATE TABLE direcciones_persona (
    id_direccion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_persona UUID NOT NULL REFERENCES personas(id_persona) ON DELETE CASCADE,
    tipo_direccion TEXT NOT NULL,
    calle TEXT,
    numero TEXT,
    piso TEXT,
    departamento TEXT,
    codigo_postal TEXT,
    localidad TEXT,
    provincia TEXT,
    pais TEXT NOT NULL DEFAULT 'Argentina',
    estado TEXT NOT NULL DEFAULT 'ACTIVO',
    inactivated_at TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_direccion_tipo
        CHECK (
            tipo_direccion IN (
                'PERSONAL',
                'LABORAL'
            )
        ),
    CONSTRAINT ck_direccion_estado
        CHECK (
            estado IN (
                'ACTIVO',
                'INACTIVO'
            )
        ),
    CONSTRAINT ck_direccion_inactivated_at
        CHECK (
            (estado = 'ACTIVO' AND inactivated_at IS NULL)
            OR
            (estado = 'INACTIVO' AND inactivated_at IS NOT NULL)
        )
);

COMMENT ON TABLE direcciones_persona IS
'Direcciones físicas asociadas a una persona.';

CREATE INDEX idx_direcciones_persona
    ON direcciones_persona (id_persona)
    WHERE estado = 'ACTIVO';

-- =====================================================================
-- 4. FUNCIÓN GENÉRICA PARA updated_at
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_update_actualizado_en()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$;

-- =====================================================================
-- 5. FUNCIÓN PARA inactivated_at
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_set_inactivated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF OLD.estado = 'ACTIVO'
       AND NEW.estado = 'INACTIVO'
    THEN
        NEW.inactivated_at = now();

    ELSIF OLD.estado = 'INACTIVO'
          AND NEW.estado = 'ACTIVO'
    THEN
        NEW.inactivated_at = NULL;
    END IF;

    RETURN NEW;
END;
$$;


-- =====================================================================
-- 6. TRIGGERS DE PERSONAS / CONTACTOS / DIRECCIONES
-- =====================================================================

CREATE TRIGGER trg_personas_actualizado
BEFORE UPDATE ON personas
FOR EACH ROW
EXECUTE FUNCTION fn_update_actualizado_en();


CREATE TRIGGER trg_contactos_actualizado
BEFORE UPDATE ON contactos_persona
FOR EACH ROW
EXECUTE FUNCTION fn_update_actualizado_en();


CREATE TRIGGER trg_direcciones_actualizado
BEFORE UPDATE ON direcciones_persona
FOR EACH ROW
EXECUTE FUNCTION fn_update_actualizado_en();


CREATE TRIGGER trg_contactos_inactivated
BEFORE UPDATE OF estado ON contactos_persona
FOR EACH ROW
EXECUTE FUNCTION fn_set_inactivated_at();


CREATE TRIGGER trg_direcciones_inactivated
BEFORE UPDATE OF estado ON direcciones_persona
FOR EACH ROW
EXECUTE FUNCTION fn_set_inactivated_at();


-- =====================================================================
-- 7. USUARIOS
--
-- Una persona puede tener 0 o 1 cuenta.
--
-- id_usuario = id_persona
--
-- NO contiene:
--   nombre
--   apellido
--   DNI
--   CUIL
--   email
--   teléfono
--
-- Todo eso pertenece a PERSONAS / CONTACTOS_PERSONA.
-- =====================================================================

CREATE TABLE usuarios (
    id_usuario UUID PRIMARY KEY
        REFERENCES personas(id_persona)
        ON DELETE RESTRICT,

    id_contacto_login UUID,

    rol TEXT NOT NULL
        DEFAULT 'SOCIO',

    estado TEXT NOT NULL
        DEFAULT 'PENDIENTE',

    password_hash TEXT,

    incumplimientos_equipamiento INT NOT NULL
        DEFAULT 0,

    creado_en TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    actualizado_en TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    CONSTRAINT ck_usuario_rol
        CHECK (
            rol IN (
                'SOCIO',
                'GERENTE',
                'ADMINISTRADOR'
            )
        ),

    CONSTRAINT ck_usuario_estado
        CHECK (
            estado IN (
                'PENDIENTE',
                'ACTIVO',
                'SUSPENDIDO'
            )
        ),

    CONSTRAINT ck_usuario_incumplimientos
        CHECK (
            incumplimientos_equipamiento >= 0
        )
);

COMMENT ON TABLE usuarios IS
'Cuenta del sistema asociada 1:1 con una persona.';


CREATE TRIGGER trg_usuarios_actualizado
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION fn_update_actualizado_en();


-- =====================================================================
-- 8. FUNCIÓN PARA VALIDAR CONTACTO DE LOGIN
--
-- El contacto utilizado para login debe:
--   - pertenecer a la misma persona;
--   - ser EMAIL;
--   - estar ACTIVO.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_validar_contacto_login()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF NEW.id_contacto_login IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM contactos_persona cp
        WHERE cp.id_contacto = NEW.id_contacto_login
          AND cp.id_persona = NEW.id_usuario
          AND cp.tipo_contacto = 'EMAIL'
          AND cp.estado = 'ACTIVO'
    ) THEN

        RAISE EXCEPTION
            'El contacto de login debe ser un email activo perteneciente a la persona';

    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER trg_validar_contacto_login
BEFORE INSERT OR UPDATE OF id_contacto_login
ON usuarios
FOR EACH ROW
EXECUTE FUNCTION fn_validar_contacto_login();


-- Un contacto solamente puede ser login de un usuario.
CREATE UNIQUE INDEX uq_usuario_contacto_login
    ON usuarios (id_contacto_login)
    WHERE id_contacto_login IS NOT NULL;


-- =====================================================================
-- 9. SOLICITUDES DE PERMISO
-- =====================================================================

CREATE TABLE solicitudes_permiso (
    id_solicitud UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    id_persona UUID NOT NULL
        REFERENCES personas(id_persona)
        ON DELETE RESTRICT,

    origen TEXT NOT NULL,

    estado TEXT NOT NULL
        DEFAULT 'PENDIENTE',

    id_gestor_aprobador UUID
        REFERENCES usuarios(id_usuario),

    id_usuario_generado UUID UNIQUE
        REFERENCES usuarios(id_usuario),

    fecha_solicitud TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    fecha_resolucion TIMESTAMPTZ,

    CONSTRAINT ck_solicitud_origen
        CHECK (
            origen IN (
                'AUTOREGISTRO',
                'GESTIONADA_POR_PERSONAL'
            )
        ),

    CONSTRAINT ck_solicitud_estado
        CHECK (
            estado IN (
                'PENDIENTE',
                'APROBADA',
                'RECHAZADA'
            )
        ),

    CONSTRAINT ck_solicitud_aprobada
        CHECK (
            (
                estado = 'APROBADA'
                AND id_usuario_generado IS NOT NULL
                AND fecha_resolucion IS NOT NULL
            )
            OR
            (
                estado <> 'APROBADA'
                AND id_usuario_generado IS NULL
            )
        )
);

COMMENT ON TABLE solicitudes_permiso IS
'Solicitudes de alta de una persona como usuario/socio del sistema.';


CREATE UNIQUE INDEX uq_solicitud_pendiente_persona
    ON solicitudes_permiso (id_persona)
    WHERE estado = 'PENDIENTE';


-- =====================================================================
-- 10. AUDITORÍA
--
-- Se crea antes de los triggers que la utilizan.
-- =====================================================================

CREATE TABLE registros_auditoria (
    id_registro UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    actor_tipo TEXT NOT NULL
        DEFAULT 'SISTEMA',

    id_usuario UUID
        REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL,

    evento TEXT NOT NULL,

    entidad TEXT NOT NULL,

    id_entidad UUID,

    detalle JSONB,

    fecha TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    CONSTRAINT ck_auditoria_actor
        CHECK (
            actor_tipo IN (
                'USUARIO',
                'SISTEMA'
            )
        )
);

COMMENT ON TABLE registros_auditoria IS
'Registro histórico de eventos del sistema. Debe ser append-only.';


CREATE INDEX idx_auditoria_usuario_fecha
    ON registros_auditoria (id_usuario, fecha DESC);


CREATE INDEX idx_auditoria_entidad_fecha
    ON registros_auditoria (entidad, id_entidad, fecha DESC);


CREATE INDEX idx_auditoria_fecha
    ON registros_auditoria (fecha DESC);


-- Evita modificaciones/borrados accidentales
-- desde usuarios normales.
REVOKE UPDATE, DELETE
ON registros_auditoria
FROM PUBLIC;


-- =====================================================================
-- 11. FUNCIÓN PARA VALIDAR GESTOR
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_validar_gestor()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF NEW.id_gestor_aprobador IS NOT NULL THEN

        IF NOT EXISTS (
            SELECT 1
            FROM usuarios u
            WHERE u.id_usuario = NEW.id_gestor_aprobador
              AND u.rol IN (
                  'GERENTE',
                  'ADMINISTRADOR'
              )
              AND u.estado = 'ACTIVO'
        ) THEN

            RAISE EXCEPTION
                'El gestor debe ser un Gerente o Administrador ACTIVO';

        END IF;

    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER trg_validar_gestor
BEFORE INSERT OR UPDATE
ON solicitudes_permiso
FOR EACH ROW
EXECUTE FUNCTION fn_validar_gestor();


-- =====================================================================
-- 12. PROCESAR SOLICITUD
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_procesar_solicitud()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF NEW.estado = 'APROBADA'
       AND OLD.estado IS DISTINCT FROM NEW.estado
    THEN

        IF NOT EXISTS (
            SELECT 1
            FROM usuarios
            WHERE id_usuario = NEW.id_persona
        ) THEN

            INSERT INTO usuarios (
                id_usuario,
                rol,
                estado
            )
            VALUES (
                NEW.id_persona,
                'SOCIO',
                'PENDIENTE'
            );

        END IF;

        NEW.id_usuario_generado = NEW.id_persona;
        NEW.fecha_resolucion = now();


        INSERT INTO registros_auditoria (
            actor_tipo,
            id_usuario,
            evento,
            entidad,
            id_entidad,
            detalle
        )
        VALUES (
            'USUARIO',
            NEW.id_gestor_aprobador,
            'SOLICITUD_APROBADA',
            'solicitudes_permiso',
            NEW.id_solicitud,
            jsonb_build_object(
                'id_persona', NEW.id_persona
            )
        );


    ELSIF NEW.estado = 'RECHAZADA'
          AND OLD.estado IS DISTINCT FROM NEW.estado
    THEN

        NEW.fecha_resolucion = now();

        INSERT INTO registros_auditoria (
            actor_tipo,
            id_usuario,
            evento,
            entidad,
            id_entidad,
            detalle
        )
        VALUES (
            'USUARIO',
            NEW.id_gestor_aprobador,
            'SOLICITUD_RECHAZADA',
            'solicitudes_permiso',
            NEW.id_solicitud,
            jsonb_build_object(
                'id_persona', NEW.id_persona
            )
        );

    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER trg_procesar_solicitud
BEFORE UPDATE ON solicitudes_permiso
FOR EACH ROW
EXECUTE FUNCTION fn_procesar_solicitud();


-- =====================================================================
-- 13. DISCIPLINAS
-- =====================================================================

CREATE TABLE disciplinas (
    id_disciplina UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    nombre TEXT NOT NULL UNIQUE,

    descripcion TEXT,

    creado_en TIMESTAMPTZ NOT NULL
        DEFAULT now()
);


-- =====================================================================
-- 14. CANCHAS
-- =====================================================================

CREATE TABLE canchas (
    id_cancha UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    id_disciplina UUID NOT NULL
        REFERENCES disciplinas(id_disciplina),

    nombre TEXT NOT NULL,

    superficie TEXT,

    precio_base NUMERIC(10,2) NOT NULL
        CHECK (precio_base >= 0),

    estado TEXT NOT NULL
        DEFAULT 'DISPONIBLE',

    creado_en TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    CONSTRAINT ck_cancha_estado
        CHECK (
            estado IN (
                'DISPONIBLE',
                'MANTENIMIENTO'
            )
        ),

    CONSTRAINT uq_cancha_disciplina_nombre
        UNIQUE (
            id_disciplina,
            nombre
        )
);


CREATE INDEX idx_canchas_disciplina_estado
    ON canchas (
        id_disciplina,
        estado
    );


-- =====================================================================
-- 15. FRANJAS HORARIAS
-- =====================================================================

CREATE TABLE franjas_horarias (
    id_franja UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    id_cancha UUID NOT NULL
        REFERENCES canchas(id_cancha)
        ON DELETE CASCADE,

    dia_semana SMALLINT NOT NULL,

    hora_inicio TIME NOT NULL,

    hora_fin TIME NOT NULL,

    creado_en TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    CONSTRAINT ck_franja_dia
        CHECK (
            dia_semana BETWEEN 0 AND 6
        ),

    CONSTRAINT ck_franja_horas
        CHECK (
            hora_fin > hora_inicio
        ),

    CONSTRAINT uq_franja
        UNIQUE (
            id_cancha,
            dia_semana,
            hora_inicio
        ),

    CONSTRAINT ex_franja_no_solapada
        EXCLUDE USING gist (
            id_cancha WITH =,
            dia_semana WITH =,
            tsrange(hora_inicio::timestamp, hora_fin::timestamp) WITH &&
        )
);


CREATE INDEX idx_franjas_cancha_dia
    ON franjas_horarias (
        id_cancha,
        dia_semana,
        hora_inicio
    );


-- =====================================================================
-- 16. EQUIPAMIENTOS
-- =====================================================================

CREATE TABLE equipamientos (
    id_equipamiento UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    id_disciplina UUID NOT NULL
        REFERENCES disciplinas(id_disciplina),

    nombre TEXT NOT NULL,

    stock_total INT NOT NULL
        CHECK (stock_total >= 0),

    stock_disponible INT NOT NULL
        CHECK (stock_disponible >= 0),

    precio_alquiler NUMERIC(10,2) NOT NULL
        CHECK (precio_alquiler >= 0),

    creado_en TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    CONSTRAINT ck_stock_valido
        CHECK (
            stock_disponible <= stock_total
        ),

    CONSTRAINT uq_equipamiento_disciplina_nombre
        UNIQUE (
            id_disciplina,
            nombre
        )
);


CREATE INDEX idx_equipamientos_disciplina
    ON equipamientos (
        id_disciplina
    );


-- =====================================================================
-- 17. RESERVAS
-- =====================================================================

CREATE TABLE reservas (
    id_reserva UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    id_franja UUID NOT NULL
        REFERENCES franjas_horarias(id_franja),

    fecha DATE NOT NULL,

    id_persona UUID NOT NULL
        REFERENCES personas(id_persona)
        ON DELETE RESTRICT,

    estado TEXT NOT NULL
        DEFAULT 'CONFIRMADA',

    origen TEXT NOT NULL
        DEFAULT 'AUTOGESTIONADA',

    monto_total NUMERIC(10,2) NOT NULL
        DEFAULT 0
        CHECK (monto_total >= 0),

    creado_en TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    actualizado_en TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    cancelado_en TIMESTAMPTZ,

    CONSTRAINT ck_reserva_estado
        CHECK (
            estado IN (
                'CONFIRMADA',
                'EN_CURSO',
                'COMPLETADA',
                'CANCELADA'
            )
        ),

    CONSTRAINT ck_reserva_origen
        CHECK (
            origen IN (
                'AUTOGESTIONADA',
                'MANUAL_GERENCIA'
            )
        ),

    CONSTRAINT ck_reserva_cancelado_en
        CHECK (
            (estado = 'CANCELADA' AND cancelado_en IS NOT NULL)
            OR
            (estado <> 'CANCELADA' AND cancelado_en IS NULL)
        )
);


-- =====================================================================
-- 18. ÍNDICE CRÍTICO DE DISPONIBILIDAD
--
-- Impide dos reservas activas para la misma franja y fecha.
-- La concurrencia queda protegida por PostgreSQL.
-- =====================================================================

CREATE UNIQUE INDEX uq_reserva_franja_fecha_activa
    ON reservas (
        id_franja,
        fecha
    )
    WHERE estado IN (
        'CONFIRMADA',
        'EN_CURSO'
    );


-- Búsqueda por fecha.
CREATE INDEX idx_reservas_fecha
    ON reservas (fecha);


-- Historial de reservas de una persona.
CREATE INDEX idx_reservas_persona_fecha
    ON reservas (
        id_persona,
        fecha DESC
    );


-- Consultas de reservas por estado.
CREATE INDEX idx_reservas_estado_fecha
    ON reservas (
        estado,
        fecha
    );


-- =====================================================================
-- 19. VALIDACIÓN DE RESERVA
--
-- Controla:
--   - que el día de la semana coincida;
--   - que la cancha esté disponible;
--   - que el usuario esté ACTIVO si tiene cuenta;
--   - máximo 2 reservas CONFIRMADAS.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_validar_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_dia_semana INT;
    v_estado_cancha TEXT;
    v_estado_usuario TEXT;
    v_precio NUMERIC(10,2);
    v_cantidad INT;

BEGIN

    v_dia_semana =
        EXTRACT(
            DOW FROM NEW.fecha
        );


    -- ---------------------------------------------------------------
    -- Validar franja / fecha
    -- ---------------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM franjas_horarias f
        WHERE f.id_franja = NEW.id_franja
          AND f.dia_semana = v_dia_semana
    ) THEN

        RAISE EXCEPTION
            'La fecha no corresponde al día de la semana de la franja';

    END IF;


    -- ---------------------------------------------------------------
    -- Estado de cancha y precio
    -- ---------------------------------------------------------------

    SELECT
        c.estado,
        c.precio_base
    INTO
        v_estado_cancha,
        v_precio
    FROM franjas_horarias f
    JOIN canchas c
        ON c.id_cancha = f.id_cancha
    WHERE f.id_franja = NEW.id_franja;


    IF v_estado_cancha = 'MANTENIMIENTO' THEN

        RAISE EXCEPTION
            'La cancha se encuentra en mantenimiento';

    END IF;


    -- ---------------------------------------------------------------
    -- Usuario
    -- ---------------------------------------------------------------

    SELECT estado
    INTO v_estado_usuario
    FROM usuarios
    WHERE id_usuario = NEW.id_persona;


    IF v_estado_usuario IS NOT NULL
       AND v_estado_usuario <> 'ACTIVO'
       AND NEW.estado = 'CONFIRMADA'
    THEN

        RAISE EXCEPTION
            'El usuario debe estar ACTIVO para reservar';

    END IF;


    -- ---------------------------------------------------------------
    -- Máximo 2 reservas confirmadas por socio
    --
    -- Se utiliza advisory lock para evitar race conditions.
    -- ---------------------------------------------------------------

    IF v_estado_usuario = 'ACTIVO'
       AND NEW.estado = 'CONFIRMADA'
    THEN

        PERFORM pg_advisory_xact_lock(
            hashtextextended(
                NEW.id_persona::TEXT,
                0
            )
        );


        SELECT count(*)
        INTO v_cantidad
        FROM reservas
        WHERE id_persona = NEW.id_persona
          AND estado = 'CONFIRMADA';


        IF v_cantidad >= 2 THEN

            RAISE EXCEPTION
                'El usuario ya posee el máximo de 2 reservas confirmadas';

        END IF;

    END IF;


    NEW.monto_total = v_precio;

    RETURN NEW;

END;
$$;


CREATE TRIGGER trg_validar_reserva
BEFORE INSERT ON reservas
FOR EACH ROW
EXECUTE FUNCTION fn_validar_reserva();


-- =====================================================================
-- 20. ACTUALIZACIÓN DE RESERVAS
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_actualizar_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_actor_rol TEXT;
    v_inicio_turno TIMESTAMPTZ;

BEGIN

    v_actor_rol =
        current_setting(
            'app.actor_rol',
            true
        );


    -- ---------------------------------------------------------------
    -- Validar transiciones
    -- ---------------------------------------------------------------

    IF NEW.estado IS DISTINCT FROM OLD.estado THEN

        IF NOT (
            (
                OLD.estado = 'CONFIRMADA'
                AND NEW.estado IN (
                    'EN_CURSO',
                    'CANCELADA'
                )
            )
            OR
            (
                OLD.estado = 'EN_CURSO'
                AND NEW.estado IN (
                    'COMPLETADA',
                    'CANCELADA'
                )
            )
        ) THEN

            RAISE EXCEPTION
                'Transición de estado inválida: % -> %',
                OLD.estado,
                NEW.estado;

        END IF;


        -- -----------------------------------------------------------
        -- Cancelación
        -- -----------------------------------------------------------

        IF NEW.estado = 'CANCELADA' THEN

            IF NEW.origen = 'AUTOGESTIONADA'
               AND COALESCE(v_actor_rol, 'SOCIO') = 'SOCIO'
            THEN

                SELECT
                    (
                        NEW.fecha + f.hora_inicio
                    ) AT TIME ZONE
                    'America/Argentina/Cordoba'

                INTO v_inicio_turno

                FROM franjas_horarias f
                WHERE f.id_franja = NEW.id_franja;


                IF now() >
                   v_inicio_turno - INTERVAL '1 day'
                THEN

                    RAISE EXCEPTION
                        'La cancelación requiere al menos 1 día de antelación';

                END IF;

            END IF;


            NEW.cancelado_en = now();

        END IF;

    END IF;


    NEW.actualizado_en = now();

    RETURN NEW;

END;
$$;


CREATE TRIGGER trg_actualizar_reserva
BEFORE UPDATE ON reservas
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_reserva();


-- =====================================================================
-- 21. DETALLE DE ALQUILER DE EQUIPAMIENTO
-- =====================================================================

CREATE TABLE detalle_alquiler_equipamiento (
    id_detalle UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    id_reserva UUID NOT NULL
        REFERENCES reservas(id_reserva)
        ON DELETE CASCADE,

    id_equipamiento UUID NOT NULL
        REFERENCES equipamientos(id_equipamiento),

    cantidad INT NOT NULL
        CHECK (cantidad > 0),

    precio_unitario NUMERIC(10,2)
        CHECK (precio_unitario >= 0),

    subtotal NUMERIC(10,2)
        CHECK (subtotal >= 0),

    fecha_devolucion_estimada TIMESTAMPTZ,

    fecha_devolucion_real TIMESTAMPTZ,

    estado_devolucion TEXT NOT NULL
        DEFAULT 'PENDIENTE',

    creado_en TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    CONSTRAINT ck_estado_devolucion
        CHECK (
            estado_devolucion IN (
                'PENDIENTE',
                'DEVUELTO',
                'DEVUELTO_TARDE',
                'NO_DEVUELTO',
                'CANCELADO'
            )
        ),

    CONSTRAINT uq_reserva_equipamiento
        UNIQUE (
            id_reserva,
            id_equipamiento
        )
);


CREATE INDEX idx_detalle_reserva
    ON detalle_alquiler_equipamiento (
        id_reserva
    );


CREATE INDEX idx_detalle_devolucion_pendiente
    ON detalle_alquiler_equipamiento (
        fecha_devolucion_estimada
    )
    WHERE estado_devolucion = 'PENDIENTE';


-- =====================================================================
-- 22. VALIDAR / RESERVAR STOCK
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_validar_alquiler_equipamiento()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_persona UUID;
    v_estado_usuario TEXT;

    v_disciplina_cancha UUID;
    v_disciplina_equipo UUID;

    v_stock INT;
    v_precio NUMERIC(10,2);

BEGIN

    -- ---------------------------------------------------------------
    -- Obtener reserva y disciplina
    -- ---------------------------------------------------------------

    SELECT
        r.id_persona,
        c.id_disciplina
    INTO
        v_persona,
        v_disciplina_cancha
    FROM reservas r
    JOIN franjas_horarias f
        ON f.id_franja = r.id_franja
    JOIN canchas c
        ON c.id_cancha = f.id_cancha
    WHERE r.id_reserva = NEW.id_reserva;


    -- ---------------------------------------------------------------
    -- Solo usuarios ACTIVO
    -- ---------------------------------------------------------------

    SELECT estado
    INTO v_estado_usuario
    FROM usuarios
    WHERE id_usuario = v_persona;


    IF v_estado_usuario IS NULL THEN

        RAISE EXCEPTION
            'Un invitado no puede alquilar equipamiento';

    END IF;


    IF v_estado_usuario <> 'ACTIVO' THEN

        RAISE EXCEPTION
            'El usuario debe estar ACTIVO para alquilar equipamiento';

    END IF;


    -- ---------------------------------------------------------------
    -- Lock de fila del equipamiento
    -- ---------------------------------------------------------------

    SELECT
        id_disciplina,
        stock_disponible,
        precio_alquiler
    INTO
        v_disciplina_equipo,
        v_stock,
        v_precio
    FROM equipamientos
    WHERE id_equipamiento = NEW.id_equipamiento
    FOR UPDATE;


    IF v_disciplina_equipo <> v_disciplina_cancha THEN

        RAISE EXCEPTION
            'El equipamiento no corresponde a la disciplina de la cancha';

    END IF;


    IF v_stock < NEW.cantidad THEN

        RAISE EXCEPTION
            'Stock insuficiente';

    END IF;


    NEW.precio_unitario = COALESCE(
        NEW.precio_unitario,
        v_precio
    );


    NEW.subtotal =
        NEW.precio_unitario * NEW.cantidad;


    -- ---------------------------------------------------------------
    -- Reservar stock
    -- ---------------------------------------------------------------

    UPDATE equipamientos
    SET stock_disponible =
        stock_disponible - NEW.cantidad
    WHERE id_equipamiento = NEW.id_equipamiento;


    RETURN NEW;

END;
$$;


CREATE TRIGGER trg_validar_alquiler
BEFORE INSERT ON detalle_alquiler_equipamiento
FOR EACH ROW
EXECUTE FUNCTION fn_validar_alquiler_equipamiento();


-- =====================================================================
-- 23. FECHA DE DEVOLUCIÓN ESTIMADA
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_set_fecha_devolucion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_hora_fin TIME;
    v_fecha DATE;

BEGIN

    IF NEW.fecha_devolucion_estimada IS NULL THEN

        SELECT
            f.hora_fin,
            r.fecha
        INTO
            v_hora_fin,
            v_fecha
        FROM reservas r
        JOIN franjas_horarias f
            ON f.id_franja = r.id_franja
        WHERE r.id_reserva = NEW.id_reserva;


        NEW.fecha_devolucion_estimada =
            (
                v_fecha + v_hora_fin
            ) AT TIME ZONE
            'America/Argentina/Cordoba'
            + INTERVAL '15 minutes';

    END IF;

    RETURN NEW;

END;
$$;


CREATE TRIGGER trg_set_fecha_devolucion
BEFORE INSERT ON detalle_alquiler_equipamiento
FOR EACH ROW
EXECUTE FUNCTION fn_set_fecha_devolucion();


-- =====================================================================
-- 24. RECALCULAR MONTO DE RESERVA
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_recalcular_monto_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_id_reserva UUID;
    v_precio_base NUMERIC(10,2);

BEGIN

    v_id_reserva =
        COALESCE(
            NEW.id_reserva,
            OLD.id_reserva
        );


    SELECT
        c.precio_base
    INTO v_precio_base
    FROM reservas r
    JOIN franjas_horarias f
        ON f.id_franja = r.id_franja
    JOIN canchas c
        ON c.id_cancha = f.id_cancha
    WHERE r.id_reserva = v_id_reserva;


    UPDATE reservas r
    SET
        monto_total =
            v_precio_base
            +
            COALESCE(
                (
                    SELECT SUM(subtotal)
                    FROM detalle_alquiler_equipamiento d
                    WHERE d.id_reserva = v_id_reserva
                      AND d.estado_devolucion <> 'CANCELADO'
                ),
                0
            ),
        actualizado_en = now()
    WHERE r.id_reserva = v_id_reserva;


    RETURN COALESCE(NEW, OLD);

END;
$$;


CREATE TRIGGER trg_recalcular_monto
AFTER INSERT OR UPDATE OR DELETE
ON detalle_alquiler_equipamiento
FOR EACH ROW
EXECUTE FUNCTION fn_recalcular_monto_reserva();


-- =====================================================================
-- 25. DEVOLUCIÓN DE EQUIPAMIENTO
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_gestionar_devolucion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_persona UUID;
    v_incumplimientos INT;

BEGIN

    IF OLD.estado_devolucion IS DISTINCT FROM NEW.estado_devolucion
    THEN

        -- -----------------------------------------------------------
        -- Devolución normal / tardía
        -- -----------------------------------------------------------

        IF NEW.estado_devolucion IN (
            'DEVUELTO',
            'DEVUELTO_TARDE'
        )
        AND OLD.estado_devolucion IN (
            'PENDIENTE',
            'NO_DEVUELTO'
        )
        THEN

            UPDATE equipamientos
            SET stock_disponible =
                stock_disponible + NEW.cantidad
            WHERE id_equipamiento =
                NEW.id_equipamiento;


            NEW.fecha_devolucion_real =
                COALESCE(
                    NEW.fecha_devolucion_real,
                    now()
                );

        END IF;


        -- -----------------------------------------------------------
        -- Incumplimiento
        -- -----------------------------------------------------------

        IF NEW.estado_devolucion IN (
            'DEVUELTO_TARDE',
            'NO_DEVUELTO'
        )
        AND OLD.estado_devolucion = 'PENDIENTE'
        THEN

            SELECT r.id_persona
            INTO v_persona
            FROM reservas r
            WHERE r.id_reserva = NEW.id_reserva;


            UPDATE usuarios
            SET
                incumplimientos_equipamiento =
                    incumplimientos_equipamiento + 1,
                actualizado_en = now()
            WHERE id_usuario = v_persona
            RETURNING incumplimientos_equipamiento
            INTO v_incumplimientos;


            INSERT INTO registros_auditoria (
                actor_tipo,
                id_usuario,
                evento,
                entidad,
                id_entidad,
                detalle
            )
            VALUES (
                'SISTEMA',
                v_persona,
                'INCUMPLIMIENTO_EQUIPAMIENTO',
                'detalle_alquiler_equipamiento',
                NEW.id_detalle,
                jsonb_build_object(
                    'estado',
                    NEW.estado_devolucion,
                    'total_incumplimientos',
                    v_incumplimientos
                )
            );


            -- -------------------------------------------------------
            -- Suspender al tercero
            -- -------------------------------------------------------

            IF v_incumplimientos >= 3 THEN

                UPDATE usuarios
                SET
                    estado = 'SUSPENDIDO',
                    actualizado_en = now()
                WHERE id_usuario = v_persona
                  AND estado <> 'SUSPENDIDO';


                INSERT INTO registros_auditoria (
                    actor_tipo,
                    id_usuario,
                    evento,
                    entidad,
                    id_entidad,
                    detalle
                )
                VALUES (
                    'SISTEMA',
                    v_persona,
                    'USUARIO_SUSPENDIDO_POR_INCUMPLIMIENTOS',
                    'usuarios',
                    v_persona,
                    jsonb_build_object(
                        'incumplimientos',
                        v_incumplimientos
                    )
                );

            END IF;

        END IF;

    END IF;


    RETURN NEW;

END;
$$;


CREATE TRIGGER trg_gestionar_devolucion
AFTER UPDATE OF estado_devolucion
ON detalle_alquiler_equipamiento
FOR EACH ROW
EXECUTE FUNCTION fn_gestionar_devolucion();


-- =====================================================================
-- 26. CANCELACIÓN DE RESERVA -> LIBERAR EQUIPAMIENTO
--
-- Importante:
-- Una reserva cancelada debe devolver al stock el equipamiento
-- que todavía estaba pendiente.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_liberar_equipamiento_cancelado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF NEW.estado = 'CANCELADA'
       AND OLD.estado <> 'CANCELADA'
    THEN

        UPDATE equipamientos e
        SET stock_disponible =
            e.stock_disponible + d.cantidad

        FROM detalle_alquiler_equipamiento d

        WHERE d.id_reserva = NEW.id_reserva
          AND d.id_equipamiento = e.id_equipamiento
          AND d.estado_devolucion = 'PENDIENTE';


        UPDATE detalle_alquiler_equipamiento
        SET estado_devolucion = 'CANCELADO'
        WHERE id_reserva = NEW.id_reserva
          AND estado_devolucion = 'PENDIENTE';

    END IF;


    RETURN NEW;

END;
$$;


CREATE TRIGGER trg_liberar_equipamiento_cancelado
AFTER UPDATE OF estado
ON reservas
FOR EACH ROW
EXECUTE FUNCTION fn_liberar_equipamiento_cancelado();


-- =====================================================================
-- 27. MARCAR EQUIPAMIENTO NO DEVUELTO
--
-- Ejecutar periódicamente mediante pg_cron / Scheduled Function.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_marcar_no_devueltos()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN

    UPDATE detalle_alquiler_equipamiento
    SET estado_devolucion = 'NO_DEVUELTO'

    WHERE estado_devolucion = 'PENDIENTE'

      AND fecha_devolucion_estimada IS NOT NULL

      AND fecha_devolucion_estimada
          + INTERVAL '24 hours'
          < now();

END;
$$;


-- =====================================================================
-- 28. AUDITORÍA DE RESERVAS
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_auditar_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE

    v_id_usuario UUID;

BEGIN

    SELECT id_usuario
    INTO v_id_usuario
    FROM usuarios
    WHERE id_usuario = NEW.id_persona;


    IF TG_OP = 'INSERT'
    THEN

        INSERT INTO registros_auditoria (
            actor_tipo,
            id_usuario,
            evento,
            entidad,
            id_entidad,
            detalle
        )
        VALUES (
            'USUARIO',
            v_id_usuario,
            'RESERVA_CREADA',
            'reservas',
            NEW.id_reserva,
            jsonb_build_object(
                'id_persona', NEW.id_persona,
                'estado', NEW.estado,
                'origen', NEW.origen
            )
        );


    ELSIF TG_OP = 'UPDATE'
          AND OLD.estado IS DISTINCT FROM NEW.estado
    THEN

        INSERT INTO registros_auditoria (
            actor_tipo,
            id_usuario,
            evento,
            entidad,
            id_entidad,
            detalle
        )
        VALUES (
            'USUARIO',
            v_id_usuario,
            'RESERVA_CAMBIO_ESTADO',
            'reservas',
            NEW.id_reserva,
            jsonb_build_object(
                'estado_anterior', OLD.estado,
                'estado_nuevo', NEW.estado
            )
        );

    END IF;


    RETURN NEW;

END;
$$;


CREATE TRIGGER trg_auditar_reserva
AFTER INSERT OR UPDATE OF estado
ON reservas
FOR EACH ROW
EXECUTE FUNCTION fn_auditar_reserva();


-- =====================================================================
-- 29. CANCHA -> MANTENIMIENTO
--
-- La cancelación de las reservas se realiza mediante la lógica
-- normal de CANCELACIÓN, que también libera equipamiento.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_cancha_a_mantenimiento()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF NEW.estado = 'MANTENIMIENTO'
       AND OLD.estado IS DISTINCT FROM NEW.estado
    THEN

        -- La política de cancelación voluntaria no debe aplicarse
        -- a una cancelación provocada por el club.
        PERFORM set_config(
            'app.actor_rol',
            'ADMINISTRADOR',
            true
        );


        UPDATE reservas r
        SET estado = 'CANCELADA'
        FROM franjas_horarias f
        WHERE f.id_franja = r.id_franja
          AND f.id_cancha = NEW.id_cancha
          AND r.estado = 'CONFIRMADA'
          AND r.fecha >= CURRENT_DATE;


        INSERT INTO registros_auditoria (
            actor_tipo,
            evento,
            entidad,
            id_entidad,
            detalle
        )
        VALUES (
            'SISTEMA',
            'CANCHA_A_MANTENIMIENTO',
            'canchas',
            NEW.id_cancha,
            jsonb_build_object(
                'fecha',
                CURRENT_DATE
            )
        );

    END IF;


    RETURN NEW;

END;
$$;


CREATE TRIGGER trg_cancha_mantenimiento
AFTER UPDATE OF estado
ON canchas
FOR EACH ROW
EXECUTE FUNCTION fn_cancha_a_mantenimiento();


-- =====================================================================
-- 30. VISTA DE RESERVAS
--
-- La vista NO mejora automáticamente la velocidad.
-- Es una capa de abstracción para consultas repetitivas.
-- =====================================================================

CREATE VIEW v_reservas_detalle AS
SELECT
    r.id_reserva,

    r.fecha,

    c.id_cancha,
    c.nombre AS cancha_nombre,

    d.id_disciplina,
    d.nombre AS disciplina_nombre,

    f.dia_semana,
    f.hora_inicio,
    f.hora_fin,

    p.id_persona,
    p.nombre AS persona_nombre,
    p.apellido AS persona_apellido,

    u.rol AS reservante_rol,
    u.estado AS usuario_estado,

    r.estado,
    r.origen,
    r.monto_total,

    r.creado_en,
    r.actualizado_en,
    r.cancelado_en

FROM reservas r

JOIN franjas_horarias f
    ON f.id_franja = r.id_franja

JOIN canchas c
    ON c.id_cancha = f.id_cancha

JOIN disciplinas d
    ON d.id_disciplina = c.id_disciplina

JOIN personas p
    ON p.id_persona = r.id_persona

LEFT JOIN usuarios u
    ON u.id_usuario = r.id_persona;


-- =====================================================================
-- 31. ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE personas
ENABLE ROW LEVEL SECURITY;

ALTER TABLE contactos_persona
ENABLE ROW LEVEL SECURITY;

ALTER TABLE direcciones_persona
ENABLE ROW LEVEL SECURITY;

ALTER TABLE usuarios
ENABLE ROW LEVEL SECURITY;

ALTER TABLE solicitudes_permiso
ENABLE ROW LEVEL SECURITY;

ALTER TABLE disciplinas
ENABLE ROW LEVEL SECURITY;

ALTER TABLE canchas
ENABLE ROW LEVEL SECURITY;

ALTER TABLE franjas_horarias
ENABLE ROW LEVEL SECURITY;

ALTER TABLE equipamientos
ENABLE ROW LEVEL SECURITY;

ALTER TABLE reservas
ENABLE ROW LEVEL SECURITY;

ALTER TABLE detalle_alquiler_equipamiento
ENABLE ROW LEVEL SECURITY;

ALTER TABLE registros_auditoria
ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- 32. DATOS INICIALES
-- =====================================================================

INSERT INTO disciplinas (
    nombre,
    descripcion
)
VALUES
    (
        'Fútbol',
        'Canchas de fútbol 5/7/11'
    ),
    (
        'Tenis',
        'Canchas de tenis'
    ),
    (
        'Pádel',
        'Canchas de pádel'
    )
ON CONFLICT (nombre)
DO NOTHING;