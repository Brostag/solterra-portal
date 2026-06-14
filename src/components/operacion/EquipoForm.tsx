"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createEquipo } from "@/app/(operativo)/operacion/equipos/actions";

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#253158] placeholder:text-gray-400 focus:border-[#253158] focus:outline-none focus:ring-2 focus:ring-[#253158]/15";

function Campo({
  label,
  name,
  required = false,
  type = "text",
  placeholder,
  min,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label} {required && <span className="text-[#c6352e]">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        min={min}
        step={type === "number" ? "any" : undefined}
        className={inputCls}
      />
    </label>
  );
}

export default function EquipoForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      // En éxito la action redirige (no retorna); en error devuelve { error }.
      const res = await createEquipo(fd);
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
        <Campo label="Código" name="codigo" required placeholder="EQ-001" />
        <Campo label="Nombre" name="nombre" required placeholder="Excavadora CAT 320D" />
        <Campo label="Tipo" name="tipo" required placeholder="Excavadora, Camión, etc." />
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-gray-700">Estado</span>
          <select name="estado" defaultValue="Activo" className={inputCls}>
            <option value="Activo">Activo</option>
            <option value="En Mantención">En Mantención</option>
            <option value="Fuera de Servicio">Fuera de Servicio</option>
          </select>
        </label>
        <Campo label="Marca" name="marca" placeholder="Caterpillar" />
        <Campo label="Modelo" name="modelo" placeholder="320D" />
        <Campo label="Número de serie" name="numero_serie" />
        <Campo label="Patente" name="patente" />
        <Campo label="Año" name="anio" type="number" placeholder="2019" />
        <div className="hidden sm:block" aria-hidden="true" />
        <Campo label="Horómetro actual" name="horometro_actual" type="number" min="0" placeholder="0" />
        <Campo label="KM actual" name="km_actual" type="number" min="0" placeholder="0" />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#253158] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2540] disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Crear equipo"}
        </button>
        <Link
          href="/operacion/equipos"
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
