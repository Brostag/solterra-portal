"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createCertificadoMantencion,
  type CertMantInput,
} from "@/app/(operativo)/mantencion/certificado-mantencion/actions";
import type { EquipoOption, ResponsableOption } from "@/lib/terreno/queries";
import { inputCls, labelCls } from "@/lib/terreno/form-styles";

// Valores propuestos al emitir un certificado desde una orden de trabajo.
// Estructura compatible con PrefillCertificado de @/lib/terreno/cadena (se le
// pasa tal cual). Gerente y ciudad no tienen origen: conservan su default.
export type CertMantPrefill = {
  equipo_id: string;
  responsable_id: string | null;
  /** "YYYY-MM-DD" listo para <input type="date">. */
  fecha: string;
  horometro: number | null;
  odometro: number | null;
  proxima_mantencion: number | null;
  /** Id de la orden de trabajo de origen. Se manda y el servidor lo re-valida. */
  origen_id: string;
};

// Un id propuesto puede apuntar a un equipo eliminado o a un responsable
// inactivo, que no están en el selector. En ese caso se deja el campo vacío
// para que el usuario elija, en vez de enviar un id que el servidor rechazaría.
function opcionValida(
  lista: ReadonlyArray<{ id: string }>,
  id: string | null | undefined,
): string {
  return id && lista.some((o) => o.id === id) ? id : "";
}

export default function CertMantForm({
  equipos,
  responsables,
  prefill,
}: {
  equipos: EquipoOption[];
  responsables: ResponsableOption[];
  prefill?: CertMantPrefill;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "");
    const input: CertMantInput = {
      equipo_id: g("equipo_id"),
      responsable_id: g("responsable_id"),
      gerente_id: g("gerente_id"),
      fecha: g("fecha"),
      ciudad: g("ciudad"),
      horometro: g("horometro"),
      odometro: g("odometro"),
      proxima_mantencion: g("proxima_mantencion"),
      // Traza de la orden de trabajo de origen. Viaja solo el id; el servidor
      // vuelve a leer la orden antes de guardar el vínculo.
      mantencion_id: prefill?.origen_id ?? null,
    };
    startTransition(async () => {
      const res = await createCertificadoMantencion(input);
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
          <span className={labelCls}>Equipo <span className="text-[#c6352e]">*</span></span>
          <select
            name="equipo_id"
            required
            defaultValue={opcionValida(equipos, prefill?.equipo_id)}
            className={inputCls}
          >
            <option value="" disabled>Seleccionar…</option>
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>{e.codigo} · {e.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Encargado de Mantención <span className="text-[#c6352e]">*</span></span>
          <select
            name="responsable_id"
            required
            defaultValue={opcionValida(responsables, prefill?.responsable_id)}
            className={inputCls}
          >
            <option value="" disabled>Seleccionar…</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Gerente de Operaciones</span>
          <select name="gerente_id" defaultValue="" className={inputCls}>
            <option value="">—</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Fecha <span className="text-[#c6352e]">*</span></span>
          <input name="fecha" type="date" required defaultValue={prefill?.fecha ?? new Date().toISOString().slice(0, 10)} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Ciudad</span>
          <input name="ciudad" type="text" defaultValue="Calama" className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Horómetro</span>
          <input name="horometro" type="number" min="0" step="any" defaultValue={prefill?.horometro ?? undefined} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Odómetro</span>
          <input name="odometro" type="number" min="0" step="any" defaultValue={prefill?.odometro ?? undefined} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Próxima mantención</span>
          <input name="proxima_mantencion" type="number" min="0" step="any" defaultValue={prefill?.proxima_mantencion ?? undefined} className={inputCls} />
        </label>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        El tipo de equipo, marca y patente se toman del equipo al emitir. Las firmas
        se incorporarán en la generación del documento.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#253158] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2540] disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Emitir certificado"}
        </button>
        <Link
          href="/mantencion/certificado-mantencion"
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
