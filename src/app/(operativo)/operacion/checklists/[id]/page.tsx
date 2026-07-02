import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FolderOpen, Check, X } from "lucide-react";
import { getChecklistDetalle } from "@/lib/terreno/queries";
import { CHECKLIST_ITEMS } from "@/lib/terreno/checklist-items";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import AnularConMotivoButton from "@/components/terreno/AnularConMotivoButton";
import { anularChecklist } from "@/app/(operativo)/operacion/checklists/actions";

function estadoBadge(estado: string): string {
  if (estado === "Apto") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  return "bg-red-50 text-[#c6352e] ring-1 ring-red-600/20";
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

export default async function ChecklistDetallePage({ params }: Props) {
  const { id } = await params;
  const [c, session] = await Promise.all([
    getChecklistDetalle(id),
    getPortalSessionFast(),
  ]);
  if (!c) notFound();

  const label = (key: string) =>
    CHECKLIST_ITEMS.find((i) => i.key === key)?.label ?? key;

  const puedeAnular =
    !!session &&
    !c.anulado &&
    canAccessModule(session, "OPERACION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/operacion/checklists"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a checklists
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <FolderOpen className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">
              {c.equipo ?? "Checklist"}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {c.equipoCodigo ? `${c.equipoCodigo} · ` : ""}
              {fechaLarga(c.fecha)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {c.anulado && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-300">
              Anulado
            </span>
          )}
          <span
            className={"rounded-full px-3 py-1 text-xs font-medium " + estadoBadge(c.estado_general)}
          >
            {c.estado_general}
          </span>
        </div>
      </header>

      {c.anulado && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <span className="font-semibold text-[#253158]">Checklist anulado</span>
          {c.anulado_at && ` el ${fechaLarga(c.anulado_at)}`}
          {c.anulado_por && ` por ${c.anulado_por}`}
          {c.motivo_anulacion && (
            <p className="mt-1 text-gray-500">Motivo: {c.motivo_anulacion}</p>
          )}
        </div>
      )}

      {/* Datos */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <div className="flex flex-col">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Operador
            </dt>
            <dd className="mt-0.5 text-sm text-[#253158]">{c.operador ?? "—"}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Fecha
            </dt>
            <dd className="mt-0.5 text-sm text-[#253158]">{fechaLarga(c.fecha)}</dd>
          </div>
        </dl>
      </section>

      {/* Ítems */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-3 text-sm font-semibold text-[#253158]">Ítems de inspección</h2>
        <ul className="divide-y divide-gray-100">
          {c.items.map((it) => (
            <li key={it.key} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-[#253158]">{label(it.key)}</span>
              {it.valor === false ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-[#c6352e] ring-1 ring-red-600/20">
                  <X className="h-3 w-3" /> Falla
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20">
                  <Check className="h-3 w-3" /> OK
                </span>
              )}
            </li>
          ))}
        </ul>
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

      {puedeAnular && (
        <div className="flex justify-end">
          <AnularConMotivoButton
            id={c.id}
            label="Anular checklist"
            titulo="Anular checklist"
            nota="El checklist queda registrado como anulado, con motivo y trazabilidad. No se borra."
            onAnular={anularChecklist}
          />
        </div>
      )}
    </div>
  );
}
