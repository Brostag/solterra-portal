import Link from "next/link";
import { ChevronLeft, Settings } from "lucide-react";
import { getMantenciones } from "@/lib/terreno/queries";
import MantencionesLista from "@/components/mantencion/MantencionesLista";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";

export default async function TallerPage() {
  const [mantenciones, session] = await Promise.all([
    getMantenciones(),
    getPortalSessionFast(),
  ]);

  const puedeCrear =
    !!session &&
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/mantencion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a Mantención
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <Settings className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">Taller / Mantenciones</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Preventivas, correctivas y de emergencia
            </p>
          </div>
        </div>
        {puedeCrear && (
          <Link
            href="/mantencion/taller/nueva"
            className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
          >
            Nueva mantención
          </Link>
        )}
      </header>

      <MantencionesLista mantenciones={mantenciones} />
    </div>
  );
}
