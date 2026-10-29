-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Persona" (
    "id_persona" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dni" TEXT NOT NULL,
    "cuil" TEXT,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "fecha_nacimiento" DATE,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id_persona")
);

-- CreateTable
CREATE TABLE "public"."ContactoPersona" (
    "id_contacto" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_persona" UUID NOT NULL,
    "tipo_contacto" TEXT NOT NULL,
    "valor_contacto" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "inactivated_at" TIMESTAMPTZ,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactoPersona_pkey" PRIMARY KEY ("id_contacto")
);

-- CreateTable
CREATE TABLE "public"."DireccionPersona" (
    "id_direccion" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_persona" UUID NOT NULL,
    "tipo_direccion" TEXT NOT NULL,
    "calle" TEXT,
    "numero" TEXT,
    "piso" TEXT,
    "departamento" TEXT,
    "codigo_postal" TEXT,
    "localidad" TEXT,
    "provincia" TEXT,
    "pais" TEXT NOT NULL DEFAULT 'Argentina',
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "inactivated_at" TIMESTAMPTZ,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DireccionPersona_pkey" PRIMARY KEY ("id_direccion")
);

-- CreateTable
CREATE TABLE "public"."Usuario" (
    "id_usuario" UUID NOT NULL,
    "id_contacto_login" UUID,
    "rol" TEXT NOT NULL DEFAULT 'SOCIO',
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "password_hash" TEXT,
    "incumplimientos_equipamiento" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "public"."SolicitudPermiso" (
    "id_solicitud" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_persona" UUID NOT NULL,
    "origen" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "id_gestor_aprobador" UUID,
    "id_usuario_generado" UUID,
    "fecha_solicitud" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_resolucion" TIMESTAMPTZ,

    CONSTRAINT "SolicitudPermiso_pkey" PRIMARY KEY ("id_solicitud")
);

-- CreateTable
CREATE TABLE "public"."RegistroAuditoria" (
    "id_registro" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_tipo" TEXT NOT NULL DEFAULT 'SISTEMA',
    "id_usuario" UUID,
    "evento" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "id_entidad" UUID,
    "detalle" JSONB,
    "fecha" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id_registro")
);

-- CreateTable
CREATE TABLE "public"."Disciplina" (
    "id_disciplina" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disciplina_pkey" PRIMARY KEY ("id_disciplina")
);

-- CreateTable
CREATE TABLE "public"."Cancha" (
    "id_cancha" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_disciplina" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "superficie" TEXT,
    "precio_base" DECIMAL(10,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cancha_pkey" PRIMARY KEY ("id_cancha")
);

-- CreateTable
CREATE TABLE "public"."FranjaHoraria" (
    "id_franja" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_cancha" UUID NOT NULL,
    "dia_semana" SMALLINT NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FranjaHoraria_pkey" PRIMARY KEY ("id_franja")
);

-- CreateTable
CREATE TABLE "public"."Equipamiento" (
    "id_equipamiento" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_disciplina" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "stock_total" INTEGER NOT NULL,
    "stock_disponible" INTEGER NOT NULL,
    "precio_alquiler" DECIMAL(10,2) NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Equipamiento_pkey" PRIMARY KEY ("id_equipamiento")
);

-- CreateTable
CREATE TABLE "public"."Reserva" (
    "id_reserva" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_franja" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "id_persona" UUID NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'CONFIRMADA',
    "origen" TEXT NOT NULL DEFAULT 'AUTOGESTIONADA',
    "monto_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelado_en" TIMESTAMPTZ,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id_reserva")
);

-- CreateTable
CREATE TABLE "public"."DetalleAlquilerEquipamiento" (
    "id_detalle" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_reserva" UUID NOT NULL,
    "id_equipamiento" UUID NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(10,2),
    "subtotal" DECIMAL(10,2),
    "fecha_devolucion_estimada" TIMESTAMPTZ,
    "fecha_devolucion_real" TIMESTAMPTZ,
    "estado_devolucion" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DetalleAlquilerEquipamiento_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_dni_key" ON "public"."Persona"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_cuil_key" ON "public"."Persona"("cuil");

-- CreateIndex
CREATE INDEX "Persona_apellido_nombre_idx" ON "public"."Persona"("apellido", "nombre");

-- CreateIndex
CREATE INDEX "ContactoPersona_id_persona_idx" ON "public"."ContactoPersona"("id_persona");

-- CreateIndex
CREATE UNIQUE INDEX "ContactoPersona_id_persona_tipo_contacto_valor_contacto_key" ON "public"."ContactoPersona"("id_persona", "tipo_contacto", "valor_contacto");

-- CreateIndex
CREATE INDEX "DireccionPersona_id_persona_idx" ON "public"."DireccionPersona"("id_persona");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_id_contacto_login_key" ON "public"."Usuario"("id_contacto_login");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudPermiso_id_usuario_generado_key" ON "public"."SolicitudPermiso"("id_usuario_generado");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_id_usuario_fecha_idx" ON "public"."RegistroAuditoria"("id_usuario", "fecha" DESC);

-- CreateIndex
CREATE INDEX "RegistroAuditoria_entidad_id_entidad_fecha_idx" ON "public"."RegistroAuditoria"("entidad", "id_entidad", "fecha" DESC);

-- CreateIndex
CREATE INDEX "RegistroAuditoria_fecha_idx" ON "public"."RegistroAuditoria"("fecha" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Disciplina_nombre_key" ON "public"."Disciplina"("nombre");

-- CreateIndex
CREATE INDEX "Cancha_id_disciplina_estado_idx" ON "public"."Cancha"("id_disciplina", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Cancha_id_disciplina_nombre_key" ON "public"."Cancha"("id_disciplina", "nombre");

-- CreateIndex
CREATE INDEX "FranjaHoraria_id_cancha_dia_semana_hora_inicio_idx" ON "public"."FranjaHoraria"("id_cancha", "dia_semana", "hora_inicio");

-- CreateIndex
CREATE UNIQUE INDEX "FranjaHoraria_id_cancha_dia_semana_hora_inicio_key" ON "public"."FranjaHoraria"("id_cancha", "dia_semana", "hora_inicio");

-- CreateIndex
CREATE INDEX "Equipamiento_id_disciplina_idx" ON "public"."Equipamiento"("id_disciplina");

-- CreateIndex
CREATE UNIQUE INDEX "Equipamiento_id_disciplina_nombre_key" ON "public"."Equipamiento"("id_disciplina", "nombre");

-- CreateIndex
CREATE INDEX "Reserva_fecha_idx" ON "public"."Reserva"("fecha");

-- CreateIndex
CREATE INDEX "Reserva_id_persona_fecha_idx" ON "public"."Reserva"("id_persona", "fecha" DESC);

-- CreateIndex
CREATE INDEX "Reserva_estado_fecha_idx" ON "public"."Reserva"("estado", "fecha");

-- CreateIndex
CREATE INDEX "DetalleAlquilerEquipamiento_id_reserva_idx" ON "public"."DetalleAlquilerEquipamiento"("id_reserva");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleAlquilerEquipamiento_id_reserva_id_equipamiento_key" ON "public"."DetalleAlquilerEquipamiento"("id_reserva", "id_equipamiento");

-- AddForeignKey
ALTER TABLE "public"."ContactoPersona" ADD CONSTRAINT "ContactoPersona_id_persona_fkey" FOREIGN KEY ("id_persona") REFERENCES "public"."Persona"("id_persona") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DireccionPersona" ADD CONSTRAINT "DireccionPersona_id_persona_fkey" FOREIGN KEY ("id_persona") REFERENCES "public"."Persona"("id_persona") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Usuario" ADD CONSTRAINT "Usuario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Persona"("id_persona") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Usuario" ADD CONSTRAINT "Usuario_id_contacto_login_fkey" FOREIGN KEY ("id_contacto_login") REFERENCES "public"."ContactoPersona"("id_contacto") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SolicitudPermiso" ADD CONSTRAINT "SolicitudPermiso_id_persona_fkey" FOREIGN KEY ("id_persona") REFERENCES "public"."Persona"("id_persona") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SolicitudPermiso" ADD CONSTRAINT "SolicitudPermiso_id_gestor_aprobador_fkey" FOREIGN KEY ("id_gestor_aprobador") REFERENCES "public"."Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SolicitudPermiso" ADD CONSTRAINT "SolicitudPermiso_id_usuario_generado_fkey" FOREIGN KEY ("id_usuario_generado") REFERENCES "public"."Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegistroAuditoria" ADD CONSTRAINT "RegistroAuditoria_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cancha" ADD CONSTRAINT "Cancha_id_disciplina_fkey" FOREIGN KEY ("id_disciplina") REFERENCES "public"."Disciplina"("id_disciplina") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FranjaHoraria" ADD CONSTRAINT "FranjaHoraria_id_cancha_fkey" FOREIGN KEY ("id_cancha") REFERENCES "public"."Cancha"("id_cancha") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Equipamiento" ADD CONSTRAINT "Equipamiento_id_disciplina_fkey" FOREIGN KEY ("id_disciplina") REFERENCES "public"."Disciplina"("id_disciplina") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reserva" ADD CONSTRAINT "Reserva_id_franja_fkey" FOREIGN KEY ("id_franja") REFERENCES "public"."FranjaHoraria"("id_franja") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reserva" ADD CONSTRAINT "Reserva_id_persona_fkey" FOREIGN KEY ("id_persona") REFERENCES "public"."Persona"("id_persona") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DetalleAlquilerEquipamiento" ADD CONSTRAINT "DetalleAlquilerEquipamiento_id_reserva_fkey" FOREIGN KEY ("id_reserva") REFERENCES "public"."Reserva"("id_reserva") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DetalleAlquilerEquipamiento" ADD CONSTRAINT "DetalleAlquilerEquipamiento_id_equipamiento_fkey" FOREIGN KEY ("id_equipamiento") REFERENCES "public"."Equipamiento"("id_equipamiento") ON DELETE RESTRICT ON UPDATE CASCADE;

