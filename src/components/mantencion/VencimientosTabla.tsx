"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EquipoVencimientos, VencimientoDoc } from "@/lib/terreno/queries";

const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "Vencido", label: "Con vencidos" },
  { key: "Por Vencer", label: "Por vencer" },
] as const;

function celdaCls(estado: string): string {
  if (estado === "Vencido") return "bg-red-50 text-[#c6352e]";
  if (estado === "Por Vencer") return "bg-amber-50 text-amber-700";
  if (estado === "Vigente") return "bg-green-50 text-green-700";
  return "text-gray-400";
}

function fechaUTC(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function detalle(d: VencimientoDoc): string {
  if (!d.fecha) return "—";
  if (d.estado === "Vencido") return "Vencido";
  return `${d.dias}d`;
}

function Celda({ doc }: { doc: VencimientoDoc }) {
  return (
    <td className={"whitespace-nowrap px-3 py-2.5 text-xs " + celdaCls(doc.estado)}>
      <div className="font-medium">{fechaUTC(doc.fecha)}</div>
      <div>{detalle(doc)}</div>
    </td>
  );
}

export default function VencimientosTabla({
  equipos,
}: {
  equipos: EquipoVencimientos[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<string>("todos");

  const tieneEstado = (e: EquipoVencimientos, estado: string) =>
    [e.soap, e.permiso_circ, e.rev_tecnica, e.extintor].some(
      (d) => d.estado === estado,
    );

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return equipos.filter((e) => {
      if (filtro !== "todos" && !tieneEstado(e, filtro)) return false;
      if (!term) return true;
      return [e.codigo, e.nombre, e.tipo, e.patente].some(
        (v) => v != null && v.toLowerCase().includes(term),
      );
    });
  }, [equipos, q, filtro]);

  if (equipos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="font-semibold text-[#253158]">Aún no hay equipos registrados.</p>
        <p className="mt-1 text-sm text-gray-500">
          Las fechas de vencimiento se cargan en cada equipo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por equipo, tipo o patente"
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

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Equipo</th>
              <th className="px-3 py-3 font-semibold">Patente</th>
              <th className="px-3 py-3 font-semibold">SOAP</th>
              <th className="px-3 py-3 font-semibold">Permiso circ.</th>
              <th className="px-3 py-3 font-semibold">Rev. técnica</th>
              <th className="px-3 py-3 font-semibold">Extintor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.map((e) => (
              <tr
                key={e.id}
                onClick={() => router.push(`/mantencion/equipos/${e.id}`)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/mantencion/equipos/${e.id}`}
                    onClick={(ev) => ev.stopPropagation()}
                    className="font-medium text-[#253158] hover:underline"
                  >
                    {e.codigo}
                  </Link>
                  <p className="text-xs text-gray-400">{e.nombre}</p>
                </td>
                <td className="px-3 py-2.5 text-gray-500">{e.patente || "—"}</td>
                <Celda doc={e.soap} />
                <Celda doc={e.permiso_circ} />
                <Celda doc={e.rev_tecnica} />
                <Celda doc={e.extintor} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        {filtrados.length} {filtrados.length === 1 ? "equipo" : "equipos"}
        {(q.trim() !== "" || filtro !== "todos") && ` de ${equipos.length}`}
      </p>
    </div>
  );
}
