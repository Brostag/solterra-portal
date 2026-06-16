import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { getParteDetalle } from "@/lib/terreno/queries";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import RevisarParteButtons from "@/components/operacion/RevisarParteButtons";
import { REGISTRO_COMPONENTES as COMPONENTES_DEF } from "@/lib/terreno/registro-componentes";

function fechaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

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
    { label: "Responsable", value: p.operador ?? "—" },
    { label: "Fecha de ingreso", value: fechaUTC(p.fecha) },
    { label: "Fecha de salida", value: p.fecha_salida ? fechaUTC(p.fecha_salida) : "—" },
    { label: "Estado", value: p.estado },
    { label: "Área de uso", value: p.area_uso ?? "—" },
    { label: "Centro de costo", value: p.centro_costo ?? "—" },
    { label: "Tipo de mantención", value: p.tipo_mantencion ?? "—" },
    { label: "Horómetro", value: p.horometro != null ? `${fmt(p.horometro)} h` : "—" },
    { label: "Odómetro", value: p.odometro != null ? `${fmt(p.odometro)} km` : "—" },
    { label: "Combustible", value: p.combustible_fraccion ?? "—" },
    {
      label: "Responsable ingreso",
      value: p.nombre_responsable
        ? `${p.nombre_responsable}${p.rut_responsable ? ` · ${p.rut_responsable}` : ""}`
        : "—",
    },
    {
      label: "Receptor salida",
      value: p.nombre_receptor
        ? `${p.nombre_receptor}${p.rut_receptor ? ` · ${p.rut_receptor}` : ""}`
        : "—",
    },
  ];

  const textos = [{ label: "Observaciones generales", value: p.observaciones }].filter(
    (t) => t.value,
  );

  const componentes = COMPONENTES_DEF.map((c) => ({
    label: c.label,
    ingreso: p.componentes?.[c.key]?.ingreso ?? null,
    salida: p.componentes?.[c.key]?.salida ?? null,
  })).filter((c) => c.ingreso || c.salida);

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
          <a
            href={`/api/operacion/registro/${p.id}/pdf`}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#253158] transition hover:bg-gray-50"
          >
            Descargar PDF
          </a>
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

      {componentes.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-sm font-semibold text-[#253158]">Componentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 pr-4 font-semibold">Componente</th>
                  <th className="py-2 pr-4 text-center font-semibold">Ingreso</th>
                  <th className="py-2 text-center font-semibold">Salida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {componentes.map((c) => (
                  <tr key={c.label}>
                    <td className="py-2 pr-4 text-[#253158]">{c.label}</td>
                    <td className="py-2 pr-4 text-center text-gray-600">{c.ingreso ?? "—"}</td>
                    <td className="py-2 text-center text-gray-600">{c.salida ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {puedeRevisar && (
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs text-gray-500">Revisar registro pendiente:</p>
          <RevisarParteButtons id={p.id} />
        </div>
      )}
    </div>
  );
}
