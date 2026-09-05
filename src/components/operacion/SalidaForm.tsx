"use client";

// Formulario del paso "Registrar salida" del Registro de Ingreso/Salida de
// Equipos. Deliberadamente corto: solo pide lo que se conoce al momento en
// que el equipo SALE del taller (el ingreso ya se guardó antes, en otro
// paso). Modelado sobre ParteForm.tsx pero sin sus campos de ingreso ni el
// borrador offline (fuera de alcance v1, ver CLAUDE.md).

import { useState, useTransition } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import {
  registrarSalida,
  type SalidaInput,
} from "@/app/(operativo)/mantencion/ordenes-trabajo/actions";
import {
  REGISTRO_COMPONENTES,
  REGISTRO_COMPONENTE_KEYS,
  type ComponenteKey,
  type ComponentesData,
  type ValorComponente,
} from "@/lib/terreno/registro-componentes";
import type { ParteDetalle } from "@/lib/terreno/queries";
import { inputCls, labelCls, valorBtnCls } from "@/lib/terreno/form-styles";
import { fmtNum, toUTCDateInput } from "@/lib/terreno/format";

const VALORES: ValorComponente[] = ["SI", "NO", "NA"];

// Solo se completa `salida`/`obs_s`; `ingreso`/`obs_i` viajan igual (la action
// los ignora y hace el merge server-side), pero se conservan en el estado
// para poder mostrar la referencia de ingreso al lado de cada componente.
function initComponentes(parte: ParteDetalle): ComponentesData {
  const base: ComponentesData = {};
  for (const k of REGISTRO_COMPONENTE_KEYS) {
    const saved = parte.componentes?.[k];
    base[k] = {
      ingreso: saved?.ingreso ?? null,
      salida: saved?.salida ?? "SI",
      obs_i: saved?.obs_i ?? null,
      obs_s: saved?.obs_s ?? null,
    };
  }
  return base;
}

export default function SalidaForm({
  registroId,
  parte,
}: {
  registroId: string;
  parte: ParteDetalle;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [comp, setComp] = useState<ComponentesData>(() => initComponentes(parte));

  function setValor(key: ComponenteKey, valor: ValorComponente) {
    setComp((prev) => ({ ...prev, [key]: { ...prev[key], salida: valor } }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "");
    const input: SalidaInput = {
      fecha_salida: g("fecha_salida"),
      nombre_receptor: g("nombre_receptor"),
      rut_receptor: g("rut_receptor"),
      horometro_fin: g("horometro_fin"),
      km_fin: g("km_fin"),
      observaciones_salida: g("observaciones_salida"),
      componentes: comp,
    };
    startTransition(async () => {
      try {
        const res = await registrarSalida(registroId, input);
        if (res?.error) setError(res.error);
      } catch (e) {
        unstable_rethrow(e); // NEXT_REDIRECT (éxito) sigue su curso
        setError("No se pudo enviar. Revisa tu conexión e intenta nuevamente.");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#c6352e]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelCls}>
            Fecha de salida <span className="text-[#c6352e]">*</span>
          </span>
          <input
            name="fecha_salida"
            type="date"
            required
            defaultValue={
              toUTCDateInput(parte.fecha_salida) ?? new Date().toISOString().slice(0, 10)
            }
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Nombre receptor</span>
          <input
            name="nombre_receptor"
            type="text"
            defaultValue={parte.nombre_receptor ?? parte.nombre_responsable ?? undefined}
            className={inputCls}
          />
          {!parte.nombre_receptor && parte.nombre_responsable && (
            <span className="mt-1 block text-xs text-gray-500">
              Copiado del responsable de ingreso. Cámbialo si recibe otra persona.
            </span>
          )}
        </label>
        <label className="block">
          <span className={labelCls}>RUT receptor</span>
          <input
            name="rut_receptor"
            type="text"
            defaultValue={parte.rut_receptor ?? parte.rut_responsable ?? undefined}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Horómetro salida</span>
          <input
            name="horometro_fin"
            type="number"
            min="0"
            step="any"
            defaultValue={
              parte.horometro_fin != null
                ? String(parte.horometro_fin)
                : parte.horometro != null
                  ? String(parte.horometro)
                  : undefined
            }
            className={inputCls}
          />
          <span className="mt-1 block text-xs text-gray-500">
            Ingreso: {parte.horometro != null ? `${fmtNum(parte.horometro)} h` : "sin dato"}
            {parte.horometro_fin == null && parte.horometro != null
              ? " — corrígelo si el equipo acumuló horas"
              : ""}
          </span>
        </label>
        <label className="block">
          <span className={labelCls}>Odómetro salida</span>
          <input
            name="km_fin"
            type="number"
            min="0"
            step="any"
            defaultValue={
              parte.km_fin != null
                ? String(parte.km_fin)
                : parte.odometro != null
                  ? String(parte.odometro)
                  : undefined
            }
            className={inputCls}
          />
          <span className="mt-1 block text-xs text-gray-500">
            Ingreso: {parte.odometro != null ? `${fmtNum(parte.odometro)} km` : "sin dato"}
            {parte.km_fin == null && parte.odometro != null
              ? " — corrígelo si el equipo acumuló kilómetros"
              : ""}
          </span>
        </label>
      </div>

      <div>
        <p className={labelCls}>Componentes (salida)</p>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="hidden grid-cols-[1fr_auto_auto] gap-2 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-500 sm:grid">
            <span>Componente</span>
            <span className="text-center">Ingreso</span>
            <span className="text-center">Salida</span>
          </div>
          <div className="divide-y divide-gray-100">
            {REGISTRO_COMPONENTES.map((item) => {
              const c = comp[item.key]!;
              return (
                <div
                  key={item.key}
                  className="grid grid-cols-1 gap-2 px-4 py-2.5 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <span className="text-sm text-[#253158]">{item.label}</span>
                  <span className="text-xs text-gray-400 sm:text-center">
                    <span className="sm:hidden">Ingreso: </span>
                    {c.ingreso ?? "—"}
                  </span>
                  <div className="flex gap-1 sm:justify-center">
                    <span className="mr-1 text-xs text-gray-400 sm:hidden">Sal:</span>
                    {VALORES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setValor(item.key, v)}
                        className={valorBtnCls(c.salida === v, v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <label className="block">
        <span className={labelCls}>Observaciones de salida</span>
        <textarea
          name="observaciones_salida"
          rows={3}
          defaultValue={parte.descripcion_trabajo ?? undefined}
          className={inputCls}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#253158] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2540] disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Registrar salida"}
        </button>
        <Link
          href={`/mantencion/ordenes-trabajo/${registroId}`}
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
