"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createMantencion,
  updateMantencion,
} from "@/app/(operativo)/mantencion/taller/actions";
import type { EquipoOption, ResponsableOption } from "@/lib/terreno/queries";
import { inputCls, labelCls } from "@/lib/terreno/form-styles";
import { toUTCDateInput, toLocalDateTimeInput } from "@/lib/terreno/format";

export type MantencionFormValues = {
  id: string;
  equipo_id: string;
  responsable_id: string;
  tipo: string;
  estado: string;
  fecha_inicio: string; // ISO
  fecha_fin: string | null; // ISO
  horometro_realizada: number | null;
  descripcion: string;
  trabajos_realizados: string | null;
  repuestos_usados: string | null;
  costo: number | null;
  proxima_mantencion_horometro: number | null;
  proxima_mantencion_fecha: string | null; // ISO date
  observaciones: string | null;
};

const TIPOS = ["Según Fabricante", "Preventiva", "Correctiva", "Emergencia"];
const ESTADOS = ["Programada", "En Proceso", "Completada"];

export default function MantencionForm({
  equipos,
  responsables,
  mantencion,
}: {
  equipos: EquipoOption[];
  responsables: ResponsableOption[];
  mantencion?: MantencionFormValues;
}) {
  const editar = Boolean(mantencion);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = mantencion
        ? await updateMantencion(mantencion.id, fd)
        : await createMantencion(fd);
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
            defaultValue={mantencion?.equipo_id ?? ""}
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
            Responsable <span className="text-[#c6352e]">*</span>
          </span>
          <select
            name="responsable_id"
            required
            defaultValue={mantencion?.responsable_id ?? ""}
            className={inputCls}
          >
            <option value="" disabled>
              Seleccionar…
            </option>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelCls}>
            Tipo <span className="text-[#c6352e]">*</span>
          </span>
          <select
            name="tipo"
            defaultValue={mantencion?.tipo ?? "Preventiva"}
            className={inputCls}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelCls}>Estado</span>
          <select
            name="estado"
            defaultValue={mantencion?.estado ?? "En Proceso"}
            className={inputCls}
          >
            {ESTADOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelCls}>
            Fecha de inicio <span className="text-[#c6352e]">*</span>
          </span>
          <input
            name="fecha_inicio"
            type="datetime-local"
            required
            defaultValue={toLocalDateTimeInput(mantencion?.fecha_inicio)}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className={labelCls}>Fecha de término</span>
          <input
            name="fecha_fin"
            type="datetime-local"
            defaultValue={toLocalDateTimeInput(mantencion?.fecha_fin)}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className={labelCls}>Horómetro al realizar</span>
          <input
            name="horometro_realizada"
            type="number"
            min="0"
            step="any"
            placeholder="0"
            defaultValue={mantencion?.horometro_realizada ?? undefined}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className={labelCls}>Costo (CLP)</span>
          <input
            name="costo"
            type="number"
            min="0"
            step="any"
            placeholder="0"
            defaultValue={mantencion?.costo ?? undefined}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className={labelCls}>Próx. mantención — horómetro</span>
          <input
            name="proxima_mantencion_horometro"
            type="number"
            min="0"
            step="any"
            defaultValue={mantencion?.proxima_mantencion_horometro ?? undefined}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className={labelCls}>Próx. mantención — fecha</span>
          <input
            name="proxima_mantencion_fecha"
            type="date"
            defaultValue={toUTCDateInput(mantencion?.proxima_mantencion_fecha)}
            className={inputCls}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelCls}>
            Descripción <span className="text-[#c6352e]">*</span>
          </span>
          <textarea
            name="descripcion"
            required
            rows={3}
            defaultValue={mantencion?.descripcion}
            className={inputCls}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelCls}>Trabajos realizados</span>
          <textarea
            name="trabajos_realizados"
            rows={3}
            defaultValue={mantencion?.trabajos_realizados ?? undefined}
            className={inputCls}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelCls}>Repuestos usados</span>
          <textarea
            name="repuestos_usados"
            rows={2}
            defaultValue={mantencion?.repuestos_usados ?? undefined}
            className={inputCls}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelCls}>Observaciones</span>
          <textarea
            name="observaciones"
            rows={2}
            defaultValue={mantencion?.observaciones ?? undefined}
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
          {pending ? "Guardando…" : editar ? "Guardar cambios" : "Crear mantención"}
        </button>
        <Link
          href={
            mantencion
              ? `/mantencion/taller/${mantencion.id}`
              : "/mantencion/taller"
          }
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
