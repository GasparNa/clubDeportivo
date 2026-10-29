import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon?: NavIconName;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export type NavIconName =
  | "home"
  | "trophy"
  | "calendar"
  | "plus"
  | "wallet"
  | "user"
  | "clipboard"
  | "sliders"
  | "credit-card"
  | "bell"
  | "users"
  | "landmark"
  | "clock"
  | "file-search"
  | "bar-chart";

export const PUBLIC_NAV: NavItem[] = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/disciplines", label: "Disciplinas", icon: "trophy" },
  { href: "/availability", label: "Disponibilidad", icon: "calendar" },
];

export const SOCIO_NAV: NavItem[] = [
  { href: "/my-reservations", label: "Mis reservas", icon: "calendar" },
  { href: "/reservations/new", label: "Nueva reserva", icon: "plus" },
  { href: "/my-payments", label: "Mis pagos", icon: "wallet" },
  { href: "/profile", label: "Mi perfil", icon: "user" },
];

export const GERENTE_NAV: NavItem[] = [
  { href: "/permission-requests", label: "Solicitudes", icon: "clipboard" },
  { href: "/reservations/manage", label: "Gestión de reservas", icon: "sliders" },
  { href: "/payments/new", label: "Registrar pago", icon: "credit-card" },
  { href: "/notifications/send", label: "Notificaciones", icon: "bell" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin/users", label: "Usuarios", icon: "users" },
  { href: "/admin/disciplines", label: "Disciplinas", icon: "trophy" },
  { href: "/admin/courts", label: "Canchas", icon: "landmark" },
  { href: "/admin/time-slots", label: "Franjas", icon: "clock" },
  { href: "/admin/audit", label: "Auditoría", icon: "file-search" },
  { href: "/admin/audit/report", label: "Reportes", icon: "bar-chart" },
];

export const GERENTE_SIDEBAR: NavGroup[] = [
  { title: "Operación", items: GERENTE_NAV },
  { title: "Socio", items: SOCIO_NAV },
];

export const ADMIN_SIDEBAR: NavGroup[] = [
  {
    title: "Administración",
    items: [
      { href: "/admin/users", label: "Usuarios", icon: "users" },
      { href: "/admin/disciplines", label: "Disciplinas", icon: "trophy" },
      { href: "/admin/courts", label: "Canchas", icon: "landmark" },
      { href: "/admin/time-slots", label: "Franjas horarias", icon: "clock" },
    ],
  },
  {
    title: "Auditoría",
    items: [
      { href: "/admin/audit", label: "Registros", icon: "file-search" },
      { href: "/admin/audit/report", label: "Reporte", icon: "bar-chart" },
    ],
  },
  { title: "Operación", items: GERENTE_NAV },
];

/** Ítems del Navbar según rol. El detalle de gestión vive en el Sidebar. */
export function getNavbarItems(rol?: Role | null): NavItem[] {
  if (rol === "SOCIO") {
    return [...PUBLIC_NAV, ...SOCIO_NAV];
  }
  if (rol === "GERENTE") {
    return [
      ...PUBLIC_NAV,
      { href: "/permission-requests", label: "Solicitudes", icon: "clipboard" },
      { href: "/reservations/manage", label: "Reservas", icon: "sliders" },
      { href: "/profile", label: "Mi perfil", icon: "user" },
    ];
  }
  if (rol === "ADMINISTRADOR") {
    return [
      { href: "/", label: "Inicio", icon: "home" },
      { href: "/admin/users", label: "Panel", icon: "sliders" },
      { href: "/disciplines", label: "Disciplinas", icon: "trophy" },
      { href: "/availability", label: "Disponibilidad", icon: "calendar" },
    ];
  }
  return PUBLIC_NAV;
}

export function getSidebarGroups(rol?: Role | null): NavGroup[] {
  if (rol === "ADMINISTRADOR") return ADMIN_SIDEBAR;
  if (rol === "GERENTE") return GERENTE_SIDEBAR;
  return [];
}

export function getDashboardPath(rol?: Role | null): string {
  switch (rol) {
    case "ADMINISTRADOR":
      return "/admin/users";
    case "GERENTE":
      return "/permission-requests";
    case "SOCIO":
      return "/my-reservations";
    default:
      return "/";
  }
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
