"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createParte,
  updateParte,
} from "@/app/(operativo)/operacion/partes-diarios/actions";
import type { EquipoOption, ResponsableOption } from "@/lib/terreno/queries";

export type ParteFormValues = {
  id: string;
  equipo_id: string;
  operador_id: string;
  fecha: string; // ISO date
  horometro_inicio: number | null;
  horometro_fin: number | null;
  km_inicio: number | null;
  km_fin: number | null;
  combustible_litros: number | null;
  aceite_litros: number | null;
  descripcion_trabajo: string | null;
  observaciones: string | null;
  estado: string;
};

const ESTADOS = ["Pendiente", "Aprobado", "Rechazado"];

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#253158] placeholder:text-gray-400 focus:border-[#253158] focus:outline-none focus:ring-2 focus:ring-[#253158]/15";
const labelCls = "mb-1.5 block text-sm font-semibold text-gray-700";

// fecha es @db.Date (medianoche UTC): getters UTC para no retroceder un día.
function toLocalDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

const NUMEROS: { key: keyof ParteFormValues; label: string }[] = [
  { key: "horometro_inicio", label: "Horómetro inicio" },
  { key: "horometro_fin", label: "Horómetro fin" },
  { key: "km_inicio", label: "KM inicio" },
  { key: "km_fin", label: "KM fin" },
  { key: "combustible_litros", label: "Combustible (L)" },
  { key: "aceite_litros", label: "Aceite (L)" },
];

export default function ParteForm({
  equipos,
  operadores,
  parte,
}: {
  equipos: EquipoOption[];
  operadores: ResponsableOption[];
  parte?: ParteFormValues;
}) {
  const editar = Boolean(parte);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = parte ? await updateParte(parte.id, fd) : await createParte(fd);
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
            name="equipo_id"
            required
            defaultValue={parte?.equipo_id ?? ""}
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

        <label className="block">
          <span className={labelCls}>
            Operador <span className="text-[#c6352e]">*</span>
          </span>
          <select
            name="operador_id"
            required
            defaultValue={parte?.operador_id ?? ""}
            className={inputCls}
          >
            <option value="" disabled>
              Seleccionar…
            </option>
            {operadores.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelCls}>
            Fecha <span className="text-[#c6352e]">*</span>
          </span>
          <input
            name="fecha"
            type="date"
            required
            defaultValue={toLocalDate(parte?.fecha) ?? hoy()}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className={labelCls}>Estado</span>
          <select
            name="estado"
            defaultValue={parte?.estado ?? "Pendiente"}
            className={inputCls}
          >
            {ESTADOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {NUMEROS.map((n) => (
          <label key={n.key} className="block">
            <span className={labelCls}>{n.label}</span>
            <input
              name={n.key}
              type="number"
              min="0"
              step="any"
              defaultValue={(parte?.[n.key] as number | null) ?? undefined}
              className={inputCls}
            />
          </label>
        ))}

        <label className="block sm:col-span-2">
          <span className={labelCls}>Descripción del trabajo</span>
          <textarea
            name="descripcion_trabajo"
            rows={3}
            defaultValue={parte?.descripcion_trabajo ?? undefined}
            className={inputCls}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelCls}>Observaciones</span>
          <textarea
            name="observaciones"
            rows={2}
            defaultValue={parte?.observaciones ?? undefined}
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
          {pending ? "Guardando…" : editar ? "Guardar cambios" : "Crear parte"}
        </button>
        <Link
          href={
            parte
              ? `/operacion/partes-diarios/${parte.id}`
              : "/operacion/partes-diarios"
          }
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
