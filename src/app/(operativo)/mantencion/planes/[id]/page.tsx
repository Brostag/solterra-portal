import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { getPlanDetalle } from "@/lib/terreno/queries";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import GenerarOTButton from "@/components/mantencion/GenerarOTButton";
import AnularPlanButton from "@/components/mantencion/AnularPlanButton";

const PLAN_LABEL: Record<string, string> = {
  A: "A — Según fabricante",
  B: "B — Preventivo",
  C: "C — Correctivo",
};

function estadoBadge(estado: string): string {
  if (estado === "Con OT") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (estado === "Planificado") return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
  if (estado === "Anulado") return "bg-gray-100 text-gray-500 ring-1 ring-gray-300";
  return "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20";
}

function fmt(n: number): string {
  return n.toLocaleString("es-CL");
}

// @db.Date → formatear en UTC para no retroceder un día en Chile (UTC-4).
function fechaCortaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
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

type Props = { params: Promise<{ id: string }> };

export default async function PlanDetallePage({ params }: Props) {
  const { id } = await params;
  const [p, session] = await Promise.all([
    getPlanDetalle(id),
    getPortalSessionFast(),
  ]);
  if (!p) notFound();

  const puedeGestionar =
    !!session &&
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  const registroSufijo = p.registroFecha ? ` (${fechaCortaUTC(p.registroFecha)})` : "";

  const datos = [
    { label: "N° plan", value: `#${p.correlativo}` },
    { label: "Equipo", value: p.equipo ? `${p.equipoCodigo ?? ""} ${p.equipo}`.trim() : "—" },
    { label: "Plan", value: PLAN_LABEL[p.plan] ?? p.plan },
    { label: "Estado", value: p.estado },
    { label: "Responsable", value: p.responsable ?? "—" },
    {
      label: "Fecha planificada",
      value: p.fecha_planificada ? fechaCortaUTC(p.fecha_planificada) : "—",
    },
    {
      label: "Horómetro de referencia",
      value: p.horometro_referencia != null ? `${fmt(p.horometro_referencia)} h` : "—",
    },
    { label: "Creado", value: fechaLarga(p.created_at) },
  ];

  const textos = [
    { label: "Tareas planificadas", value: p.descripcion },
    { label: "Observaciones", value: p.observaciones },
  ].filter((t) => t.value);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/mantencion/planes"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a planes
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">
              Plan #{p.correlativo}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {p.equipo ?? "Equipo"} · {PLAN_LABEL[p.plan] ?? p.plan}
            </p>
          </div>
        </div>
        <span
          className={"rounded-full px-3 py-1 text-xs font-medium " + estadoBadge(p.estado)}
        >
          {p.estado}
        </span>
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

      {/* Enlaces al registro origen y a la orden de trabajo */}
      <section className="flex flex-wrap gap-3">
        {p.registro_id && (
          <Link
            href={`/mantencion/ordenes-trabajo/${p.registro_id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#253158] transition hover:bg-gray-50"
          >
            Ver orden de trabajo
            {registroSufijo}
          </Link>
        )}
        {p.estado === "Con OT" && p.orden_trabajo_id && (
          <Link
            href={`/mantencion/taller/${p.orden_trabajo_id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
          >
            Ver OT de taller
          </Link>
        )}
      </section>

      {/* Acciones */}
      {puedeGestionar && p.estado === "Planificado" && (
        <div className="flex flex-wrap items-start justify-end gap-3">
          <AnularPlanButton planId={p.id} />
          <GenerarOTButton planId={p.id} />
        </div>
      )}
    </div>
  );
}
