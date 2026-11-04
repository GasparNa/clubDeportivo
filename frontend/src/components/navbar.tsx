"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-provider";
import { cn } from "@/lib/cn";
import { getNavbarItems, isNavItemActive } from "@/lib/navigation";
import { IconClose, IconLogout, IconMenu, IconUser } from "./icons";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const items = getNavbarItems(user?.rol);
  const displayName = user
    ? [user.nombre, user.apellido].filter(Boolean).join(" ") || user.email
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-text-primary"
        >
          <Image
            src="/logo.svg"
            alt="Club Deportivo"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
          <span className="hidden sm:inline">Club Deportivo</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-1 lg:flex" aria-label="Principal">
          {items.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {!user ? (
            <div suppressHydrationWarning className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover"
              >
                Registrarse
              </Link>
            </div>
          ) : null}

          {user ? (
            <div suppressHydrationWarning className="hidden items-center gap-2 sm:flex">
              <span className="hidden max-w-[10rem] truncate text-sm text-text-secondary md:inline">
                {displayName}
              </span>
              <Link
                href="/profile"
                aria-label="Mi perfil"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-primary hover:bg-surface-2"
              >
                <IconUser className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={logout}
                aria-label="Cerrar sesión"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-primary hover:bg-error/10 hover:text-error"
              >
                <IconLogout className="h-5 w-5" />
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-primary lg:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          className="border-t border-border bg-surface px-4 py-3 lg:hidden"
          aria-label="Menú móvil"
        >
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm font-medium",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            {!user ? (
              <>
                <li>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2"
                  >
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="block rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-surface"
                  >
                    Registrarse
                  </Link>
                </li>
              </>
            ) : (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-error hover:bg-error/10"
                >
                  Cerrar sesión
                </button>
              </li>
            )}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
