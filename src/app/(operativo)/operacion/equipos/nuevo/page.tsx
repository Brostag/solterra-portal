import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import EquipoForm from "@/components/operacion/EquipoForm";

export default async function NuevoEquipoPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const puedeCrear =
    canAccessModule(session, "OPERACION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");
  if (!puedeCrear) redirect("/operacion/equipos");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/operacion/equipos"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a equipos
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Operación · Equipos
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">Nuevo equipo</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Registra una máquina o vehículo en la flota.
        </p>
      </header>

      <EquipoForm />
    </div>
  );
}
