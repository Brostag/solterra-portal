"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChecklistLista } from "@/lib/terreno/queries";
import EliminarChecklistButton from "./EliminarChecklistButton";

const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "Apto", label: "Apto" },
  { key: "No Apto", label: "No Apto" },
] as const;

function estadoBadge(estado: string): string {
  if (estado === "Apto") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  return "bg-red-50 text-[#c6352e] ring-1 ring-red-600/20";
}

function fmtFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChecklistsLista({
  checklists,
  puedeEliminar,
}: {
  checklists: ChecklistLista[];
  // Controla solo el ícono de eliminar; el permiso real se valida siempre en
  // el servidor (deleteChecklist). Por defecto false: no se muestra si la
  // página que renderiza la lista no lo pasa.
  puedeEliminar?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<string>("todos");

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return checklists.filter((c) => {
      if (filtro !== "todos" && c.estado_general !== filtro) return false;
      if (!term) return true;
      return [c.equipo, c.equipoCodigo, c.operador].some(
        (v) => v != null && v.toLowerCase().includes(term),
      );
    });
  }, [checklists, q, filtro]);

  if (checklists.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="font-semibold text-[#253158]">Aún no hay checklists registrados.</p>
        <p className="mt-1 text-sm text-gray-500">
          Crea el primero con el botón “Nuevo checklist”.
        </p>
      </div>
    );
  }

  const href = (id: string) => `/operacion/checklists/${id}`;

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
            No encontramos checklists con ese filtro.
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
                  <th className="px-4 py-3 text-center font-semibold">Ítems OK</th>
                  <th className="px-4 py-3 text-center font-semibold">Fallas</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  {puedeEliminar && (
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(href(c.id))}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {fmtFechaHora(c.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={href(c.id)}
                        onClick={(ev) => ev.stopPropagation()}
                        className="font-medium text-[#253158] hover:underline"
                      >
                        {c.equipo ?? "—"}
                      </Link>
                      <p className="text-xs text-gray-400">{c.equipoCodigo ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.operador ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-medium text-green-700">
                      {c.ok} / {c.total}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={c.fail > 0 ? "font-medium text-[#c6352e]" : "text-gray-400"}
                      >
                        {c.fail}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium " +
                          estadoBadge(c.estado_general)
                        }
                      >
                        {c.estado_general}
                      </span>
                      {c.anulado && (
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 ring-1 ring-gray-300">
                          Anulado
                        </span>
                      )}
                    </td>
                    {puedeEliminar && (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <EliminarChecklistButton id={c.id} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {filtrados.map((c) => (
              // La tarjeta entera es un <Link>, así que el botón de eliminar no
              // puede ir dentro (anidaría interactivos): va como hermano,
              // posicionado sobre la esquina superior derecha. El padding
              // condicional evita que tape el badge de estado.
              <div key={c.id} className="relative">
                <Link
                  href={href(c.id)}
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
                        {c.equipo ?? "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{fmtFechaHora(c.fecha)}</p>
                    </div>
                    <span
                      className={
                        "flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium " +
                        estadoBadge(c.estado_general)
                      }
                    >
                      {c.estado_general}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>{c.operador ?? "—"}</span>
                    <span className="text-green-700">{c.ok}/{c.total} OK</span>
                    {c.fail > 0 && <span className="text-[#c6352e]">{c.fail} falla(s)</span>}
                    {c.anulado && <span className="text-gray-400">Anulado</span>}
                  </div>
                </Link>
                {puedeEliminar && (
                  <div className="absolute right-3 top-3 z-10">
                    <EliminarChecklistButton id={c.id} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            {filtrados.length} {filtrados.length === 1 ? "checklist" : "checklists"}
            {(q.trim() !== "" || filtro !== "todos") && ` de ${checklists.length}`}
          </p>
        </>
      )}
    </div>
  );
}
