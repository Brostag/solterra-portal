"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ParteLista } from "@/lib/terreno/queries";

const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "Pendiente", label: "Pendientes" },
  { key: "Aprobado", label: "Aprobados" },
  { key: "Rechazado", label: "Rechazados" },
] as const;

function estadoBadge(estado: string): string {
  if (estado === "Aprobado") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (estado === "Rechazado") return "bg-red-50 text-[#c6352e] ring-1 ring-red-600/20";
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtNum(n: number | null): string {
  return n != null ? n.toLocaleString("es-CL") : "—";
}

export default function PartesLista({ partes }: { partes: ParteLista[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<string>("todos");

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return partes.filter((p) => {
      if (filtro !== "todos" && p.estado !== filtro) return false;
      if (!term) return true;
      return [p.equipo, p.equipoCodigo, p.operador].some(
        (v) => v != null && v.toLowerCase().includes(term),
      );
    });
  }, [partes, q, filtro]);

  if (partes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="font-semibold text-[#253158]">Aún no hay partes diarios registrados.</p>
        <p className="mt-1 text-sm text-gray-500">
          Crea el primero con el botón “Nuevo parte”.
        </p>
      </div>
    );
  }

  const href = (id: string) => `/operacion/partes-diarios/${id}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por equipo u operador"
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
            No encontramos partes con ese filtro.
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
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Equipo</th>
                  <th className="px-4 py-3 font-semibold">Operador</th>
                  <th className="px-4 py-3 font-semibold">Horómetro</th>
                  <th className="px-4 py-3 text-right font-semibold">Combustible</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(href(p.id))}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {fmtFecha(p.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={href(p.id)}
                        onClick={(ev) => ev.stopPropagation()}
                        className="font-medium text-[#253158] hover:underline"
                      >
                        {p.equipo ?? "—"}
                      </Link>
                      <p className="text-xs text-gray-400">{p.equipoCodigo ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.operador ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {p.horometro_inicio != null && p.horometro_fin != null
                        ? `${fmtNum(p.horometro_inicio)} → ${fmtNum(p.horometro_fin)}`
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-600">
                      {p.combustible_litros != null ? `${fmtNum(p.combustible_litros)} L` : "—"}
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {filtrados.map((p) => (
              <Link
                key={p.id}
                href={href(p.id)}
                className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#253158]/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#253158]">{p.equipo ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {p.equipoCodigo ?? ""} · {fmtFecha(p.fecha)}
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
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>{p.operador ?? "—"}</span>
                  {p.horometro_inicio != null && p.horometro_fin != null && (
                    <span>
                      {fmtNum(p.horometro_inicio)} → {fmtNum(p.horometro_fin)} h
                    </span>
                  )}
                  {p.combustible_litros != null && (
                    <span>{fmtNum(p.combustible_litros)} L</span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            {filtrados.length} {filtrados.length === 1 ? "parte" : "partes"}
            {(q.trim() !== "" || filtro !== "todos") && ` de ${partes.length}`}
          </p>
        </>
      )}
    </div>
  );
}
