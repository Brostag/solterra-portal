import Link from "next/link";
import { ChevronLeft, Settings } from "lucide-react";
import { getMantenciones } from "@/lib/terreno/queries";
import MantencionesLista from "@/components/mantencion/MantencionesLista";
import PageHeader from "@/components/terreno/PageHeader";
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

      <PageHeader
        icon={<Settings className="h-5 w-5" />}
        titulo="Taller / Mantenciones"
        subtitulo="Preventivas, correctivas y de emergencia"
        accion={
          puedeCrear
            ? { href: "/mantencion/taller/nueva", label: "Nueva mantención" }
            : undefined
        }
      />

      <MantencionesLista mantenciones={mantenciones} />
    </div>
  );
}
