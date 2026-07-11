import Link from "next/link";
import { ChevronLeft, Package } from "lucide-react";
import { getEquipos } from "@/lib/terreno/queries";
import EquiposLista from "@/components/mantencion/EquiposLista";
import PageHeader from "@/components/terreno/PageHeader";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";

export default async function EquiposPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const [equipos, session, { estado }] = await Promise.all([
    getEquipos(),
    getPortalSessionFast(),
    searchParams,
  ]);

  const puedeCrear =
    !!session &&
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/mantencion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a Mantención
      </Link>

      <PageHeader
        icon={<Package className="h-5 w-5" />}
        titulo="Equipos"
        subtitulo="Maquinaria y flota disponible"
        accion={
          puedeCrear
            ? { href: "/mantencion/equipos/nuevo", label: "Nuevo equipo" }
            : undefined
        }
      />

      <EquiposLista equipos={equipos} filtroInicial={estado} />
    </div>
  );
}
