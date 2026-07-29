import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getEquiposOptions, getResponsables } from "@/lib/terreno/queries";
import { prefillOTDesdeChecklist } from "@/lib/terreno/cadena";
import MantencionForm from "@/components/mantencion/MantencionForm";
import OrigenBanner from "@/components/terreno/OrigenBanner";

// ?desde=<id del Check List>: por la URL viaja solo el id. El servidor vuelve a
// leer el Check List y arma la propuesta; nunca se aceptan valores del cliente.
type Props = { searchParams: Promise<{ desde?: string }> };

export default async function NuevaMantencionPage({ searchParams }: Props) {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const puedeCrear =
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");
  if (!puedeCrear) redirect("/mantencion/taller");

  const { desde } = await searchParams;

  const [equipos, responsables, prefill] = await Promise.all([
    getEquiposOptions(),
    getResponsables(),
    // Si el Check List no existe o está anulado devuelve null: el formulario se
    // abre vacío y más abajo se avisa por qué.
    desde ? prefillOTDesdeChecklist(desde) : Promise.resolve(null),
  ]);

  const equipoOrigen = [prefill?.equipo_codigo, prefill?.equipo_nombre]
    .filter(Boolean)
    .join(" · ");

  // Se pidió copiar un check list y no se pudo (no existe o está anulado). Sin
  // aviso el usuario cree que el sistema falló al copiar.
  const origenNoDisponible = Boolean(desde) && !prefill;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/mantencion/taller"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver al taller
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Mantención · Taller
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">Nueva mantención</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Registra un trabajo preventivo, correctivo o de emergencia.
        </p>
      </header>

      {prefill && (
        <OrigenBanner
          titulo={`Datos copiados del Check List N°${prefill.checklist_correlativo}/${prefill.checklist_anio} del ${prefill.fecha_checklist}`}
          detalle={equipoOrigen || undefined}
          href={prefill.origen_href}
        />
      )}

      {origenNoDisponible && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">
            No se pudieron copiar los datos del documento de origen. Revísalo antes
            de continuar.
          </p>
        </div>
      )}

      <MantencionForm
        equipos={equipos}
        responsables={responsables}
        prefill={prefill ?? undefined}
      />
    </div>
  );
}
