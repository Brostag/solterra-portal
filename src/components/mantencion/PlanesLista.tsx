"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PlanMantLista } from "@/lib/terreno/queries";
import EliminarPlanButton from "./EliminarPlanButton";

const FILTROS_PLAN = [
  { key: "todos", label: "Todos" },
  { key: "A", label: "Plan A" },
  { key: "B", label: "Plan B" },
  { key: "C", label: "Plan C" },
] as const;

const FILTROS_ESTADO = [
  { key: "todos", label: "Todos" },
  { key: "Planificado", label: "Planificados" },
  { key: "Con OT", label: "Con OT" },
  { key: "Anulado", label: "Anulados" },
] as const;

const PLAN_LABEL: Record<string, string> = {
  A: "A — Según fabricante",
  B: "B — Preventivo",
  C: "C — Correctivo",
};

function planBadge(plan: string): string {
  if (plan === "A") return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
  if (plan === "B") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (plan === "C") return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
  return "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20";
}

function estadoBadge(estado: string): string {
  if (estado === "Con OT") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (estado === "Planificado") return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
  if (estado === "Anulado") return "bg-gray-100 text-gray-500 ring-1 ring-gray-300";
  return "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20";
}

function planCorto(plan: string): string {
  return `Plan ${plan}`;
}

// @db.Date → formatear en UTC para no retroceder un día en Chile (UTC-4).
function fmtFechaUTC(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function PlanesLista({
  planes,
  filtroPlanInicial,
  filtroEstadoInicial,
  puedeEliminar,
}: {
  planes: PlanMantLista[];
  filtroPlanInicial?: string;
  filtroEstadoInicial?: string;
  // Controla solo el ícono de eliminar; el permiso real se valida siempre en
  // el servidor (deletePlan).
  puedeEliminar?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filtroPlan, setFiltroPlan] = useState<string>(
    filtroPlanInicial && FILTROS_PLAN.some((f) => f.key === filtroPlanInicial)
      ? filtroPlanInicial
      : "todos",
  );
  const [filtroEstado, setFiltroEstado] = useState<string>(
    filtroEstadoInicial &&
      FILTROS_ESTADO.some((f) => f.key === filtroEstadoInicial)
      ? filtroEstadoInicial
      : "todos",
  );

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return planes.filter((p) => {
      if (filtroPlan !== "todos" && p.plan !== filtroPlan) return false;
      if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
      if (!term) return true;
      return [p.equipo, p.equipoCodigo, p.responsable, `n°${p.correlativo}`].some(
        (v) => v != null && v.toLowerCase().includes(term),
      );
    });
  }, [planes, q, filtroPlan, filtroEstado]);

  if (planes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="font-semibold text-[#253158]">Aún no hay planes de mantención.</p>
        <p className="mt-1 text-sm text-gray-500">
          Crea el primero con el botón “Nuevo plan”.
        </p>
      </div>
    );
  }

  const href = (id: string) => `/mantencion/planes/${id}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por equipo, responsable o número"
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#253158] placeholder:text-gray-400 focus:border-[#253158] focus:outline-none focus:ring-2 focus:ring-[#253158]/15 sm:max-w-md"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex flex-wrap gap-2">
            {FILTROS_PLAN.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltroPlan(f.key)}
                className={
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition " +
                  (filtroPlan === f.key
                    ? "bg-[#253158] text-white"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTROS_ESTADO.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltroEstado(f.key)}
                className={
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition " +
                  (filtroEstado === f.key
                    ? "bg-[#253158] text-white"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="font-semibold text-[#253158]">
            No encontramos planes con ese filtro.
          </p>
          <p className="mt-1 text-sm text-gray-500">Prueba con otro término o filtro.</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">N°</th>
                  <th className="px-4 py-3 font-semibold">Equipo</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Fecha planificada</th>
                  <th className="px-4 py-3 font-semibold">Responsable</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  {puedeEliminar && (
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(href(p.id))}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        href={href(p.id)}
                        onClick={(ev) => ev.stopPropagation()}
                        className="font-medium text-[#253158] hover:underline"
                      >
                        #{p.correlativo}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#253158]">{p.equipo ?? "—"}</p>
                      <p className="text-xs text-gray-400">{p.equipoCodigo ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium " +
                          planBadge(p.plan)
                        }
                        title={PLAN_LABEL[p.plan] ?? p.plan}
                      >
                        {planCorto(p.plan)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {fmtFechaUTC(p.fecha_planificada)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.responsable ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium " +
                          estadoBadge(p.estado)
                        }
                      >
                        {p.estado}
                      </span>
                    </td>
                    {puedeEliminar && (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <EliminarPlanButton id={p.id} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {filtrados.map((p) => (
              // La tarjeta entera es un <Link>, así que el botón de eliminar no
              // puede ir dentro (anidaría interactivos): va como hermano,
              // posicionado sobre la esquina superior derecha. El padding
              // condicional evita que tape el badge de estado.
              <div key={p.id} className="relative">
                <Link
                  href={href(p.id)}
                  className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#253158]/30"
                >
                  <div
                    className={
                      "flex items-start justify-between gap-3" +
                      (puedeEliminar ? " pr-9" : "")
                    }
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#253158]">
                        #{p.correlativo} · {p.equipo ?? "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {p.equipoCodigo ?? ""} · {fmtFechaUTC(p.fecha_planificada)}
                      </p>
                    </div>
                    <span
                      className={
                        "flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium " +
                        estadoBadge(p.estado)
                      }
                    >
                      {p.estado}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 font-medium " + planBadge(p.plan)
                      }
                    >
                      {PLAN_LABEL[p.plan] ?? planCorto(p.plan)}
                    </span>
                    <span>{p.responsable ?? "—"}</span>
                  </div>
                </Link>
                {puedeEliminar && (
                  <div className="absolute right-3 top-3 z-10">
                    <EliminarPlanButton id={p.id} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            {filtrados.length} {filtrados.length === 1 ? "plan" : "planes"}
            {(q.trim() !== "" || filtroPlan !== "todos" || filtroEstado !== "todos") &&
              ` de ${planes.length}`}
          </p>
        </>
      )}
    </div>
  );
}
