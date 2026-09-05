"use client";

import { useState, useTransition } from "react";
import {
  generarReporte,
  type ReporteTipo,
  type Columna,
  type Fila,
} from "@/app/(operativo)/mantencion/reportes/actions";
import type { EquipoOption } from "@/lib/terreno/queries";

const TIPOS: { value: ReporteTipo; label: string; conFecha: boolean }[] = [
  { value: "mantenciones", label: "Mantenciones", conFecha: true },
  { value: "certificados", label: "Certificados", conFecha: false },
  { value: "partes", label: "Órdenes de Trabajo", conFecha: true },
  { value: "checklists", label: "Checklists", conFecha: true },
  { value: "checklists-mantencion", label: "Checklists de mantención", conFecha: true },
  { value: "certificados-mantencion", label: "Certificados de mantención", conFecha: true },
];

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#253158] focus:border-[#253158] focus:outline-none focus:ring-2 focus:ring-[#253158]/15";
const labelCls = "mb-1.5 block text-sm font-semibold text-gray-700";

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}
function hace30(): string {
  return new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
}

function celda(v: string | number | null): string {
  if (v == null) return "—";
  if (typeof v === "number") return v.toLocaleString("es-CL");
  return v;
}

export default function ReportesCliente({
  equipos,
}: {
  equipos: EquipoOption[];
}) {
  const [tipo, setTipo] = useState<ReporteTipo>("mantenciones");
  const [equipoId, setEquipoId] = useState("");
  const [desde, setDesde] = useState(hace30());
  const [hasta, setHasta] = useState(hoy());
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    columnas: Columna[];
    filas: Fila[];
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const tipoActual = TIPOS.find((t) => t.value === tipo)!;

  function generar() {
    setError(null);
    startTransition(async () => {
      const res = await generarReporte({ tipo, equipoId, desde, hasta });
      if ("error" in res) {
        setError(res.error);
        setResultado(null);
        return;
      }
      setResultado(res);
    });
  }

  function exportCSV() {
    if (!resultado) return;
    const head = resultado.columnas.map((c) => c.label).join(",");
    const escape = (v: string) =>
      /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const rows = resultado.filas.map((f) =>
      resultado.columnas.map((c) => escape(celda(f[c.key]))).join(","),
    );
    descargar(
      [head, ...rows].join("\n"),
      `solterra_${tipo}_${desde}_${hasta}.csv`,
      "text/csv;charset=utf-8;",
    );
  }

  function exportJSON() {
    if (!resultado) return;
    descargar(
      JSON.stringify(resultado.filas, null, 2),
      `solterra_${tipo}_${desde}.json`,
      "application/json",
    );
  }

  function descargar(contenido: string, nombre: string, mime: string) {
    const blob = new Blob([contenido], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Configuración */}
      <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold text-[#253158]">Configurar reporte</h2>

        <div>
          <span className={labelCls}>Tipo de reporte</span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TIPOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value)}
                className={
                  "rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition " +
                  (tipo === t.value
                    ? "border-[#253158] bg-[#253158]/10 text-[#253158]"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={labelCls}>Equipo (opcional)</span>
            <select
              value={equipoId}
              onChange={(e) => setEquipoId(e.target.value)}
              className={inputCls}
            >
              <option value="">Todos los equipos</option>
              {equipos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} · {e.nombre}
                </option>
              ))}
            </select>
          </label>
          {tipoActual.conFecha && (
            <>
              <label className="block">
                <span className={labelCls}>Desde</span>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Hasta</span>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className={inputCls}
                />
              </label>
            </>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#c6352e]">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={generar}
          disabled={pending}
          className="rounded-lg bg-[#253158] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2540] disabled:opacity-60"
        >
          {pending ? "Generando…" : "Generar reporte"}
        </button>
      </section>

      {/* Resultados */}
      {resultado && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[#253158]">Resultados</h2>
              <p className="text-sm text-gray-500">
                {resultado.filas.length}{" "}
                {resultado.filas.length === 1 ? "registro" : "registros"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportCSV}
                disabled={resultado.filas.length === 0}
                className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#253158] transition hover:bg-gray-50 disabled:opacity-50"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={exportJSON}
                disabled={resultado.filas.length === 0}
                className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#253158] transition hover:bg-gray-50 disabled:opacity-50"
              >
                Exportar JSON
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={resultado.filas.length === 0}
                className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#253158] transition hover:bg-gray-50 disabled:opacity-50"
              >
                Imprimir
              </button>
            </div>
          </div>

          {resultado.filas.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Sin datos para los filtros seleccionados.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    {resultado.columnas.map((c) => (
                      <th key={c.key} className="px-4 py-3 font-semibold">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resultado.filas.map((f, i) => (
                    <tr key={i}>
                      {resultado.columnas.map((c) => (
                        <td key={c.key} className="px-4 py-2.5 text-gray-700">
                          {celda(f[c.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
