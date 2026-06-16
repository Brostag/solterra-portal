"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { createChecklist } from "@/app/(operativo)/operacion/checklists/actions";
import {
  CHECKLIST_ITEMS,
  CHECKLIST_ITEM_KEYS,
  calcEstadoGeneral,
  type ChecklistItemKey,
} from "@/lib/terreno/checklist-items";
import type { EquipoOption, ResponsableOption } from "@/lib/terreno/queries";

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#253158] focus:border-[#253158] focus:outline-none focus:ring-2 focus:ring-[#253158]/15";
const labelCls = "mb-1.5 block text-sm font-semibold text-gray-700";

function estadoBadge(estado: string): string {
  if (estado === "Apto") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  return "bg-red-50 text-[#c6352e] ring-1 ring-red-600/20";
}

function initItems(): Record<ChecklistItemKey, boolean> {
  return CHECKLIST_ITEM_KEYS.reduce(
    (acc, k) => ({ ...acc, [k]: true }),
    {} as Record<ChecklistItemKey, boolean>,
  );
}

export default function ChecklistForm({
  equipos,
  operadores,
}: {
  equipos: EquipoOption[];
  operadores: ResponsableOption[];
}) {
  const [equipoId, setEquipoId] = useState("");
  const [operadorId, setOperadorId] = useState("");
  const [items, setItems] = useState<Record<ChecklistItemKey, boolean>>(initItems);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const estadoGeneral = useMemo(() => calcEstadoGeneral(items), [items]);

  function toggle(key: ChecklistItemKey) {
    setItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!equipoId) return setError("Debes seleccionar un equipo.");
    if (!operadorId) return setError("Debes seleccionar un operador.");
    startTransition(async () => {
      const res = await createChecklist({
        equipo_id: equipoId,
        operador_id: operadorId,
        items,
        observaciones,
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
        <label className="block">
          <span className={labelCls}>
            Equipo <span className="text-[#c6352e]">*</span>
          </span>
          <select
            value={equipoId}
            onChange={(e) => setEquipoId(e.target.value)}
            className={inputCls}
          >
            <option value="">Seleccionar…</option>
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} · {e.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>
            Operador <span className="text-[#c6352e]">*</span>
          </span>
          <select
            value={operadorId}
            onChange={(e) => setOperadorId(e.target.value)}
            className={inputCls}
          >
            <option value="">Seleccionar…</option>
            {operadores.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Ítems de inspección */}
      <div className="mt-6">
        <p className={labelCls}>Ítems de inspección</p>
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {CHECKLIST_ITEMS.map((item) => {
            const ok = items[item.key];
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <span className="text-sm text-[#253158]">{item.label}</span>
                <button
                  type="button"
                  onClick={() => toggle(item.key)}
                  className={
                    "w-20 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition " +
                    (ok
                      ? "bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-100"
                      : "bg-red-50 text-[#c6352e] ring-red-600/20 hover:bg-red-100")
                  }
                  aria-pressed={ok}
                >
                  {ok ? "✓ OK" : "✗ Falla"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Estado general en vivo */}
      <div className="mt-4 flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
        <span className="text-sm text-gray-500">Estado general:</span>
        <span
          className={
            "rounded-full px-2.5 py-0.5 text-xs font-medium " +
            estadoBadge(estadoGeneral)
          }
        >
          {estadoGeneral}
        </span>
      </div>

      <label className="mt-4 block">
        <span className={labelCls}>Observaciones</span>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          className={inputCls}
        />
      </label>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#253158] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2540] disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar checklist"}
        </button>
        <Link
          href="/operacion/checklists"
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
