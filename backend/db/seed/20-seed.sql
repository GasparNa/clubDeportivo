-- =====================================================================
-- SEED DE DESARROLLO — Club Deportivo
--
-- Se ejecuta automáticamente en el primer arranque del contenedor
-- (docker-entrypoint-initdb.d), después de esquema-final.sql.
--
-- Idempotente: todos los INSERT usan ON CONFLICT DO NOTHING.
-- No modifica el esquema ni duplica las 3 disciplinas base.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Persona administradora
-- ---------------------------------------------------------------------
INSERT INTO personas (
    id_persona,
    dni,
    cuil,
    nombre,
    apellido
)
VALUES (
    '00000000-0000-4000-8000-000000000001',
    '30000000',
    NULL,
    'Admin',
    'Club'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Contacto de login (email activo)
-- ---------------------------------------------------------------------
INSERT INTO contactos_persona (
    id_contacto,
    id_persona,
    tipo_contacto,
    valor_contacto,
    estado
)
VALUES (
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    'EMAIL',
    'admin@club.com',
    'ACTIVO'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Usuario administrador
--    Password de desarrollo: Admin1234!
--    Hash bcrypt (10 rondas) generado con bcryptjs.
-- ---------------------------------------------------------------------
INSERT INTO usuarios (
    id_usuario,
    id_contacto_login,
    rol,
    estado,
    password_hash
)
VALUES (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000011',
    'ADMINISTRADOR',
    'ACTIVO',
    '$2b$10$UKVhiBkR6U43DXWs/yCBR.M4pApMUMCOydhtr9wXrAgd3jDlq1mSq'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Canchas (2 por disciplina)
-- ---------------------------------------------------------------------
INSERT INTO canchas (
    id_cancha,
    id_disciplina,
    nombre,
    superficie,
    precio_base,
    estado
)
SELECT
    v.id_cancha,
    d.id_disciplina,
    v.nombre,
    v.superficie,
    v.precio_base,
    'DISPONIBLE'
FROM (
    VALUES
        ('10000000-0000-4000-8000-000000000001'::uuid, 'Fútbol', 'Cancha Fútbol 1', 'Césped sintético', 12000.00),
        ('10000000-0000-4000-8000-000000000002'::uuid, 'Fútbol', 'Cancha Fútbol 2', 'Césped sintético', 12000.00),
        ('10000000-0000-4000-8000-000000000003'::uuid, 'Tenis',  'Cancha Tenis 1',  'Polvo de ladrillo', 8000.00),
        ('10000000-0000-4000-8000-000000000004'::uuid, 'Tenis',  'Cancha Tenis 2',  'Polvo de ladrillo', 8000.00),
        ('10000000-0000-4000-8000-000000000005'::uuid, 'Pádel',  'Cancha Pádel 1',  'Césped sintético', 10000.00),
        ('10000000-0000-4000-8000-000000000006'::uuid, 'Pádel',  'Cancha Pádel 2',  'Césped sintético', 10000.00)
) AS v (id_cancha, disciplina, nombre, superficie, precio_base)
JOIN disciplinas d ON d.nombre = v.disciplina
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. Franjas horarias
--    7 días × 3 franjas para cada cancha (126 filas).
--    dia_semana usa la convención de EXTRACT(DOW): 0 = domingo.
-- ---------------------------------------------------------------------
INSERT INTO franjas_horarias (
    id_cancha,
    dia_semana,
    hora_inicio,
    hora_fin
)
SELECT
    c.id_cancha,
    d.dia,
    h.hora_inicio,
    h.hora_fin
FROM canchas c
CROSS JOIN generate_series(0, 6) AS d (dia)
CROSS JOIN (
    VALUES
        (TIME '09:00', TIME '11:00'),
        (TIME '14:00', TIME '16:00'),
        (TIME '18:00', TIME '20:00')
) AS h (hora_inicio, hora_fin)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. Equipamiento (2 ítems por disciplina)
-- ---------------------------------------------------------------------
INSERT INTO equipamientos (
    id_equipamiento,
    id_disciplina,
    nombre,
    stock_total,
    stock_disponible,
    precio_alquiler
)
SELECT
    v.id_equipamiento,
    d.id_disciplina,
    v.nombre,
    v.stock_total,
    v.stock_total,
    v.precio_alquiler
FROM (
    VALUES
        ('20000000-0000-4000-8000-000000000001'::uuid, 'Fútbol', 'Pelotas de fútbol (set x5)', 10, 2500.00),
        ('20000000-0000-4000-8000-000000000002'::uuid, 'Fútbol', 'Pecheras (set x10)',         8,  1500.00),
        ('20000000-0000-4000-8000-000000000003'::uuid, 'Tenis',  'Raquetas (par)',             6,  2000.00),
        ('20000000-0000-4000-8000-000000000004'::uuid, 'Tenis',  'Tubos de pelotas',          12,   800.00),
        ('20000000-0000-4000-8000-000000000005'::uuid, 'Pádel',  'Paletas (par)',              8,  1800.00),
        ('20000000-0000-4000-8000-000000000006'::uuid, 'Pádel',  'Tubos de pelotas',          12,   900.00)
) AS v (id_equipamiento, disciplina, nombre, stock_total, precio_alquiler)
JOIN disciplinas d ON d.nombre = v.disciplina
ON CONFLICT DO NOTHING;
