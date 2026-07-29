import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ClipboardCheck } from "lucide-react";
import { getChecklistMantencionDetalle } from "@/lib/terreno/queries";
import {
  SECCION_A,
  SECCION_B,
  type ItemMant,
  type ChecklistMantData,
  type ItemValor,
} from "@/lib/terreno/checklist-mantencion-items";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import AnularConMotivoButton from "@/components/terreno/AnularConMotivoButton";
import PasoSiguiente from "@/components/terreno/PasoSiguiente";
import { anularChecklistMantencion } from "@/app/(operativo)/mantencion/checklist-mantencion/actions";

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

function SeccionItems({
  titulo,
  items,
  valores,
}: {
  titulo: string;
  items: ItemMant[];
  valores: Record<string, ItemValor> | undefined;
}) {
  const marcados = items.filter((i) => valores?.[i.codigo]?.valor);
  if (marcados.length === 0) return null;
  return (
    <div>
      <p className="mb-2 rounded-md bg-[#253158] px-3 py-2 text-sm font-semibold text-white">
        {titulo}
      </p>
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {marcados.map((item) => (
          <div key={item.codigo} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-sm text-[#253158]">
              <span className="mr-2 font-mono text-xs text-gray-400">{item.codigo}</span>
              {item.label}
            </span>
            <span className="text-xs font-semibold text-gray-600">
              {valores?.[item.codigo]?.valor}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type Props = { params: Promise<{ id: string }> };

export default async function ChecklistMantDetallePage({ params }: Props) {
  const { id } = await params;
  const [c, session] = await Promise.all([
    getChecklistMantencionDetalle(id),
    getPortalSessionFast(),
  ]);
  if (!c) notFound();

  const data = (c.items as ChecklistMantData | null) ?? null;
  const correctivas = data?.seccion_c ?? [];

  const puedeGestionar =
    !!session &&
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");
  const puedeAnular = puedeGestionar && !c.anulado;
  // Corregir la cabecera y continuar el ciclo requieren lo mismo que crear.
  const puedeEditar = puedeGestionar && !c.anulado;

  const datos = [
    { label: "N° correlativo", value: `#${c.correlativo}` },
    { label: "Equipo", value: c.equipo ? `${c.equipoCodigo ?? ""} ${c.equipo}`.trim() : "—" },
    { label: "Patente", value: c.patente_snapshot ?? "—" },
    { label: "Encargado", value: c.responsable ?? "—" },
    { label: "Fecha", value: fechaUTC(c.fecha) },
    { label: "Tipo de mantención", value: c.tipo_mantencion },
    { label: "Horómetro", value: c.horometro_snapshot != null ? `${fmt(c.horometro_snapshot)} h` : "—" },
    { label: "Kilometraje", value: c.km_snapshot != null ? `${fmt(c.km_snapshot)} km` : "—" },
    { label: "Próxima mantención", value: c.proxima_mantencion != null ? fmt(c.proxima_mantencion) : "—" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/mantencion/checklist-mantencion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">
              Check List #{c.correlativo}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {c.equipo ?? "Equipo"} · {c.tipo_mantencion}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {c.anulado && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-300">
              Anulado
            </span>
          )}
          <a
            href={`/api/mantencion/checklist/${c.id}/pdf`}
            className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
          >
            Descargar PDF
          </a>
          {puedeEditar && (
            <Link
              href={`/mantencion/checklist-mantencion/${c.id}/editar`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#253158] transition hover:bg-gray-50"
            >
              Editar datos
            </Link>
          )}
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

      <SeccionItems titulo="1.0 Mantenimiento del Fabricante (A)" items={SECCION_A} valores={data?.seccion_a} />
      <SeccionItems titulo="2.0 Mantenimiento Preventivo (B)" items={SECCION_B} valores={data?.seccion_b} />

      {correctivas.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-sm font-semibold text-[#253158]">Mantención Correctiva (C)</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-[#253158]">
            {correctivas.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {c.observaciones_generales && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Observaciones generales
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[#253158]">
            {c.observaciones_generales}
          </p>
        </section>
      )}

      {puedeEditar && (
        <PasoSiguiente
          titulo="Continuar con la orden de trabajo"
          descripcion="La orden se abre con el equipo, el tipo de mantención y los trabajos detectados en este check list."
          href={`/mantencion/taller/nueva?desde=${c.id}`}
          cta="Crear orden de trabajo"
        />
      )}

      {puedeAnular && (
        <div className="flex justify-end">
          <AnularConMotivoButton
            id={c.id}
            label="Anular check list"
            titulo="Anular check list"
            onAnular={anularChecklistMantencion}
          />
        </div>
      )}
    </div>
  );
}
