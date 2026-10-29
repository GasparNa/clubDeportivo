"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-provider";
import { cn } from "@/lib/cn";
import { ADMIN_SIDEBAR, GERENTE_SIDEBAR, getSidebarGroups, isNavItemActive, type NavGroup } from "@/lib/navigation";
import { NavIcon } from "./icons";

interface SidebarProps {
  groups?: NavGroup[];
  className?: string;
}

export function Sidebar({ groups, className }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const resolved = groups ?? getSidebarGroups(user?.rol);

  if (resolved.length === 0) return null;

  return (
    <aside
      className={cn(
        "hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col",
        className,
      )}
      aria-label="Navegación de gestión"
    >
      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {resolved.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                      )}
                    >
                      {item.icon ? <NavIcon name={item.icon} className="h-4 w-4" /> : null}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function AdminSidebar({ className }: { className?: string }) {
  return <Sidebar groups={ADMIN_SIDEBAR} className={className} />;
}

export function GerenteSidebar({ className }: { className?: string }) {
  return <Sidebar groups={GERENTE_SIDEBAR} className={className} />;
}
