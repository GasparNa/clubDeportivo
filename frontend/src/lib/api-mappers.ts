/**
 * Normaliza respuestas del backend (Prisma: id_disciplina, franjaHoraria, etc.)
 * al shape usado por la UI.
 */

import { formatTime, toNumber } from "./format";
import type {
  AlquilerEquipamiento,
  AuthResponse,
  Cancha,
  ContactoPerfil,
  Disciplina,
  Equipamiento,
  FranjaHoraria,
  Pago,
  PerfilUsuario,
  Reserva,
  Role,
  TimeSlotAvailability,
  UserStatus,
} from "./types";

type Raw = Record<string, unknown>;

function asRaw(value: unknown): Raw {
  return value && typeof value === "object" ? (value as Raw) : {};
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function optionalStr(value: unknown): string | undefined {
  const result = str(value);
  return result ? result : undefined;
}

export function pickId(entity: unknown, keys: string[]): string {
  const raw = asRaw(entity);
  for (const key of keys) {
    const value = str(raw[key]);
    if (value) return value;
  }
  return "";
}

export function isVisibleEntity(entity: { estado?: string }): boolean {
  return !entity.estado || entity.estado === "ACTIVO" || entity.estado === "DISPONIBLE";
}

export function courtCount(disciplina: {
  _count?: { canchas?: number } | null;
  canchas?: unknown[] | null;
}): number {
  const counted = disciplina._count?.canchas;
  if (typeof counted === "number") return counted;
  return Array.isArray(disciplina.canchas) ? disciplina.canchas.length : 0;
}

export function normalizeAuthResponse(raw: AuthResponse | Raw): {
  token: string;
  id: string;
  email: string;
  rol: Role;
  estado: UserStatus;
  nombre?: string;
  apellido?: string;
} {
  const data = asRaw(raw);
  const usuario = asRaw(data.usuario);
  const persona = asRaw(usuario.persona);
  const token = str(data.token) || str(data.access_token);
  const id =
    pickId(usuario, ["id", "id_usuario"]) ||
    pickId(persona, ["id", "id_persona"]);

  return {
    token,
    id,
    email: str(usuario.email),
    rol: (str(usuario.rol, "SOCIO") as Role),
    estado: (str(usuario.estado, "ACTIVO") as UserStatus),
    nombre: optionalStr(usuario.nombre) ?? optionalStr(persona.nombre),
    apellido: optionalStr(usuario.apellido) ?? optionalStr(persona.apellido),
  };
}

export function contactoValor(contacto: ContactoPerfil, tipo: string): string | undefined {
  const currentTipo = (contacto.tipo || contacto.tipo_contacto || "").toUpperCase();
  if (currentTipo !== tipo.toUpperCase()) return undefined;
  return contacto.valor || contacto.valor_contacto;
}

export function normalizePerfil(raw: unknown): PerfilUsuario {
  const data = asRaw(raw);
  const contactos = asList(data.contactos).map((item) => {
    const c = asRaw(item);
    return {
      tipo: str(c.tipo) || str(c.tipo_contacto),
      tipo_contacto: optionalStr(c.tipo_contacto),
      valor: str(c.valor) || str(c.valor_contacto),
      valor_contacto: optionalStr(c.valor_contacto),
    } satisfies ContactoPerfil;
  });

  const email =
    optionalStr(data.email) ??
    contactos.map((c) => contactoValor(c, "EMAIL")).find(Boolean);
  const telefono =
    optionalStr(data.telefono) ??
    contactos.map((c) => contactoValor(c, "TELEFONO")).find(Boolean);

  return {
    id: pickId(data, ["id", "id_usuario"]),
    id_usuario: pickId(data, ["id_usuario", "id"]),
    nombre: str(data.nombre),
    apellido: str(data.apellido),
    dni: str(data.dni),
    cuil: optionalStr(data.cuil) ?? null,
    fecha_nacimiento: optionalStr(data.fecha_nacimiento) ?? null,
    rol: (str(data.rol, "SOCIO") as Role),
    estado: (str(data.estado, "ACTIVO") as UserStatus),
    email,
    telefono,
    contactos,
  };
}

export function normalizeDisciplina(raw: unknown): Disciplina {
  const data = asRaw(raw);
  const count = asRaw(data._count);
  return {
    id: pickId(data, ["id", "id_disciplina"]),
    id_disciplina: pickId(data, ["id_disciplina", "id"]),
    nombre: str(data.nombre),
    descripcion: optionalStr(data.descripcion),
    estado: optionalStr(data.estado) as Disciplina["estado"],
    canchas: asList(data.canchas).map(normalizeCancha),
    equipamientos: asList(data.equipamientos).map(normalizeEquipamiento),
    _count: typeof count.canchas === "number" ? { canchas: count.canchas } : undefined,
    creado_en: optionalStr(data.creado_en),
    actualizado_en: optionalStr(data.actualizado_en),
  };
}

export function normalizeCancha(raw: unknown): Cancha {
  const data = asRaw(raw);
  const disciplinaRaw = data.disciplina ? asRaw(data.disciplina) : null;
  return {
    id: pickId(data, ["id", "id_cancha"]),
    id_cancha: pickId(data, ["id_cancha", "id"]),
    id_disciplina: str(data.id_disciplina) || pickId(disciplinaRaw ?? {}, ["id", "id_disciplina"]),
    nombre: str(data.nombre),
    superficie: optionalStr(data.superficie),
    precio_base: toNumber(data.precio_base),
    estado: (str(data.estado, "DISPONIBLE") as Cancha["estado"]),
    disciplina: disciplinaRaw
      ? {
          id: pickId(disciplinaRaw, ["id", "id_disciplina"]),
          nombre: str(disciplinaRaw.nombre),
          descripcion: optionalStr(disciplinaRaw.descripcion),
        }
      : undefined,
    creado_en: optionalStr(data.creado_en),
    actualizado_en: optionalStr(data.actualizado_en),
  };
}

export function normalizeFranja(raw: unknown): FranjaHoraria {
  const data = asRaw(raw);
  return {
    id: pickId(data, ["id", "id_franja"]),
    id_franja: pickId(data, ["id_franja", "id"]),
    id_cancha: str(data.id_cancha),
    dia_semana: toNumber(data.dia_semana),
    hora_inicio: formatTime(str(data.hora_inicio)),
    hora_fin: formatTime(str(data.hora_fin)),
    estado: optionalStr(data.estado) as FranjaHoraria["estado"],
    cancha: data.cancha ? normalizeCancha(data.cancha) : undefined,
    creado_en: optionalStr(data.creado_en),
    actualizado_en: optionalStr(data.actualizado_en),
  };
}

export function normalizeSlot(raw: unknown): TimeSlotAvailability {
  const data = asRaw(raw);
  return {
    id_franja: pickId(data, ["id_franja", "id"]),
    hora_inicio: formatTime(str(data.hora_inicio)),
    hora_fin: formatTime(str(data.hora_fin)),
    disponible: Boolean(data.disponible),
  };
}

export function normalizeEquipamiento(raw: unknown): Equipamiento {
  const data = asRaw(raw);
  return {
    id: pickId(data, ["id", "id_equipamiento"]),
    id_equipamiento: pickId(data, ["id_equipamiento", "id"]),
    id_disciplina: str(data.id_disciplina),
    nombre: str(data.nombre),
    descripcion: optionalStr(data.descripcion),
    stock_total: toNumber(data.stock_total),
    stock_disponible: toNumber(data.stock_disponible),
    precio_alquiler: toNumber(data.precio_alquiler),
    estado: optionalStr(data.estado) as Equipamiento["estado"],
    creado_en: optionalStr(data.creado_en),
    actualizado_en: optionalStr(data.actualizado_en),
  };
}

export function normalizeAlquiler(raw: unknown): AlquilerEquipamiento {
  const data = asRaw(raw);
  const equipamiento = data.equipamiento ? normalizeEquipamiento(data.equipamiento) : undefined;
  return {
    id: pickId(data, ["id", "id_detalle"]),
    id_detalle: pickId(data, ["id_detalle", "id"]),
    id_reserva: str(data.id_reserva),
    id_equipamiento: str(data.id_equipamiento) || equipamiento?.id || "",
    cantidad: toNumber(data.cantidad, 1),
    precio_unitario: toNumber(data.precio_unitario ?? equipamiento?.precio_alquiler),
    subtotal: toNumber(
      data.subtotal,
      toNumber(data.precio_unitario ?? equipamiento?.precio_alquiler) * toNumber(data.cantidad, 1),
    ),
    estado_devolucion: (str(data.estado_devolucion, "PENDIENTE") as AlquilerEquipamiento["estado_devolucion"]),
    equipamiento,
    creado_en: optionalStr(data.creado_en),
    actualizado_en: optionalStr(data.actualizado_en),
  };
}

export function normalizeReserva(raw: unknown): Reserva {
  const data = asRaw(raw);
  const franjaRaw = data.franja ?? data.franjaHoraria;
  const alquileresRaw = data.alquileres ?? data.detallesAlquiler;
  const personaRaw = data.persona ? asRaw(data.persona) : null;

  return {
    id: pickId(data, ["id", "id_reserva"]),
    id_reserva: pickId(data, ["id_reserva", "id"]),
    id_franja: str(data.id_franja) || pickId(franjaRaw, ["id", "id_franja"]),
    id_persona: str(data.id_persona) || pickId(personaRaw ?? {}, ["id", "id_persona"]),
    fecha: str(data.fecha).slice(0, 10),
    estado: (str(data.estado, "CONFIRMADA") as Reserva["estado"]),
    origen: (str(data.origen, "AUTOGESTIONADA") as Reserva["origen"]),
    monto_total: toNumber(data.monto_total),
    franja: franjaRaw ? normalizeFranja(franjaRaw) : undefined,
    persona: personaRaw
      ? {
          id: pickId(personaRaw, ["id", "id_persona"]),
          id_persona: pickId(personaRaw, ["id_persona", "id"]),
          nombre: str(personaRaw.nombre),
          apellido: str(personaRaw.apellido),
          dni: str(personaRaw.dni),
        }
      : undefined,
    alquileres: asList(alquileresRaw).map(normalizeAlquiler),
    pagos: asList(data.pagos).map(normalizePago),
    creado_en: optionalStr(data.creado_en),
    actualizado_en: optionalStr(data.actualizado_en),
  };
}

export function normalizePago(raw: unknown): Pago {
  const data = asRaw(raw);
  const detalle = asRaw(data.detalle);
  const evento = str(data.evento);
  const estadoFromEvento =
    evento === "PAGO_FALLIDO"
      ? "FALLIDO"
      : evento === "PAGO_REEMBOLSADO"
        ? "REEMBOLSADO"
        : "COMPLETADO";

  return {
    id: pickId(data, ["id", "id_registro"]),
    id_registro: pickId(data, ["id_registro", "id"]),
    id_reserva: optionalStr(data.id_reserva) ?? optionalStr(data.id_entidad),
    id_entidad: optionalStr(data.id_entidad),
    monto: toNumber(data.monto ?? detalle.monto),
    estado: (str(data.estado) || str(detalle.estado) || estadoFromEvento) as Pago["estado"],
    metodo_pago: optionalStr(data.metodo_pago) ?? optionalStr(detalle.metodo_pago),
    evento: optionalStr(data.evento),
    creado_en: str(data.creado_en) || str(data.fecha) || str(detalle.fecha_pago),
  };
}

export function mapReservationError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("mantenimiento")) {
    return "La cancha no está disponible en este momento";
  }
  if (msg.includes("máximo") || msg.includes("maximo") || msg.includes("2 reservas")) {
    return "Ya tienes 2 reservas activas";
  }
  if (msg.includes("suspendid")) {
    return "Tu cuenta está suspendida";
  }
  if (msg.includes("reservada") || msg.includes("ocupad") || msg.includes("conflicto")) {
    return "La franja ya está ocupada";
  }
  return message;
}

export function mapEquipmentError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("disciplina")) {
    return "Solo podés alquilar equipamiento de la misma disciplina que la cancha.";
  }
  if (msg.includes("stock")) {
    return "No hay stock suficiente para la cantidad indicada.";
  }
  if (msg.includes("ya existe") || msg.includes("duplic")) {
    return "Ese ítem ya está alquilado en esta reserva.";
  }
  if (msg.includes("activo") || msg.includes("suspendid")) {
    return "Tu cuenta debe estar activa para alquilar equipamiento.";
  }
  return message;
}
