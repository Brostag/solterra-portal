"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MantencionLista } from "@/lib/terreno/queries";

const FILTROS_ESTADO = [
  { key: "todos", label: "Todas" },
  { key: "Programada", label: "Programadas" },
  { key: "En Proceso", label: "En Proceso" },
  { key: "Completada", label: "Completadas" },
] as const;

function estadoBadge(estado: string): string {
  if (estado === "Completada") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (estado === "En Proceso") return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
  if (estado === "Programada") return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
  return "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20";
}

function tipoBadge(tipo: string): string {
  if (tipo === "Correctiva" || tipo === "Emergencia")
    return "bg-red-50 text-[#c6352e] ring-1 ring-red-600/20";
  // "Según Fabricante" (generado desde un Plan A) y "Preventiva" → azul.
  return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtCosto(costo: number | null): string {
  return costo != null ? `$${costo.toLocaleString("es-CL")}` : "—";
}

export default function MantencionesLista({
  mantenciones,
  filtroInicial,
}: {
  mantenciones: MantencionLista[];
  filtroInicial?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<string>(
    filtroInicial && FILTROS_ESTADO.some((f) => f.key === filtroInicial)
      ? filtroInicial
      : "todos",
  );

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    return mantenciones.filter((m) => {
      if (filtro !== "todos" && m.estado !== filtro) return false;
      if (!term) return true;
      return [m.equipo, m.equipoCodigo, m.tipo, m.descripcion, m.responsable].some(
        (v) => v != null && v.toLowerCase().includes(term),
      );
    });
  }, [mantenciones, q, filtro]);

  if (mantenciones.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="font-semibold text-[#253158]">Aún no hay mantenciones registradas.</p>
        <p className="mt-1 text-sm text-gray-500">
          Crea la primera mantención con el botón “Nueva mantención”.
        </p>
      </div>
    );
  }

  const href = (id: string) => `/mantencion/taller/${id}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por equipo, tipo, descripción o responsable"
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#253158] placeholder:text-gray-400 focus:border-[#253158] focus:outline-none focus:ring-2 focus:ring-[#253158]/15 sm:max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltro(f.key)}
              className={
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition " +
                (filtro === f.key
                  ? "bg-[#253158] text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="font-semibold text-[#253158]">
            No encontramos mantenciones con ese filtro.
          </p>
          <p className="mt-1 text-sm text-gray-500">Prueba con otro término o estado.</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Equipo</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Descripción</th>
                  <th className="px-4 py-3 font-semibold">Inicio</th>
                  <th className="px-4 py-3 font-semibold">Responsable</th>
                  <th className="px-4 py-3 text-right font-semibold">Costo</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtradas.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => router.push(href(m.id))}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={href(m.id)}
                        onClick={(ev) => ev.stopPropagation()}
                        className="font-medium text-[#253158] hover:underline"
                      >
                        {m.equipo ?? "—"}
                      </Link>
                      <p className="text-xs text-gray-400">{m.equipoCodigo ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium " +
                          tipoBadge(m.tipo)
                        }
                      >
                        {m.tipo}
                      </span>
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-gray-600">
                      {m.descripcion}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {fmtFecha(m.fecha_inicio)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{m.responsable ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                      {fmtCosto(m.costo)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium " +
                          estadoBadge(m.estado)
                        }
                      >
                        {m.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {filtradas.map((m) => (
              <Link
                key={m.id}
                href={href(m.id)}
                className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#253158]/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#253158]">
                      {m.equipo ?? "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {m.equipoCodigo ?? ""} · {fmtFecha(m.fecha_inicio)}
                    </p>
                  </div>
                  <span
                    className={
                      "flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium " +
                      estadoBadge(m.estado)
                    }
                  >
                    {m.estado}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-gray-600">{m.descripcion}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 font-medium " + tipoBadge(m.tipo)
                    }
                  >
                    {m.tipo}
                  </span>
                  <span>{m.responsable ?? "—"}</span>
                  <span className="font-medium text-gray-700">{fmtCosto(m.costo)}</span>
                </div>
              </Link>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            {filtradas.length} {filtradas.length === 1 ? "mantención" : "mantenciones"}
            {(q.trim() !== "" || filtro !== "todos") && ` de ${mantenciones.length}`}
          </p>
        </>
      )}
    </div>
  );
}
