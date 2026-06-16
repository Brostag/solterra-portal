import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { getPartes } from "@/lib/terreno/queries";
import PartesLista from "@/components/operacion/PartesLista";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";

export default async function PartesDiariosPage() {
  const [partes, session] = await Promise.all([
    getPartes(),
    getPortalSessionFast(),
  ]);

  const puedeCrear = !!session && canAccessModule(session, "OPERACION");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/operacion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a Operación
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">Partes Diarios</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Registro diario de uso del equipo
            </p>
          </div>
        </div>
        {puedeCrear && (
          <Link
            href="/operacion/partes-diarios/nuevo"
            className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
          >
            Nuevo parte
          </Link>
        )}
      </header>

      <PartesLista partes={partes} />
    </div>
  );
}
