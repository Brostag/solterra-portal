import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Award } from "lucide-react";
import { getCertificadoMantencionDetalle } from "@/lib/terreno/queries";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import AnularCertMantButton from "@/components/mantencion/AnularCertMantButton";

function fechaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmt(n: number | null): string {
  return n != null ? n.toLocaleString("es-CL") : "—";
}

type Props = { params: Promise<{ id: string }> };

export default async function CertMantDetallePage({ params }: Props) {
  const { id } = await params;
  const [c, session] = await Promise.all([
    getCertificadoMantencionDetalle(id),
    getPortalSessionFast(),
  ]);
  if (!c) notFound();

  const puedeAnular =
    !!session &&
    !c.anulado &&
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  const datos = [
    { label: "N° certificado", value: `#${c.correlativo}` },
    { label: "Ciudad y fecha", value: `${c.ciudad}, ${fechaUTC(c.fecha)}` },
    { label: "Equipo", value: c.equipo ? `${c.equipoCodigo ?? ""} ${c.equipo}`.trim() : "—" },
    { label: "Tipo de equipo", value: c.tipo_equipo_snapshot ?? "—" },
    { label: "Marca", value: c.marca_snapshot ?? "—" },
    { label: "Placa patente", value: c.patente_snapshot ?? "—" },
    { label: "Horómetro", value: c.horometro_snapshot != null ? `${fmt(c.horometro_snapshot)} h` : "—" },
    { label: "Odómetro", value: c.odometro_snapshot != null ? `${fmt(c.odometro_snapshot)} km` : "—" },
    { label: "Próxima mantención", value: c.proxima_mantencion != null ? fmt(c.proxima_mantencion) : "—" },
    { label: "Encargado de Mantención", value: c.responsable ?? "—" },
    { label: "Gerente de Operaciones", value: c.gerente ?? "—" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/mantencion/certificado-mantencion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <Award className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">Certificado #{c.correlativo}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{c.equipo ?? "Equipo"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {c.anulado && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-300">
              Anulado
            </span>
          )}
          <a
            href={`/api/mantencion/certificado/${c.id}/pdf`}
            className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
          >
            Descargar PDF
          </a>
        </div>
      </header>

      {c.anulado && c.motivo_anulacion && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <span className="font-semibold text-[#253158]">Anulado</span>
          {c.anulado_at && ` el ${fechaUTC(c.anulado_at)}`} — {c.motivo_anulacion}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {datos.map((d) => (
            <div key={d.label} className="flex flex-col">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{d.label}</dt>
              <dd className="mt-0.5 text-sm text-[#253158]">{d.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {puedeAnular && (
        <div className="flex justify-end">
          <AnularCertMantButton id={c.id} />
        </div>
      )}
    </div>
  );
}
