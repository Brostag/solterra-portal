"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, User } from "lucide-react";
import type { Rol } from "@/types";

const rolLabels: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  SUPERVISOR: "Supervisor",
  USUARIO: "Usuario",
};

interface TopbarProps {
  nombre: string;
  email: string;
  rol: Rol;
}

export default function Topbar({ nombre, email, rol }: TopbarProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#253158]/10 text-[#253158]">
          {rolLabels[rol]}
        </span>
      </div>

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
    </header>
  );
}
