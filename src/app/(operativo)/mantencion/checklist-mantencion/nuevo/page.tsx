import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getEquiposOptions, getResponsables } from "@/lib/terreno/queries";
import {
  prefillChecklistDesdeRegistro,
  type PrefillChecklist,
} from "@/lib/terreno/cadena";
import ChecklistMantForm from "@/components/mantencion/ChecklistMantForm";
import OrigenBanner from "@/components/terreno/OrigenBanner";

// Por la URL viaja SOLO el id del registro de origen: el servidor vuelve a leer
// el documento y arma la propuesta. Nunca se aceptan valores del cliente.
function idDesde(valor: string | string[] | undefined): string | null {
  if (typeof valor === "string") return valor.trim() || null;
  if (Array.isArray(valor)) return valor[0]?.trim() || null;
  return null;
}

// Un id inexistente, borrado o mal formado no puede romper la pantalla: el
// formulario se abre en blanco. La pantalla avisa que no se copió nada, y la
// excepción queda registrada en el servidor en vez de perderse en silencio.
async function cargarPrefill(id: string | null): Promise<PrefillChecklist | null> {
  if (!id) return null;
  try {
    return await prefillChecklistDesdeRegistro(id);
  } catch (e) {
    console.error("[checklist-mantencion/nuevo] prefill desde registro falló", e);
    return null;
  }
}

type Props = {
  searchParams: Promise<{ desde?: string | string[] }>;
};

export default async function NuevoChecklistMantPage({ searchParams }: Props) {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const puede =
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");
  if (!puede) redirect("/mantencion/checklist-mantencion");

  const sp = await searchParams;
  const idOrigen = idDesde(sp?.desde);
  const [equipos, responsables, prefill] = await Promise.all([
    getEquiposOptions(),
    getResponsables(),
    cargarPrefill(idOrigen),
  ]);

  const detalleOrigen = prefill
    ? [prefill.equipo_codigo, prefill.equipo_nombre].filter(Boolean).join(" · ")
    : "";

  // Se pidió copiar un registro y no se pudo (no existe, fue borrado o está
  // rechazado). Sin aviso el usuario cree que el sistema falló al copiar.
  const origenNoDisponible = Boolean(idOrigen) && !prefill;

  // El registro de origen vive en Operación: sin ese módulo el enlace terminaría
  // en un redirect, así que el aviso queda como texto plano.
  const veOperacion = canAccessModule(session, "OPERACION");

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

      {prefill && (
        <OrigenBanner
          titulo={`Datos tomados del registro del ${prefill.fecha_registro}`}
          detalle={detalleOrigen || undefined}
          href={veOperacion ? prefill.origen_href : undefined}
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

      <ChecklistMantForm
        equipos={equipos}
        responsables={responsables}
        userId={session.id}
        prefill={prefill}
      />
    </div>
  );
}
