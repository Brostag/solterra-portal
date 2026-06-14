"use client";

import { useMemo, useState } from "react";
import type { EquipoLista } from "@/lib/terreno/queries";

const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "Activo", label: "Activos" },
  { key: "En Mantención", label: "En Mantención" },
  { key: "Fuera de Servicio", label: "Fuera de Servicio" },
] as const;

function estadoBadge(estado: string): string {
  if (estado === "Activo") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (estado === "En Mantención") return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
  if (estado === "Fuera de Servicio") return "bg-red-50 text-[#c6352e] ring-1 ring-red-600/20";
  return "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20";
}

function fmt(n: number): string {
  return n.toLocaleString("es-CL");
}

export default function EquiposLista({ equipos }: { equipos: EquipoLista[] }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<string>("todos");

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return equipos.filter((e) => {
      if (filtro !== "todos" && e.estado !== filtro) return false;
      if (!term) return true;
      return [e.codigo, e.nombre, e.tipo, e.marca, e.modelo, e.patente].some(
        (v) => v != null && v.toLowerCase().includes(term),
      );
    });
  }, [equipos, q, filtro]);

  // Estado vacío total: no hay equipos en la base.
  if (equipos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="font-semibold text-[#253158]">Aún no hay equipos registrados.</p>
        <p className="mt-1 text-sm text-gray-500">
          Los equipos aparecerán aquí cuando se carguen al sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Buscador + filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por código, nombre, tipo, marca, modelo o patente"
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#253158] placeholder:text-gray-400 focus:border-[#253158] focus:outline-none focus:ring-2 focus:ring-[#253158]/15 sm:max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
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

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="font-semibold text-[#253158]">
            No encontramos equipos con ese filtro.
          </p>
          <p className="mt-1 text-sm text-gray-500">Prueba con otro término o estado.</p>
        </div>
      ) : (
        <>
          {/* Desktop: tabla (scroll horizontal contenido en el wrapper) */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Marca / Modelo</th>
                  <th className="px-4 py-3 font-semibold">Patente</th>
                  <th className="px-4 py-3 text-right font-semibold">Horómetro</th>
                  <th className="px-4 py-3 text-right font-semibold">KM</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[#253158]">
                      {e.codigo}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{e.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{e.tipo}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {[e.marca, e.modelo].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{e.patente || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                      {fmt(e.horometro_actual)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                      {e.km_actual > 0 ? fmt(e.km_actual) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium " +
                          estadoBadge(e.estado)
                        }
                      >
                        {e.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {filtrados.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#253158]">
                      {e.codigo} · {e.nombre}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{e.tipo}</p>
                  </div>
                  <span
                    className={
                      "flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium " +
                      estadoBadge(e.estado)
                    }
                  >
                    {e.estado}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>
                    Horómetro:{" "}
                    <span className="font-medium text-gray-700">{fmt(e.horometro_actual)} h</span>
                  </span>
                  {e.km_actual > 0 && (
                    <span>
                      KM: <span className="font-medium text-gray-700">{fmt(e.km_actual)}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            {filtrados.length} {filtrados.length === 1 ? "equipo" : "equipos"}
            {(q.trim() !== "" || filtro !== "todos") && ` de ${equipos.length}`}
          </p>
        </>
      )}
    </div>
  );
}
