"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, ChevronDown, HelpCircle, LogOut, Menu } from "lucide-react";
import type { Rol } from "@/types";
import HelpPanel from "@/components/portal/HelpPanel";
import ThemeToggle from "@/components/portal/ThemeToggle";

const rolLabels: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  SUPERVISOR: "Supervisor",
  USUARIO: "Usuario",
};

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/contratos": "Contratos",
  "/empresas": "Empresas",
  "/facturas": "Facturas",
  "/clientes": "Clientes",
  "/productos": "Servicios",
  "/documentos": "Documentos",
  "/proveedores": "Proveedores",
  "/ordenes-compra": "Órdenes de Compra",
  "/cotizador": "Cotizador",
  "/cotizaciones": "Cotizaciones",
  "/configuracion": "Configuración",
  "/usuarios": "Usuarios",
  "/auditoria": "Auditoría",
};

function getPageTitle(pathname: string): string {
  const match = Object.entries(pageTitles).find(([key]) =>
    pathname === key || pathname.startsWith(`${key}/`)
  );
  return match?.[1] ?? "Portal";
}

interface TopbarProps {
  nombre: string;
  email: string;
  rol: Rol;
  onOpenMenu?: () => void;
}

export default function Topbar({ nombre, email, rol, onOpenMenu }: TopbarProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Hamburger button — mobile only */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menú de navegación"
          className="lg:hidden h-9 w-9 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex-shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb discreto: el h1 real vive en cada página */}
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">{pageTitle}</h2>
        <span className="hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-full bg-[#253158]/10 dark:bg-blue-500/20 text-[#253158] dark:text-blue-300 flex-shrink-0">
          {rolLabels[rol]}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          className="relative h-9 w-9 flex items-center justify-center rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Notificaciones"
        >
          {/* Dot de notificación removido: se reactiva cuando exista un sistema real de notificaciones */}
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          className="hidden sm:flex h-9 w-9 items-center justify-center rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Ayuda"
          onClick={() => setHelpOpen(true)}
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label="Menú de usuario"
            className="flex items-center gap-2 h-9 px-2 sm:px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors outline-none cursor-pointer"
          >
            <div className="h-7 w-7 rounded-full bg-[#253158] dark:bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {nombre.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-200">{nombre}</span>
            <ChevronDown
              className={`hidden sm:block h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-[300] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{nombre}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{email}</p>
                <span className="inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#253158]/10 dark:bg-blue-500/20 text-[#253158] dark:text-blue-300">
                  {rolLabels[rol]}
                </span>
              </div>
              <div className="border-b border-gray-100 dark:border-gray-700">
                <ThemeToggle />
              </div>
              <div className="p-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#c6352e] dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <HelpPanel
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        pathname={pathname}
      />
    </header>
  );
}
