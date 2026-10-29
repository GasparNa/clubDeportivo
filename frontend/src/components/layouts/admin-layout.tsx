import type { ReactNode } from "react";
import { Navbar } from "../navbar";
import { AdminSidebar } from "../sidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
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
        <AdminSidebar />
        <main id="contenido" className="min-w-0 flex-1 px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
