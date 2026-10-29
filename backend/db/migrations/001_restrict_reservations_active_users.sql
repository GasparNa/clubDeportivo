-- =====================================================================
-- MIGRACIÓN: Restringir reservas solo a usuarios ACTIVOS
-- Fecha: 2026-10-07
-- Descripción: Modifica fn_validar_reserva para rechazar reservas de
--              personas sin usuario o con usuario no ACTIVO
-- =====================================================================

-- Función idempotente: elimina y recrea el trigger con la nueva lógica
DROP TRIGGER IF EXISTS trg_validar_reserva ON reservas;

DROP FUNCTION IF EXISTS fn_validar_reserva();

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
    -- Usuario - Solo usuarios ACTIVOS pueden reservar
    -- ---------------------------------------------------------------

    SELECT estado
    INTO v_estado_usuario
    FROM usuarios
    WHERE id_usuario = NEW.id_persona;


    IF v_estado_usuario IS NULL
       OR v_estado_usuario <> 'ACTIVO'
    THEN

        RAISE EXCEPTION
            'Solo usuarios registrados y activos pueden reservar';

    END IF;


    -- ---------------------------------------------------------------
    -- Máximo 2 reservas confirmadas por usuario activo
    --
    -- Se utiliza advisory lock para evitar race conditions.
    -- ---------------------------------------------------------------

    IF NEW.estado = 'CONFIRMADA'
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


-- Verificación: confirmar que el trigger existe y la función compila
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_validar_reserva'
          AND tgrelid = 'reservas'::regclass
    ) THEN
        RAISE EXCEPTION 'Migración fallida: trigger trg_validar_reserva no creado';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'fn_validar_reserva'
    ) THEN
        RAISE EXCEPTION 'Migración fallida: función fn_validar_reserva no creada';
    END IF;
    
    RAISE NOTICE 'Migración aplicada correctamente: fn_validar_reserva actualizada para requerir usuario ACTIVO';
END $$;