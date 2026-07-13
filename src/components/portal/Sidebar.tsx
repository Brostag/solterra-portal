"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Package,
  FolderOpen,
  Settings,
  UserCog,
  ShieldCheck,
  Building2,
  ShoppingCart,
  Calculator,
  ClipboardList,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import Image from "next/image";
import type { Rol, Area } from "@/types";
import { allowedModules, moduleForPath, type Module } from "@/lib/modules";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const comercialItems: NavItem[] = [
  { href: "/dashboard",      label: "Dashboard",         icon: LayoutDashboard },
  { href: "/contratos",      label: "Contratos",         icon: FileText },
  { href: "/empresas",       label: "Empresas",          icon: Building2 },
  { href: "/productos",      label: "Servicios",         icon: Package },
  { href: "/documentos",     label: "Documentos",        icon: FolderOpen },
  { href: "/ordenes-compra", label: "Órdenes de Compra", icon: ShoppingCart },
  { href: "/cotizador",      label: "Cotizador",         icon: Calculator },
  { href: "/cotizaciones",   label: "Cotizaciones",      icon: ClipboardList },
];

const adminItems: NavItem[] = [
  { href: "/configuracion", label: "Configuración", icon: Settings },
  { href: "/usuarios",      label: "Usuarios",      icon: UserCog },
  { href: "/auditoria",     label: "Auditoría",     icon: ShieldCheck },
];

const mantencionItems: NavItem[] = [
  { href: "/mantencion",              label: "Inicio",       icon: LayoutDashboard },
  { href: "/mantencion/equipos",      label: "Equipos",      icon: Package },
  { href: "/mantencion/taller",       label: "Taller",       icon: Settings },
  { href: "/mantencion/planes",       label: "Planes",       icon: ClipboardCheck },
  { href: "/mantencion/checklist-mantencion", label: "Check List", icon: ClipboardList },
  { href: "/mantencion/certificado-mantencion", label: "Certificado", icon: FileText },
  { href: "/mantencion/certificados", label: "Vencimientos", icon: ShieldCheck },
  { href: "/mantencion/reportes",     label: "Reportes",     icon: ClipboardList },
];

const operacionItems: NavItem[] = [
  { href: "/operacion",                label: "Inicio",         icon: LayoutDashboard },
  { href: "/operacion/partes-diarios", label: "Partes Diarios", icon: FileText },
  { href: "/operacion/checklists",     label: "Checklists",     icon: FolderOpen },
];

const MODULE_LABEL: Record<Module, string> = {
  COMERCIAL: "Comercial",
  MANTENCION: "Mantención",
  OPERACION: "Operación",
};

function itemsForModule(m: Module): NavItem[] {
  if (m === "MANTENCION") return mantencionItems;
  if (m === "OPERACION") return operacionItems;
  return comercialItems;
}

const STORAGE_KEY = "solterra_sidebar_collapsed";

