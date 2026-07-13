"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { createPlan } from "@/app/(operativo)/mantencion/planes/actions";
import type {
  EquipoOption,
  RegistroRecienteOption,
} from "@/lib/terreno/queries";
import { inputCls, labelCls } from "@/lib/terreno/form-styles";

const PLANES = [
  { value: "A", label: "Plan A — Según fabricante" },
  { value: "B", label: "Plan B — Preventivo" },
  { value: "C", label: "Plan C — Correctivo" },
] as const;

// @db.Date → formatear en UTC para no retroceder un día en Chile (UTC-4).
function fmtFechaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function PlanForm({
  equipos,
  registros,
}: {
  equipos: EquipoOption[];
  registros: RegistroRecienteOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Estado controlado: el registro de entrada prellena los demás campos.
  const [registroId, setRegistroId] = useState("");
  const [equipoId, setEquipoId] = useState("");
  const [plan, setPlan] = useState<string>("A");
  const [descripcion, setDescripcion] = useState("");
  const [fechaPlanificada, setFechaPlanificada] = useState("");
  const [horometro, setHorometro] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const registrosById = useMemo(() => {
    const map = new Map<string, RegistroRecienteOption>();
    for (const r of registros) map.set(r.id, r);
    return map;
  }, [registros]);

  function onSelectRegistro(id: string) {
    setRegistroId(id);
    if (!id) return;
    const r = registrosById.get(id);
    if (!r) return;
    // Prefill desde el paso 1 (registro de entrada). Todo queda editable.
    setEquipoId(r.equipo_id);
    if (r.horometro != null) setHorometro(String(r.horometro));
    if (r.observaciones) setObservaciones(r.observaciones);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const horoNum = horometro.trim() ? Number(horometro) : null;
      if (horoNum != null && (Number.isNaN(horoNum) || horoNum < 0)) {
        setError("El horómetro de referencia no es válido.");
        return;
      }
      const res = await createPlan({
        plan: plan as "A" | "B" | "C",
        descripcion,
        equipo_id: equipoId,
        registro_id: registroId || null,
        fecha_planificada: fechaPlanificada || null,
        horometro_referencia: horoNum,
        observaciones: observaciones || null,
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#c6352e]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelCls}>Registro de entrada (paso 1)</span>
          <select
            value={registroId}
            onChange={(e) => onSelectRegistro(e.target.value)}
            className={inputCls}
          >
            <option value="">Sin registro — planificar manualmente</option>
            {registros.map((r) => (
              <option key={r.id} value={r.id}>
                {fmtFechaUTC(r.fecha)} · {r.equipo ?? "Equipo"}
                {r.horometro != null ? ` · ${r.horometro} h` : ""}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-gray-500">
            Al elegir un registro se prellenan equipo, horómetro y observaciones.
            Puedes ajustarlos.
          </span>
        </label>

        <label className="block sm:col-span-2">
          <span className={labelCls}>
            Equipo <span className="text-[#c6352e]">*</span>
          </span>
          <select
            value={equipoId}
            onChange={(e) => setEquipoId(e.target.value)}
            required
            className={inputCls}
          >
            <option value="" disabled>
              Seleccionar…
            </option>
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} · {e.nombre}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="block sm:col-span-2">
          <span className={labelCls}>
            Plan de mantención <span className="text-[#c6352e]">*</span>
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PLANES.map((p) => {
              const activo = plan === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlan(p.value)}
                  className={
                    "rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition " +
                    (activo
                      ? "border-[#253158] bg-[#253158]/5 text-[#253158] ring-1 ring-[#253158]/30"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="block">
          <span className={labelCls}>Fecha planificada</span>
          <input
            type="date"
            value={fechaPlanificada}
            onChange={(e) => setFechaPlanificada(e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className={labelCls}>Horómetro de referencia</span>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="0"
            value={horometro}
            onChange={(e) => setHorometro(e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelCls}>
            Tareas planificadas <span className="text-[#c6352e]">*</span>
          </span>
          <textarea
            required
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Detalle de las tareas a realizar en la orden de trabajo."
            className={inputCls}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelCls}>Observaciones</span>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#253158] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2540] disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Crear plan"}
        </button>
        <Link
          href="/mantencion/planes"
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
