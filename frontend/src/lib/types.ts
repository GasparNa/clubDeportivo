/**
 * Tipos TypeScript compartidos — Club Deportivo
 * Alineados con los DTOs del backend (NestJS + class-validator).
 */

// ============================================================
// Roles y Estados
// ============================================================

export type Role = "SOCIO" | "GERENTE" | "ADMINISTRADOR" | "INVITADO";

export type UserStatus = "ACTIVO" | "INACTIVO" | "PENDIENTE" | "SUSPENDIDO";

export type ReservationStatus = "CONFIRMADA" | "EN_CURSO" | "COMPLETADA" | "CANCELADA";

export type ReservationOrigin = "AUTOGESTIONADA" | "MANUAL_GERENCIA";

export type PaymentStatus = "PENDIENTE" | "COMPLETADO" | "FALLIDO" | "REEMBOLSADO";

export type EquipmentReturnStatus = "DEVUELTO" | "DEVUELTO_TARDE" | "NO_DEVUELTO";

export type PermissionRequestStatus = "PENDIENTE" | "APROBADA" | "RECHAZADA";

export type PermissionRequestOrigin = "AUTOREGISTRO" | "GESTIONADA_POR_PERSONAL";

export type CourtStatus = "DISPONIBLE" | "ACTIVO" | "INACTIVO" | "MANTENIMIENTO";

export type SurfaceType = "cesped_natural" | "cesped_sintetico" | "cemento" | "parquet" | "otro";

// ============================================================
// Auth
// ============================================================

export interface RegisterRequest {
  nombre: string;
  apellido: string;
  dni: string;
  cuil?: string;
  fecha_nacimiento?: string;
  email: string;
  password: string;
  telefono?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token?: string;
  access_token?: string;
  usuario: UserProfile;
}

export interface UserProfile {
  id?: string;
  id_usuario?: string;
  email: string;
  rol: Role;
  estado: UserStatus;
  nombre?: string;
  apellido?: string;
  persona?: Persona;
}

// ============================================================
// Persona
// ============================================================

export interface Persona {
  id?: string;
  id_persona?: string;
  nombre: string;
  apellido: string;
  dni: string;
  cuil?: string;
  fecha_nacimiento?: string;
  email?: string;
  telefono?: string;
  estado?: "ACTIVO" | "INACTIVO";
  creado_en?: string;
  actualizado_en?: string;
}

export interface ContactoPerfil {
  tipo: string;
  tipo_contacto?: string;
  valor: string;
  valor_contacto?: string;
}

export interface PerfilUsuario {
  id?: string;
  id_usuario: string;
  nombre: string;
  apellido: string;
  dni: string;
  cuil?: string | null;
  fecha_nacimiento?: string | null;
  rol: Role;
  estado: UserStatus;
  email?: string;
  telefono?: string;
  contactos: ContactoPerfil[];
}

export interface UpdatePerfilRequest {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
}

// ============================================================
// Disciplinas y Canchas
// ============================================================

export interface Disciplina {
  id: string;
  id_disciplina?: string;
  nombre: string;
  descripcion?: string;
  estado?: "ACTIVO" | "INACTIVO";
  canchas?: Cancha[];
  equipamientos?: Equipamiento[];
  _count?: { canchas: number };
  creado_en?: string;
  actualizado_en?: string;
}

export interface CreateDisciplinaRequest {
  nombre: string;
  descripcion?: string;
}

export interface UpdateDisciplinaRequest {
  nombre?: string;
  descripcion?: string;
}

export interface Cancha {
  id: string;
  id_cancha?: string;
  id_disciplina: string;
  nombre: string;
  superficie?: string;
  precio_base: number;
  estado: CourtStatus;
  disciplina?: Disciplina;
  creado_en?: string;
  actualizado_en?: string;
}

export interface CreateCanchaRequest {
  id_disciplina: string;
  nombre: string;
  superficie?: string;
  precio_base: number;
}

export interface UpdateCanchaRequest {
  nombre?: string;
  superficie?: string;
  precio_base?: number;
  estado?: CourtStatus;
}

// ============================================================
// Franjas Horarias
// ============================================================

