import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Package } from "lucide-react";
import { getEquipoDetalle } from "@/lib/terreno/queries";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";

function estadoBadge(estado: string): string {
  if (estado === "Activo") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (estado === "En Mantención") return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
  if (estado === "Fuera de Servicio") return "bg-red-50 text-[#c6352e] ring-1 ring-red-600/20";
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

function fechaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function vencBadge(iso: string | null): { texto: string; cls: string } {
  if (!iso) return { texto: "Sin dato", cls: "bg-gray-100 text-gray-500 ring-gray-300" };
  const ahora = new Date();
  const hoyUTC = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
  const dias = Math.floor((new Date(iso).getTime() - hoyUTC) / 86_400_000);
  if (dias < 0) return { texto: `Vencido (${fechaUTC(iso)})`, cls: "bg-red-50 text-[#c6352e] ring-red-600/20" };
  if (dias <= 30) return { texto: `Por vencer · ${fechaUTC(iso)} (${dias}d)`, cls: "bg-amber-50 text-amber-700 ring-amber-600/20" };
  return { texto: `Vigente · ${fechaUTC(iso)}`, cls: "bg-green-50 text-green-700 ring-green-600/20" };
}

type Props = { params: Promise<{ id: string }> };

export default async function EquipoDetallePage({ params }: Props) {
  const { id } = await params;
  const [e, session] = await Promise.all([
    getEquipoDetalle(id),
    getPortalSessionFast(),
  ]);
  if (!e) notFound();

  const puedeEditar =
    !!session &&
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  const datos = [
    { label: "Código", value: e.codigo },
    { label: "Nombre", value: e.nombre },
    { label: "Tipo", value: e.tipo },
    { label: "Marca / Modelo", value: [e.marca, e.modelo].filter(Boolean).join(" / ") || "—" },
    { label: "Número de serie", value: e.numero_serie || "—" },
    { label: "Patente", value: e.patente || "—" },
    { label: "Año", value: e.anio ? String(e.anio) : "—" },
    { label: "Estado", value: e.estado },
    { label: "Horómetro actual", value: `${fmt(e.horometro_actual)} h` },
    { label: "KM actual", value: e.km_actual > 0 ? fmt(e.km_actual) : "—" },
    { label: "Fecha de creación", value: fechaLarga(e.created_at) },
    { label: "Última actualización", value: fechaLarga(e.updated_at) },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/mantencion/equipos"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a equipos
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">{e.nombre}</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {e.codigo} · {e.tipo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={"rounded-full px-3 py-1 text-xs font-medium " + estadoBadge(e.estado)}
          >
            {e.estado}
          </span>
          {puedeEditar && (
            <Link
              href={`/mantencion/equipos/${e.id}/editar`}
              className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
            >
              Editar equipo
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

      {/* Vencimientos de documentos */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-3 text-sm font-semibold text-[#253158]">
          Vencimientos de documentos
        </h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { label: "SOAP", iso: e.soap_vencimiento },
            { label: "Permiso de circulación", iso: e.permiso_circ_vencimiento },
            { label: "Revisión técnica", iso: e.rev_tecnica_vencimiento },
            { label: "Extintor", iso: e.extintor_vencimiento },
          ].map((d) => {
            const b = vencBadge(d.iso);
            return (
              <div key={d.label} className="flex items-center justify-between gap-3">
                <dt className="text-sm text-gray-600">{d.label}</dt>
                <dd>
                  <span className={"rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 " + b.cls}>
                    {b.texto}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}
