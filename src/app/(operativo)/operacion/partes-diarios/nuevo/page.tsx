import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getEquiposOptions, getResponsables } from "@/lib/terreno/queries";
import ParteForm from "@/components/operacion/ParteForm";

export default async function NuevoPartePage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (!canAccessModule(session, "OPERACION")) redirect("/operacion/partes-diarios");

  const [equipos, operadores] = await Promise.all([
    getEquiposOptions(),
    getResponsables(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/operacion/partes-diarios"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a partes diarios
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Operación · Partes Diarios
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">Nuevo parte diario</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Registra el uso del equipo en la jornada.
        </p>
      </header>

      <ParteForm equipos={equipos} operadores={operadores} userId={session.id} />
    </div>
  );
}
