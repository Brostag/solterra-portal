import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { getPartes } from "@/lib/terreno/queries";
import PartesLista from "@/components/operacion/PartesLista";
import AutoRefresh from "@/components/terreno/AutoRefresh";
import PageHeader from "@/components/terreno/PageHeader";
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

      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        titulo="Partes Diarios"
        subtitulo="Registro diario de uso del equipo"
        accion={
          puedeCrear
            ? { href: "/operacion/partes-diarios/nuevo", label: "Nuevo parte" }
            : undefined
        }
      />

      <AutoRefresh />
      <PartesLista partes={partes} />
    </div>
  );
}
