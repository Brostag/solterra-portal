"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CertificadoLista } from "@/lib/terreno/queries";

const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "Vigente", label: "Vigentes" },
  { key: "Por Vencer", label: "Por Vencer" },
  { key: "Vencido", label: "Vencidos" },
] as const;

function estadoBadge(estado: string): string {
  if (estado === "Vigente") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (estado === "Por Vencer") return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
  if (estado === "Vencido") return "bg-red-50 text-[#c6352e] ring-1 ring-red-600/20";
  return "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20";
}

// fecha_vencimiento es @db.Date (medianoche UTC): formatear en UTC para no
// retroceder un día en zonas horarias negativas como Chile (UTC-4).
function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function diasRestantes(iso: string): { texto: string; cls: string } {
  // Comparar contra la medianoche UTC de hoy para alinear con la fecha @db.Date.
  const hoy = new Date();
  const hoyUTC = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  const dias = Math.floor((new Date(iso).getTime() - hoyUTC) / 86_400_000);
  if (dias < 0) return { texto: `Venció hace ${Math.abs(dias)} días`, cls: "text-[#c6352e]" };
  if (dias === 0) return { texto: "Vence hoy", cls: "text-amber-600" };
  return { texto: `en ${dias} días`, cls: dias <= 30 ? "text-amber-600" : "text-gray-500" };
}

export default function CertificadosLista({
  certificados,
}: {
  certificados: CertificadoLista[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<string>("todos");

  const vencidos = useMemo(
    () => certificados.filter((c) => c.estado === "Vencido").length,
    [certificados],
  );
  const porVencer = useMemo(
    () => certificados.filter((c) => c.estado === "Por Vencer").length,
    [certificados],
  );

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return certificados.filter((c) => {
      if (filtro !== "todos" && c.estado !== filtro) return false;
      if (!term) return true;
      return [c.equipo, c.equipoCodigo, c.tipo, c.numero, c.empresa_emisora].some(
        (v) => v != null && v.toLowerCase().includes(term),
      );
    });
  }, [certificados, q, filtro]);

  if (certificados.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="font-semibold text-[#253158]">Aún no hay certificados registrados.</p>
        <p className="mt-1 text-sm text-gray-500">
          Registra el primer documento con el botón “Nuevo certificado”.
        </p>
      </div>
    );
  }

  const href = (id: string) => `/mantencion/certificados/${id}`;

  return (
    <div className="space-y-4">
      {/* Alertas de vencimiento */}
      {(vencidos > 0 || porVencer > 0) && (
        <div className="flex flex-wrap gap-3">
          {vencidos > 0 && (
            <div className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#c6352e]">
              {vencidos} certificado{vencidos > 1 ? "s" : ""} vencido
              {vencidos > 1 ? "s" : ""}
            </div>
          )}
          {porVencer > 0 && (
            <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {porVencer} certificado{porVencer > 1 ? "s" : ""} por vencer en 30 días
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por equipo, tipo, número o empresa"
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
            No encontramos certificados con ese filtro.
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
                  <th className="px-4 py-3 font-semibold">N° documento</th>
                  <th className="px-4 py-3 font-semibold">Vencimiento</th>
                  <th className="px-4 py-3 font-semibold">Tiempo restante</th>
                  <th className="px-4 py-3 font-semibold">Empresa</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((c) => {
                  const dias = diasRestantes(c.fecha_vencimiento);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(href(c.id))}
                      className="cursor-pointer hover:bg-gray-50"
                    >
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
                      <td className="px-4 py-3 text-gray-600">{c.tipo}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {c.numero ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {fmtFecha(c.fecha_vencimiento)}
                      </td>
                      <td className={"whitespace-nowrap px-4 py-3 text-xs " + dias.cls}>
                        {dias.texto}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.empresa_emisora ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium " +
                            estadoBadge(c.estado)
                          }
                        >
                          {c.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {filtrados.map((c) => {
              const dias = diasRestantes(c.fecha_vencimiento);
              return (
                <Link
                  key={c.id}
                  href={href(c.id)}
                  className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#253158]/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#253158]">
                        {c.equipo ?? "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{c.tipo}</p>
                    </div>
                    <span
                      className={
                        "flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium " +
                        estadoBadge(c.estado)
                      }
                    >
                      {c.estado}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>
                      Vence:{" "}
                      <span className="font-medium text-gray-700">
                        {fmtFecha(c.fecha_vencimiento)}
                      </span>
                    </span>
                    <span className={dias.cls}>{dias.texto}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <p className="text-xs text-gray-400">
            {filtrados.length} {filtrados.length === 1 ? "certificado" : "certificados"}
            {(q.trim() !== "" || filtro !== "todos") && ` de ${certificados.length}`}
          </p>
        </>
      )}
    </div>
  );
}