export interface FranjaHoraria {
  id: string;
  id_franja?: string;
  id_cancha: string;
  dia_semana: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  hora_inicio: string; // HH:mm
  hora_fin: string; // HH:mm
  estado?: "ACTIVO" | "INACTIVO";
  cancha?: Cancha;
  creado_en?: string;
  actualizado_en?: string;
}

export interface CreateFranjaHorariaRequest {
  id_cancha: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

export interface TimeSlotAvailability {
  id_franja: string;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
}

// ============================================================
// Reservas
// ============================================================

export interface Reserva {
  id: string;
  id_reserva?: string;
  id_franja: string;
  id_persona: string;
  fecha: string;
  estado: ReservationStatus;
  origen: ReservationOrigin;
  monto_total?: number;
  franja?: FranjaHoraria;
  franjaHoraria?: FranjaHoraria;
  persona?: Persona;
  alquileres?: AlquilerEquipamiento[];
  detallesAlquiler?: AlquilerEquipamiento[];
  pagos?: Pago[];
  creado_en?: string;
  actualizado_en?: string;
}

export interface CreateReservaRequest {
  id_franja: string;
  fecha: string; // YYYY-MM-DD
  id_persona: string;
  origen?: ReservationOrigin;
}

export interface UpdateReservaEstadoRequest {
  estado: ReservationStatus;
}

// ============================================================
// Alquiler de Equipamiento
// ============================================================

export interface Equipamiento {
  id: string;
  id_equipamiento?: string;
  id_disciplina: string;
  nombre: string;
  descripcion?: string;
  stock_total: number;
  stock_disponible: number;
  precio_alquiler?: number;
  estado?: "ACTIVO" | "INACTIVO";
  disciplina?: Disciplina;
  creado_en?: string;
  actualizado_en?: string;
}

export interface AlquilerEquipamiento {
  id: string;
  id_detalle?: string;
  id_reserva: string;
  id_equipamiento: string;
  cantidad: number;
  precio_unitario?: number;
  subtotal?: number;
  estado_devolucion: EquipmentReturnStatus | "PENDIENTE";
  equipamiento?: Equipamiento;
  reserva?: Reserva;
  creado_en?: string;
  actualizado_en?: string;
}

export interface CreateAlquilerEquipamientoRequest {
  id_reserva: string;
  id_equipamiento: string;
  cantidad: number;
}

export interface UpdateDevolucionRequest {
  estado_devolucion: EquipmentReturnStatus;
}

// ============================================================
// Pagos
// ============================================================

export interface Pago {
  id: string;
  id_registro?: string;
  id_reserva?: string;
  id_entidad?: string;
  monto: number;
  estado: PaymentStatus;
  metodo_pago?: string;
  evento?: string;
  reserva?: Reserva;
  creado_en: string;
  actualizado_en?: string;
}

export interface CreatePagoRequest {
  id_reserva: string;
  monto: number;
  metodo_pago?: string;
}

export interface UpdatePagoEstadoRequest {
  estado: PaymentStatus;
}

// ============================================================
// Solicitudes de Permiso
// ============================================================

export interface SolicitudPermiso {
  id: string;
  id_persona: string;
  estado: PermissionRequestStatus;
  origen: PermissionRequestOrigin;
  persona?: Persona;
  creado_en: string;
  actualizado_en: string;
}

export interface ResolverSolicitudRequest {
  estado: "APROBADA" | "RECHAZADA";
}

// ============================================================
// Auditoría
// ============================================================

export interface RegistroAuditoria {
  id: string;
  id_usuario?: string;
  evento: string;
  entidad: string;
  id_entidad?: string;
  detalle?: string;
  creado_en: string;
}

export interface AuditoriaQueryParams {
  fecha_desde?: string;
  fecha_hasta?: string;
  id_usuario?: string;
  entidad?: string;
  evento?: string;
}

export interface AuditoriaReporte {
  total_eventos: number;
  eventos_por_tipo: Record<string, number>;
  eventos_por_entidad: Record<string, number>;
  top_usuarios: { id_usuario: string; total: number }[];
}

// ============================================================
// Notificaciones
// ============================================================

export interface Notificacion {
  id: string;
  id_usuario: string;
  asunto: string;
  mensaje: string;
  leida: boolean;
  creado_en: string;
}

export interface CreateNotificacionRequest {
  id_usuario: string;
  asunto: string;
  mensaje: string;
}

// ============================================================
// Utilidades
// ============================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiErrorResponse {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}