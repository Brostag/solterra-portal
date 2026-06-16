import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { getParteDetalle } from "@/lib/terreno/queries";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import RevisarParteButtons from "@/components/operacion/RevisarParteButtons";

function estadoBadge(estado: string): string {
  if (estado === "Aprobado") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (estado === "Rechazado") return "bg-red-50 text-[#c6352e] ring-1 ring-red-600/20";
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
}

function fmt(n: number | null): string {
  return n != null ? n.toLocaleString("es-CL") : "—";
}

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Props = { params: Promise<{ id: string }> };

export default async function ParteDetallePage({ params }: Props) {
  const { id } = await params;
  const [p, session] = await Promise.all([
    getParteDetalle(id),
    getPortalSessionFast(),
  ]);
  if (!p) notFound();

  const puedeEditar = !!session && canAccessModule(session, "OPERACION");
  const puedeRevisar =
    !!session &&
    p.estado === "Pendiente" &&
    canAccessModule(session, "OPERACION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  const datos = [
    { label: "Equipo", value: p.equipo ? `${p.equipoCodigo ?? ""} ${p.equipo}`.trim() : "—" },
    { label: "Operador", value: p.operador ?? "—" },
    { label: "Fecha", value: fechaLarga(p.fecha) },
    { label: "Estado", value: p.estado },
    {
      label: "Horómetro",
      value:
        p.horometro_inicio != null && p.horometro_fin != null
          ? `${fmt(p.horometro_inicio)} → ${fmt(p.horometro_fin)} h`
          : "—",
    },
    {
      label: "Kilometraje",
      value:
        p.km_inicio != null && p.km_fin != null
          ? `${fmt(p.km_inicio)} → ${fmt(p.km_fin)} km`
          : "—",
    },
    {
      label: "Combustible",
      value: p.combustible_litros != null ? `${fmt(p.combustible_litros)} L` : "—",
    },
    { label: "Aceite", value: p.aceite_litros != null ? `${fmt(p.aceite_litros)} L` : "—" },
  ];

  const textos = [
    { label: "Descripción del trabajo", value: p.descripcion_trabajo },
    { label: "Observaciones", value: p.observaciones },
  ].filter((t) => t.value);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/operacion/partes-diarios"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a partes diarios
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">{p.equipo ?? "Parte diario"}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{fechaLarga(p.fecha)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={"rounded-full px-3 py-1 text-xs font-medium " + estadoBadge(p.estado)}
          >
            {p.estado}
          </span>
          {puedeEditar && (
            <Link
              href={`/operacion/partes-diarios/${p.id}/editar`}
              className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
            >
              Editar
            </Link>
          )}
        </div>
      </header>

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

      {puedeRevisar && (
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs text-gray-500">Revisar parte pendiente:</p>
          <RevisarParteButtons id={p.id} />
        </div>
      )}
    </div>
  );
}
