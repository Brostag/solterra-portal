import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import {
  getEquiposOptions,
  getResponsables,
  getUltimosRegistrosPorEquipo,
} from "@/lib/terreno/queries";
import ParteForm from "@/components/operacion/ParteForm";

export default async function NuevoPartePage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (!canAccessModule(session, "MANTENCION")) redirect("/mantencion/ordenes-trabajo");

  // El último registro de cada equipo viaja al formulario para prellenar
  // horómetro, odómetro, área, centro de costo y tipo de mantención en cuanto
  // se elige el equipo, sin otra ida y vuelta al servidor.
  const [equipos, operadores, ultimosRegistros] = await Promise.all([
    getEquiposOptions(),
    getResponsables(),
    getUltimosRegistrosPorEquipo(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/mantencion/ordenes-trabajo"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a órdenes de trabajo
      </Link>
      <header>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">Orden de Trabajo</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Registro de ingreso y salida de taller
        </p>
      </header>

      <ParteForm
        equipos={equipos}
        operadores={operadores}
        userId={session.id}
        rol={session.rol}
        ultimosRegistros={ultimosRegistros}
      />
    </div>
  );
}
