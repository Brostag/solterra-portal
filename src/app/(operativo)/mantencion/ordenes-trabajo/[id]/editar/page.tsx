import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import {
  getParteDetalle,
  getEquiposOptions,
  getResponsables,
} from "@/lib/terreno/queries";
import ParteForm from "@/components/operacion/ParteForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditarPartePage({ params }: Props) {
  const { id } = await params;

  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (!canAccessModule(session, "MANTENCION")) {
    redirect(`/mantencion/ordenes-trabajo/${id}`);
  }

  const [parte, equipos, operadores] = await Promise.all([
    getParteDetalle(id),
    getEquiposOptions(),
    getResponsables(),
  ]);
  if (!parte) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/mantencion/ordenes-trabajo/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver al detalle
      </Link>
      <header>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">Editar orden de trabajo</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {parte.equipoCodigo ? `${parte.equipoCodigo} · ` : ""}
          {parte.equipo ?? "Equipo"}
        </p>
      </header>

      <ParteForm equipos={equipos} operadores={operadores} parte={parte} userId={session.id} />
    </div>
  );
}