interface SidebarProps {
  rol: Rol;
  area?: Area | null;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ rol, area = null, mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const currentModule = moduleForPath(pathname);
  const mainItems = itemsForModule(currentModule);
  const showAdmin = currentModule === "COMERCIAL" && rol === "ADMINISTRADOR";
  const canSwitch = allowedModules(rol, area).length > 1;

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // Warm up the routes of the active module so navigation feels instant.
  useEffect(() => {
    itemsForModule(currentModule).forEach((item) => router.prefetch(item.href));
    if (showAdmin) adminItems.forEach((item) => router.prefetch(item.href));
    if (canSwitch) router.prefetch("/modulos");
  }, [router, currentModule, showAdmin, canSwitch]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  // Los "Inicio" de los módulos (raíz) se marcan activos solo en match exacto;
  // sus subrutas tienen su propio estado activo.
  const isActive = (href: string) => {
    if (pendingHref) return pendingHref === href;
    if (href === "/mantencion" || href === "/operacion") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const linkClass = (active: boolean) =>
    cn(
      "relative flex items-center rounded-md text-sm transition-colors",
      "gap-3 px-3 py-2.5",
      collapsed && "lg:justify-center lg:h-10 lg:w-full lg:gap-0 lg:px-0 lg:py-0",
      active
        ? "bg-white/20 text-white font-semibold"
        : "text-white/70 font-medium hover:bg-white/10 hover:text-white"
    );

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch
        onClick={() => setPendingHref(item.href)}
        onMouseEnter={() => router.prefetch(item.href)}
        onFocus={() => router.prefetch(item.href)}
        title={collapsed ? item.label : undefined}
        className={linkClass(active)}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-[#c6352e] rounded-r-full" />
        )}
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-[#253158] text-white",
        // Mobile: fixed drawer, always w-64, slides in/out
        "fixed inset-y-0 left-0 z-50 w-64",
        "transition-transform duration-300 ease-in-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: restore to static layout, respect collapsed state
        "lg:static lg:z-auto lg:translate-x-0 lg:flex-shrink-0 lg:h-full",
        "lg:transition-all lg:duration-200",
        collapsed ? "lg:w-[72px]" : "lg:w-64"
      )}
    >
      {/* Header: logo + toggle buttons */}
      <div
        className={cn(
          "flex items-center h-14 border-b border-white/10 flex-shrink-0",
          // Mobile: always expanded header
          "justify-between px-4 pr-3",
          // Desktop collapsed: center
          collapsed && "lg:justify-center lg:px-0"
        )}
      >
        {/* Logo — always visible on mobile, hidden on desktop when collapsed */}
        <Image
          src="/solterra-logo.png"
          alt="Solterra"
          width={120}
          height={36}
          className={cn(
            "h-8 w-auto object-contain flex-shrink-0",
            collapsed && "lg:hidden"
          )}
          style={{ mixBlendMode: "screen" }}
          priority
        />

        {/* Desktop collapse toggle — hidden on mobile */}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
          className={cn(
            "hidden lg:flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0",
            collapsed ? "h-9 w-9" : "h-7 w-7"
          )}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <ChevronLeft className="h-4 w-4" />
          }
        </button>

        {/* Mobile close button — hidden on desktop */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="lg:hidden h-7 w-7 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 py-4 space-y-0.5 overflow-y-auto",
          // Mobile: always expanded padding
          "px-3",
          // Desktop collapsed: tighter padding
          collapsed && "lg:px-2"
        )}
      >
        {/* Etiqueta del módulo activo (no en Comercial, para no cambiar su UX) */}
        {currentModule !== "COMERCIAL" && (
          <div className={cn("pb-2 px-3", collapsed && "lg:hidden")}>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
              Módulo {MODULE_LABEL[currentModule]}
            </p>
          </div>
        )}

        {mainItems.map(renderLink)}

        {showAdmin && (
          <>
            {/* Desktop collapsed: thin divider */}
            {collapsed && (
              <div className="hidden lg:block my-2 mx-1 h-px bg-white/10" />
            )}
            {/* Mobile + desktop expanded: "Administración" label */}
            <div className={cn("pt-5 pb-2 px-3", collapsed && "lg:hidden")}>
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
                Administración
              </p>
            </div>
            {adminItems.map(renderLink)}
          </>
        )}

        {/* Cambiar de módulo (solo si el usuario tiene más de uno) */}
        {canSwitch && (
          <>
            {collapsed && (
              <div className="hidden lg:block my-2 mx-1 h-px bg-white/10" />
            )}
            <div className={cn("pt-5", collapsed && "lg:pt-3")}>
              <Link
                href="/modulos"
                prefetch
                onClick={() => setPendingHref("/modulos")}
                onMouseEnter={() => router.prefetch("/modulos")}
                title={collapsed ? "Cambiar de módulo" : undefined}
                className={linkClass(false)}
              >
                <ChevronLeft className="h-5 w-5 flex-shrink-0" />
                <span className={cn("truncate", collapsed && "lg:hidden")}>
                  Cambiar de módulo
                </span>
              </Link>
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          "border-t border-white/10 flex-shrink-0 py-3",
          // Mobile: always with horizontal padding
          "px-5",
          // Desktop collapsed: remove horizontal padding
          collapsed && "lg:px-0"
        )}
      >
        <p className={cn("text-[11px] text-white/30", collapsed && "lg:hidden")}>
          Solterra © {new Date().getFullYear()} · v0.4-demo
        </p>
      </div>
    </aside>
  );
}
