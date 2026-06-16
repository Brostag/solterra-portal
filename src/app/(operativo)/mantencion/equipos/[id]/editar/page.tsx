import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getEquipoDetalle } from "@/lib/terreno/queries";
import EquipoForm from "@/components/mantencion/EquipoForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditarEquipoPage({ params }: Props) {
  const { id } = await params;

  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  const puede =
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");
  if (!puede) redirect(`/mantencion/equipos/${id}`);

  const equipo = await getEquipoDetalle(id);
  if (!equipo) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/mantencion/equipos/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver al detalle
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Mantención · Equipos
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">Editar equipo</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {equipo.codigo} · {equipo.nombre}
        </p>
      </header>

      <EquipoForm equipo={equipo} />
    </div>
  );
}
