"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-provider";
import { getSidebarGroups } from "@/lib/navigation";
import { Navbar } from "../navbar";
import { Sidebar } from "../sidebar";

interface AuthenticatedLayoutProps {
  children: ReactNode;
  withSidebar?: boolean;
}

export function AuthenticatedLayout({ children, withSidebar }: AuthenticatedLayoutProps) {
  const { user } = useAuth();
  const groups = getSidebarGroups(user?.rol);
  const showSidebar = withSidebar ?? groups.length > 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-surface"
      >
        Saltar al contenido
      </a>
      <Navbar />
      <div className="flex min-h-0 flex-1">
        {showSidebar ? <Sidebar groups={groups} /> : null}
        <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
