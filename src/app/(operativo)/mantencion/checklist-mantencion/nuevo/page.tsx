import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getEquiposOptions, getResponsables } from "@/lib/terreno/queries";
import ChecklistMantForm from "@/components/mantencion/ChecklistMantForm";

export default async function NuevoChecklistMantPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const puede =
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");
  if (!puede) redirect("/mantencion/checklist-mantencion");

  const [equipos, responsables] = await Promise.all([
    getEquiposOptions(),
    getResponsables(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/mantencion/checklist-mantencion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Mantención · Check List
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">Nuevo check list de mantenimiento</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Marca cada ítem como SÍ, NO o N/A según la pauta del fabricante.
        </p>
      </header>

      <ChecklistMantForm equipos={equipos} responsables={responsables} userId={session.id} />
    </div>
  );
}
