import Link from "next/link";
import { ChevronLeft, FolderOpen } from "lucide-react";
import { getChecklists } from "@/lib/terreno/queries";
import ChecklistsLista from "@/components/operacion/ChecklistsLista";
import AutoRefresh from "@/components/terreno/AutoRefresh";
import PageHeader from "@/components/terreno/PageHeader";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";

export default async function ChecklistsPage() {
  const [checklists, session] = await Promise.all([
    getChecklists(),
    getPortalSessionFast(),
  ]);

  const puedeCrear = !!session && canAccessModule(session, "OPERACION");
  const puedeEliminar =
    !!session &&
    canAccessModule(session, "OPERACION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/operacion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a Operación
      </Link>

      <PageHeader
        icon={<FolderOpen className="h-5 w-5" />}
        titulo="Checklists"
        subtitulo="Inspección pre-operacional del equipo"
        accion={
          puedeCrear
            ? { href: "/operacion/checklists/nuevo", label: "Nuevo checklist" }
            : undefined
        }
      />

      <AutoRefresh />
      <ChecklistsLista checklists={checklists} puedeEliminar={puedeEliminar} />
    </div>
  );
}
