import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import {
  getChecklistMantencionDetalle,
  getEquiposOptions,
  getResponsables,
} from "@/lib/terreno/queries";
import { toUTCDateInput } from "@/lib/terreno/format";
import ChecklistMantForm from "@/components/mantencion/ChecklistMantForm";

// Pantalla de corrección de la cabecera. Existe para que un dato mal copiado no
// obligue a anular el documento (lo que quema el correlativo del año) y volver
// a marcar los 83 ítems. Los ítems y las correctivas no se tocan acá: siguen
// siendo el registro de la revisión física ya realizada.
type Props = { params: Promise<{ id: string }> };

export default async function EditarChecklistMantPage({ params }: Props) {
  const { id } = await params;

  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  const puede =
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");
  if (!puede) redirect(`/mantencion/checklist-mantencion/${id}`);

  const c = await getChecklistMantencionDetalle(id);
  if (!c) notFound();
  // Un documento anulado no se edita: el detalle explica por qué se anuló.
  if (c.anulado) redirect(`/mantencion/checklist-mantencion/${id}`);

  const [equipos, responsables] = await Promise.all([
    getEquiposOptions(),
    getResponsables(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/mantencion/checklist-mantencion/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver al detalle
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Mantención · Check List
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">
          Editar datos del check list
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Check List #{c.correlativo} · {c.equipo ?? "Equipo"} — se corrigen los datos de
          cabecera. Los ítems marcados y las correctivas quedan como están, y el número
          del documento no cambia.
        </p>
      </header>

      <ChecklistMantForm
        equipos={equipos}
        responsables={responsables}
        userId={session.id}
        cabecera={{
          id: c.id,
          equipo_id: c.equipo_id,
          responsable_id: c.responsable_id,
          // fecha es @db.Date: se formatea en UTC para no retroceder un día.
          fecha: toUTCDateInput(c.fecha) ?? "",
          tipo_mantencion: c.tipo_mantencion,
          horometro_snapshot: c.horometro_snapshot,
          km_snapshot: c.km_snapshot,
          proxima_mantencion: c.proxima_mantencion,
          observaciones_generales: c.observaciones_generales,
        }}
      />
    </div>
  );
}
