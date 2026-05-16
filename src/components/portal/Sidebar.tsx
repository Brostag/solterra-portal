"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  FolderOpen,
  Settings,
  UserCog,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Building2,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import type { Rol } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/facturas", label: "Facturas", icon: FileText },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/documentos", label: "Documentos", icon: FolderOpen },
  { href: "/proveedores", label: "Proveedores", icon: Building2 },
  { href: "/ordenes-compra", label: "Órdenes de Compra", icon: ShoppingCart },
];

const adminItems = [
  { href: "/configuracion", label: "Configuración", icon: Settings },
  { href: "/usuarios", label: "Usuarios", icon: UserCog },
  { href: "/auditoria", label: "Auditoría", icon: ShieldCheck },
];

interface SidebarProps {
  rol: Rol;
}

export default function Sidebar({ rol }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[#253158] text-white transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!collapsed && (
          <Image
            src="https://ext.same-assets.com/2134444905/2984985315.png"
            alt="Solterra"
            width={120}
            height={40}
            className="h-8 w-auto brightness-0 invert"
          />
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded hover:bg-white/10 transition-colors ml-auto"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {rol === "ADMINISTRADOR" && (
          <>
            <div className={cn("pt-4 pb-1", collapsed ? "px-1" : "px-3")}>
              {!collapsed && (
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Administración
                </p>
              )}
              {collapsed && <div className="border-t border-white/10" />}
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer sidebar */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-xs text-white/30">Solterra © {new Date().getFullYear()}</p>
        </div>
      )}
    </aside>
  );
}
