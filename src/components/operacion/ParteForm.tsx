"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createParte,
  updateParte,
  type RegistroInput,
} from "@/app/(operativo)/operacion/partes-diarios/actions";
import {
  REGISTRO_COMPONENTES,
  REGISTRO_COMPONENTE_KEYS,
  COMBUSTIBLE_OPCIONES,
  TIPO_MANTENCION_OPCIONES,
  type ComponenteKey,
  type ComponentesData,
  type ValorComponente,
} from "@/lib/terreno/registro-componentes";
import type { EquipoOption, ResponsableOption, ParteDetalle } from "@/lib/terreno/queries";

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#253158] placeholder:text-gray-400 focus:border-[#253158] focus:outline-none focus:ring-2 focus:ring-[#253158]/15";
const labelCls = "mb-1.5 block text-sm font-semibold text-gray-700";
const VALORES: ValorComponente[] = ["SI", "NO", "NA"];

function toUTCDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function initComponentes(parte?: ParteDetalle): ComponentesData {
  const base: ComponentesData = {};
  for (const k of REGISTRO_COMPONENTE_KEYS) {
    const saved = parte?.componentes?.[k];
    base[k] = {
      ingreso: saved?.ingreso ?? "SI",
      salida: saved?.salida ?? "SI",
      obs_i: saved?.obs_i ?? null,
      obs_s: saved?.obs_s ?? null,
    };
  }
  return base;
}

export default function ParteForm({
  equipos,
  operadores,
  parte,
}: {
  equipos: EquipoOption[];
  operadores: ResponsableOption[];
  parte?: ParteDetalle;
}) {
  const editar = Boolean(parte);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [comp, setComp] = useState<ComponentesData>(() => initComponentes(parte));

  function setValor(
    key: ComponenteKey,
    campo: "ingreso" | "salida",
    valor: ValorComponente,
  ) {
    setComp((prev) => ({ ...prev, [key]: { ...prev[key], [campo]: valor } }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "");
    const input: RegistroInput = {
      equipo_id: g("equipo_id"),
      operador_id: g("operador_id"),
      fecha: g("fecha"),
      fecha_salida: g("fecha_salida"),
      estado: g("estado"),
      area_uso: g("area_uso"),
      centro_costo: g("centro_costo"),
      tipo_mantencion: g("tipo_mantencion"),
      combustible_fraccion: g("combustible_fraccion"),
      nombre_responsable: g("nombre_responsable"),
      rut_responsable: g("rut_responsable"),
      nombre_receptor: g("nombre_receptor"),
      rut_receptor: g("rut_receptor"),
      horometro: g("horometro"),
      odometro: g("odometro"),
      observaciones: g("observaciones"),
      componentes: comp,
    };
    startTransition(async () => {
      const res = parte ? await updateParte(parte.id, input) : await createParte(input);
      if (res?.error) setError(res.error);
    });
  }

  const valorBtn = (activo: boolean, v: ValorComponente) => {
    const base = "rounded px-2 py-1 text-xs font-semibold transition ";
    if (!activo) return base + "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50";
    if (v === "SI") return base + "bg-green-600 text-white";
    if (v === "NO") return base + "bg-[#c6352e] text-white";
    return base + "bg-gray-400 text-white";
  };

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

      {/* Cabecera */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Equipo <span className="text-[#c6352e]">*</span></span>
          <select name="equipo_id" required defaultValue={parte?.equipo_id ?? ""} className={inputCls}>
            <option value="" disabled>Seleccionar…</option>
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>{e.codigo} · {e.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Responsable <span className="text-[#c6352e]">*</span></span>
          <select name="operador_id" required defaultValue={parte?.operador_id ?? ""} className={inputCls}>
            <option value="" disabled>Seleccionar…</option>
            {operadores.map((o) => (
              <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Fecha ingreso <span className="text-[#c6352e]">*</span></span>
          <input name="fecha" type="date" required defaultValue={toUTCDate(parte?.fecha) ?? new Date().toISOString().slice(0, 10)} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Fecha salida</span>
          <input name="fecha_salida" type="date" defaultValue={toUTCDate(parte?.fecha_salida)} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Área de uso</span>
          <input name="area_uso" type="text" placeholder="El Abra" defaultValue={parte?.area_uso ?? undefined} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Centro de costo</span>
          <input name="centro_costo" type="text" placeholder="Sitio 2" defaultValue={parte?.centro_costo ?? undefined} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Tipo de mantención</span>
          <select name="tipo_mantencion" defaultValue={parte?.tipo_mantencion ?? ""} className={inputCls}>
            <option value="">—</option>
            {TIPO_MANTENCION_OPCIONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Combustible</span>
          <select name="combustible_fraccion" defaultValue={parte?.combustible_fraccion ?? ""} className={inputCls}>
            <option value="">—</option>
            {COMBUSTIBLE_OPCIONES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Horómetro</span>
          <input name="horometro" type="number" min="0" step="any" defaultValue={parte?.horometro ?? undefined} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Odómetro</span>
          <input name="odometro" type="number" min="0" step="any" defaultValue={parte?.odometro ?? undefined} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Nombre responsable (ingreso)</span>
          <input name="nombre_responsable" type="text" defaultValue={parte?.nombre_responsable ?? undefined} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>RUT responsable</span>
          <input name="rut_responsable" type="text" defaultValue={parte?.rut_responsable ?? undefined} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Nombre receptor (salida)</span>
          <input name="nombre_receptor" type="text" defaultValue={parte?.nombre_receptor ?? undefined} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>RUT receptor</span>
          <input name="rut_receptor" type="text" defaultValue={parte?.rut_receptor ?? undefined} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Estado</span>
          <select name="estado" defaultValue={parte?.estado ?? "Pendiente"} className={inputCls}>
            {["Pendiente", "Aprobado", "Rechazado"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {/* Componentes ingreso/salida */}
      <div>
        <p className={labelCls}>Componentes (ingreso / salida)</p>
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
                  <div className="flex gap-1 sm:justify-center">
                    <span className="mr-1 text-xs text-gray-400 sm:hidden">Ingr:</span>
                    {VALORES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setValor(item.key, "ingreso", v)}
                        className={valorBtn(c.ingreso === v, v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 sm:justify-center">
                    <span className="mr-1 text-xs text-gray-400 sm:hidden">Sal:</span>
                    {VALORES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setValor(item.key, "salida", v)}
                        className={valorBtn(c.salida === v, v)}
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
        <span className={labelCls}>Observaciones generales</span>
        <textarea name="observaciones" rows={3} defaultValue={parte?.observaciones ?? undefined} className={inputCls} />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#253158] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2540] disabled:opacity-60"
        >
          {pending ? "Guardando…" : editar ? "Guardar cambios" : "Crear registro"}
        </button>
        <Link
          href={parte ? `/operacion/partes-diarios/${parte.id}` : "/operacion/partes-diarios"}
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
