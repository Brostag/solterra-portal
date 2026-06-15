import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import {
  getCertificadoDetalle,
  estadoCertificado,
} from "@/lib/terreno/queries";
import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import EliminarCertificadoButton from "@/components/mantencion/EliminarCertificadoButton";

function estadoBadge(estado: string): string {
  if (estado === "Vigente") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (estado === "Por Vencer") return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
  if (estado === "Vencido") return "bg-red-50 text-[#c6352e] ring-1 ring-red-600/20";
  return "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20";
}

// fecha_emision y fecha_vencimiento son @db.Date (medianoche UTC): formatear
// en UTC para no retroceder un día en zonas horarias negativas (Chile UTC-4).
function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Props = { params: Promise<{ id: string }> };

export default async function CertificadoDetallePage({ params }: Props) {
  const { id } = await params;
  const [c, session] = await Promise.all([
    getCertificadoDetalle(id),
    getPortalSessionFast(),
  ]);
  if (!c) notFound();

  // Nombre del equipo para el encabezado (el detalle solo trae equipo_id).
  const equipo = await prisma.mantEquipo.findUnique({
    where: { id: c.equipo_id },
    select: { codigo: true, nombre: true },
  });

  const estado = estadoCertificado(c.fecha_vencimiento);

  const puedeGestionar =
    !!session &&
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  const datos = [
    {
      label: "Equipo",
      value: equipo ? `${equipo.codigo} · ${equipo.nombre}` : "—",
    },
    { label: "Tipo", value: c.tipo },
    { label: "N° de documento", value: c.numero || "—" },
    { label: "Empresa emisora", value: c.empresa_emisora || "—" },
    {
      label: "Fecha de emisión",
      value: c.fecha_emision ? fechaCorta(c.fecha_emision) : "—",
    },
    { label: "Fecha de vencimiento", value: fechaCorta(c.fecha_vencimiento) },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/mantencion/certificados"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a certificados
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">{c.tipo}</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {equipo ? `${equipo.codigo} · ${equipo.nombre}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={"rounded-full px-3 py-1 text-xs font-medium " + estadoBadge(estado)}
          >
            {estado}
          </span>
          {puedeGestionar && (
            <Link
              href={`/mantencion/certificados/${c.id}/editar`}
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

      {c.observaciones && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Observaciones
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[#253158]">
            {c.observaciones}
          </p>
        </section>
      )}

      {puedeGestionar && (
        <div className="flex justify-end">
          <EliminarCertificadoButton id={c.id} />
        </div>
      )}
    </div>
  );
}
