import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Settings } from "lucide-react";
import { getMantencionDetalle } from "@/lib/terreno/queries";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import EliminarMantencionButton from "@/components/mantencion/EliminarMantencionButton";

function estadoBadge(estado: string): string {
  if (estado === "Completada") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (estado === "En Proceso") return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
  if (estado === "Programada") return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
  return "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20";
}

function fmt(n: number): string {
  return n.toLocaleString("es-CL");
}

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Para campos @db.Date (medianoche UTC) como proxima_mantencion_fecha: UTC
// para no retroceder un día en Chile (UTC-4).
function fechaCortaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Props = { params: Promise<{ id: string }> };

export default async function MantencionDetallePage({ params }: Props) {
  const { id } = await params;
  const [m, session] = await Promise.all([
    getMantencionDetalle(id),
    getPortalSessionFast(),
  ]);
  if (!m) notFound();

  const puedeGestionar =
    !!session &&
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  const datos = [
    { label: "Equipo", value: m.equipo ? `${m.equipoCodigo ?? ""} ${m.equipo}`.trim() : "—" },
    { label: "Responsable", value: m.responsable ?? "—" },
    { label: "Tipo", value: m.tipo },
    { label: "Estado", value: m.estado },
    { label: "Fecha de inicio", value: fechaLarga(m.fecha_inicio) },
    { label: "Fecha de término", value: m.fecha_fin ? fechaLarga(m.fecha_fin) : "—" },
    {
      label: "Horómetro al realizar",
      value: m.horometro_realizada != null ? `${fmt(m.horometro_realizada)} h` : "—",
    },
    { label: "Costo", value: m.costo != null ? `$${fmt(m.costo)}` : "—" },
    {
      label: "Próx. mantención (horómetro)",
      value:
        m.proxima_mantencion_horometro != null
          ? `${fmt(m.proxima_mantencion_horometro)} h`
          : "—",
    },
    {
      label: "Próx. mantención (fecha)",
      value: m.proxima_mantencion_fecha ? fechaCortaUTC(m.proxima_mantencion_fecha) : "—",
    },
  ];

  const textos = [
    { label: "Descripción", value: m.descripcion },
    { label: "Trabajos realizados", value: m.trabajos_realizados },
    { label: "Repuestos usados", value: m.repuestos_usados },
    { label: "Observaciones", value: m.observaciones },
  ].filter((t) => t.value);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/mantencion/taller"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver al taller
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <Settings className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">
              {m.equipo ?? "Mantención"}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {m.tipo} · {fechaCorta(m.fecha_inicio)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={"rounded-full px-3 py-1 text-xs font-medium " + estadoBadge(m.estado)}
          >
            {m.estado}
          </span>
          {puedeGestionar && (
            <Link
              href={`/mantencion/taller/${m.id}/editar`}
              className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
            >
              Editar
            </Link>
          )}
        </div>
      </header>

      {/* Datos */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {datos.map((d) => (
            <div key={d.label} className="flex flex-col">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {d.label}
              </dt>
              <dd className="mt-0.5 text-sm text-[#253158]">{d.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Textos largos */}
      {textos.length > 0 && (
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          {textos.map((t) => (
            <div key={t.label}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {t.label}
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[#253158]">{t.value}</p>
            </div>
          ))}
        </section>
      )}

      {puedeGestionar && (
        <div className="flex justify-end">
          <EliminarMantencionButton id={m.id} />
        </div>
      )}
    </div>
  );
}
