import Link from "next/link";
import { Package } from "lucide-react";
import { getEquipos } from "@/lib/terreno/queries";
import EquiposLista from "@/components/operacion/EquiposLista";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";

export default async function EquiposPage() {
  const [equipos, session] = await Promise.all([
    getEquipos(),
    getPortalSessionFast(),
  ]);

  const puedeCrear =
    !!session &&
    canAccessModule(session, "OPERACION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">Equipos</h1>
            <p className="mt-0.5 text-sm text-gray-500">Maquinaria y flota disponible</p>
          </div>
        </div>
        {puedeCrear && (
          <Link
            href="/operacion/equipos/nuevo"
            className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
          >
            Nuevo equipo
          </Link>
        )}
      </header>

      <EquiposLista equipos={equipos} />
    </div>
  );
}
