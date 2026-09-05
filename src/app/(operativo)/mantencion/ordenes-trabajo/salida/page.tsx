import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, LogOut } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getEquiposEnTaller, type EquipoEnTaller } from "@/lib/terreno/queries";
import AutoRefresh from "@/components/terreno/AutoRefresh";
import PageHeader from "@/components/terreno/PageHeader";

// @db.Date llega en medianoche UTC: formatear y contar días en UTC, si no el
// UTC-4 de Chile puede correr la fecha un día para atrás.
function fmtFechaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Medianoche UTC de "hoy", para comparar contra fechaIngreso (también
// medianoche UTC) sin que la hora del día distorsione la resta.
function medianocheUTC(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function diasEnTaller(fechaIngresoISO: string): number {
  const ingreso = medianocheUTC(new Date(fechaIngresoISO));
  const hoy = medianocheUTC(new Date());
  return Math.max(0, Math.round((hoy - ingreso) / MS_POR_DIA));
}

function fmtDias(dias: number): string {
  if (dias === 0) return "hoy";
  if (dias === 1) return "1 día";
  return `${dias} días`;
}

function fmtHorometro(n: number | null): string {
  return n != null ? `${n.toLocaleString("es-CL")} h` : "—";
}

function TarjetaEquipo({ item }: { item: EquipoEnTaller }) {
  return (
    <Link
      href={`/mantencion/ordenes-trabajo/${item.parteId}/salida`}
      className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#253158]/30 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-400">{item.equipoCodigo ?? ""}</p>
          <p className="truncate text-lg font-semibold text-[#253158]">
            {item.equipo ?? "Equipo"}
          </p>
        </div>
        <span className="flex-shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20">
          En taller · {fmtDias(diasEnTaller(item.fechaIngreso))}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
        <span>Ingresó el {fmtFechaUTC(item.fechaIngreso)}</span>
        <span>{item.responsable ?? "Responsable no informado"}</span>
        <span>{fmtHorometro(item.horometro)}</span>
      </div>
    </Link>
  );
}

export default async function SeleccionarSalidaPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (!canAccessModule(session, "MANTENCION")) {
    redirect("/mantencion/ordenes-trabajo");
  }

  const equipos = await getEquiposEnTaller();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/mantencion/ordenes-trabajo"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a órdenes de trabajo
      </Link>

      <PageHeader
        icon={<LogOut className="h-5 w-5" />}
        titulo="Registrar salida"
        subtitulo="Elige el equipo que sale del taller"
      />

      <AutoRefresh />

      {equipos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="font-semibold text-[#253158]">No hay equipos en el taller.</p>
          <p className="mt-1 text-sm text-gray-500">
            Todas las órdenes de trabajo tienen su salida registrada.
          </p>
          <Link
            href="/mantencion/ordenes-trabajo/nuevo"
            className="mt-4 inline-block text-sm font-semibold text-[#253158] hover:underline"
          >
            Nueva orden de trabajo
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {equipos.map((item) => (
            <TarjetaEquipo key={item.parteId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
