import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import {
  getEquiposOptions,
  getRegistrosRecientesOptions,
} from "@/lib/terreno/queries";
import PlanForm from "@/components/mantencion/PlanForm";

export default async function NuevoPlanPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const puedeCrear =
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");
  if (!puedeCrear) redirect("/mantencion/planes");

  const [equipos, registros] = await Promise.all([
    getEquiposOptions(),
    getRegistrosRecientesOptions(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/mantencion/planes"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a planes
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Mantención · Planes
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">Nuevo plan de mantención</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Planifica el trabajo a partir de un registro de entrada o de forma manual.
        </p>
      </header>

      <PlanForm equipos={equipos} registros={registros} />
    </div>
  );
}
