"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, HelpCircle, LogOut, User } from "lucide-react";
import type { Rol } from "@/types";

const rolLabels: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  SUPERVISOR: "Supervisor",
  USUARIO: "Usuario",
};

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/facturas": "Facturas",
  "/clientes": "Clientes",
  "/productos": "Productos",
  "/documentos": "Documentos",
  "/proveedores": "Proveedores",
  "/ordenes-compra": "Órdenes de Compra",
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
}

export default function Topbar({ nombre, email, rol }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-[#253158]">{pageTitle}</h2>
        <span className="hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-full bg-[#253158]/10 text-[#253158]">
          {rolLabels[rol]}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="relative h-9 w-9 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#c6352e]" />
        </button>
        <button
          type="button"
          className="h-9 w-9 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Ayuda"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>

        <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 h-9 px-3 rounded-md hover:bg-gray-100 transition-colors outline-none cursor-pointer">
          <div className="h-7 w-7 rounded-full bg-[#253158] flex items-center justify-center text-white text-xs font-semibold">
            {nombre.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-700">{nombre}</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            <p className="font-medium">{nombre}</p>
            <p className="text-xs text-gray-500 font-normal">{email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <User className="h-4 w-4 mr-2" />
            Mi perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-[#c6352e] focus:text-[#c6352e]"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
