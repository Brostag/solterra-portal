import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getParteDetalle, getFotosFirmadas } from "@/lib/terreno/queries";
import SalidaForm from "@/components/operacion/SalidaForm";
import FotosRegistro from "@/components/operacion/FotosRegistro";

type Props = { params: Promise<{ id: string }> };

// Misma fecha "larga" que usa el detalle (@db.Date es medianoche UTC: getters
// UTC para no retroceder un día en Chile).
function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function SalidaPage({ params }: Props) {
  const { id } = await params;

  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (!canAccessModule(session, "MANTENCION")) {
    redirect(`/mantencion/ordenes-trabajo/${id}`);
  }

  const parte = await getParteDetalle(id);
  if (!parte) notFound();

  // Misma regla de propiedad que registrarSalida/la API de fotos: solo el
  // operador dueño del registro o un supervisor/admin puede registrar la
  // salida. A diferencia de editar/page.tsx (que delega esto a la action),
  // acá se corta antes de mostrar el formulario: no tiene sentido ofrecer el
  // paso de salida a quien no podrá guardarlo.
  const puedeRegistrarSalida =
    parte.operador_id === session.id ||
    session.rol === "ADMINISTRADOR" ||
    session.rol === "SUPERVISOR";
  if (!puedeRegistrarSalida) {
    redirect(`/mantencion/ordenes-trabajo/${id}`);
  }

  const urlsSalida = await getFotosFirmadas(parte.fotos_salida);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/mantencion/ordenes-trabajo/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a la orden de trabajo
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-[#253158]">Registrar salida</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {parte.equipoCodigo ? `${parte.equipoCodigo} · ` : ""}
          {parte.equipo ?? "Equipo"} · Ingresó el {fechaLarga(parte.fecha)}
        </p>
      </header>

      <SalidaForm registroId={id} parte={parte} />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <FotosRegistro
          registroId={id}
          grupo="salida"
          titulo="Fotos de salida"
          paths={parte.fotos_salida}
          urls={urlsSalida}
          puedeEditar={puedeRegistrarSalida}
        />
      </section>
    </div>
  );
}
