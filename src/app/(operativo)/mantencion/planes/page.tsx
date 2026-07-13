import Link from "next/link";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { getPlanes } from "@/lib/terreno/queries";
import PlanesLista from "@/components/mantencion/PlanesLista";
import PageHeader from "@/components/terreno/PageHeader";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";

export default async function PlanesPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; estado?: string }>;
}) {
  const [planes, session, { plan, estado }] = await Promise.all([
    getPlanes(),
    getPortalSessionFast(),
    searchParams,
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
        icon={<ClipboardList className="h-5 w-5" />}
        titulo="Planes de mantención"
        subtitulo="Planifica el trabajo (A según fabricante, B preventivo, C correctivo) antes de la orden de trabajo"
        accion={
          puedeCrear
            ? { href: "/mantencion/planes/nuevo", label: "Nuevo plan" }
            : undefined
        }
      />

      <PlanesLista
        planes={planes}
        filtroPlanInicial={plan}
        filtroEstadoInicial={estado}
      />
    </div>
  );
}
