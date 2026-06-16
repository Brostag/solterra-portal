"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createChecklistMantencion,
  type ChecklistMantInput,
} from "@/app/(operativo)/mantencion/checklist-mantencion/actions";
import {
  SECCION_A,
  SECCION_B,
  TIPO_MANTENCION_OPCIONES,
  type ItemMant,
  type ItemValor,
  type ValorItem,
} from "@/lib/terreno/checklist-mantencion-items";
import type { EquipoOption, ResponsableOption } from "@/lib/terreno/queries";

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#253158] placeholder:text-gray-400 focus:border-[#253158] focus:outline-none focus:ring-2 focus:ring-[#253158]/15";
const labelCls = "mb-1.5 block text-sm font-semibold text-gray-700";
const VALORES: ValorItem[] = ["SI", "NO", "NA"];

function initSeccion(items: ItemMant[]): Record<string, ItemValor> {
  return items.reduce(
    (acc, i) => ({ ...acc, [i.codigo]: { valor: null, obs: null } }),
    {} as Record<string, ItemValor>,
  );
}

function valorBtn(activo: boolean, v: ValorItem) {
  const base = "rounded px-2 py-1 text-xs font-semibold transition ";
  if (!activo) return base + "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50";
  if (v === "SI") return base + "bg-green-600 text-white";
  if (v === "NO") return base + "bg-[#c6352e] text-white";
  return base + "bg-gray-400 text-white";
}

function Seccion({
  titulo,
  items,
  valores,
  onSet,
}: {
  titulo: string;
  items: ItemMant[];
  valores: Record<string, ItemValor>;
  onSet: (codigo: string, valor: ValorItem) => void;
}) {
  return (
    <div>
      <p className="mb-2 rounded-md bg-[#253158] px-3 py-2 text-sm font-semibold text-white">
        {titulo}
      </p>
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {items.map((item) => (
          <div
            key={item.codigo}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            <span className="text-sm text-[#253158]">
              <span className="mr-2 font-mono text-xs text-gray-400">{item.codigo}</span>
              {item.label}
            </span>
            <div className="flex flex-shrink-0 gap-1">
              {VALORES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onSet(item.codigo, v)}
                  className={valorBtn(valores[item.codigo]?.valor === v, v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChecklistMantForm({
  equipos,
  responsables,
}: {
  equipos: EquipoOption[];
  responsables: ResponsableOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [secA, setSecA] = useState<Record<string, ItemValor>>(() => initSeccion(SECCION_A));
  const [secB, setSecB] = useState<Record<string, ItemValor>>(() => initSeccion(SECCION_B));
  const [correctivas, setCorrectivas] = useState<string[]>([]);
  const [nuevaCorrectiva, setNuevaCorrectiva] = useState("");

  const setA = (codigo: string, valor: ValorItem) =>
    setSecA((p) => ({ ...p, [codigo]: { ...p[codigo], valor } }));
  const setB = (codigo: string, valor: ValorItem) =>
    setSecB((p) => ({ ...p, [codigo]: { ...p[codigo], valor } }));

  function agregarCorrectiva() {
    const t = nuevaCorrectiva.trim();
    if (!t) return;
    setCorrectivas((p) => [...p, t]);
    setNuevaCorrectiva("");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "");
    const input: ChecklistMantInput = {
      equipo_id: g("equipo_id"),
      responsable_id: g("responsable_id"),
      fecha: g("fecha"),
      tipo_mantencion: g("tipo_mantencion"),
      km: g("km"),
      horometro: g("horometro"),
      proxima_mantencion: g("proxima_mantencion"),
      observaciones_generales: g("observaciones_generales"),
      items: { seccion_a: secA, seccion_b: secB, seccion_c: correctivas },
    };
    startTransition(async () => {
      const res = await createChecklistMantencion(input);
      if (res?.error) setError(res.error);
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block sm:col-span-2">
          <span className={labelCls}>Equipo <span className="text-[#c6352e]">*</span></span>
          <select name="equipo_id" required defaultValue="" className={inputCls}>
            <option value="" disabled>Seleccionar…</option>
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>{e.codigo} · {e.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Encargado <span className="text-[#c6352e]">*</span></span>
          <select name="responsable_id" required defaultValue="" className={inputCls}>
            <option value="" disabled>Seleccionar…</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Fecha <span className="text-[#c6352e]">*</span></span>
          <input name="fecha" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Tipo de mantención <span className="text-[#c6352e]">*</span></span>
          <select name="tipo_mantencion" defaultValue="A-B-C" className={inputCls}>
            {TIPO_MANTENCION_OPCIONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Próxima mantención</span>
          <input name="proxima_mantencion" type="number" min="0" step="any" className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Horómetro (HR)</span>
          <input name="horometro" type="number" min="0" step="any" className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Kilometraje (KM)</span>
          <input name="km" type="number" min="0" step="any" className={inputCls} />
        </label>
      </div>

      <Seccion titulo="1.0 Mantenimiento del Fabricante (A)" items={SECCION_A} valores={secA} onSet={setA} />
      <Seccion titulo="2.0 Mantenimiento Preventivo (B)" items={SECCION_B} valores={secB} onSet={setB} />

      {/* Sección C: correctivas */}
      <div>
        <p className="mb-2 rounded-md bg-[#253158] px-3 py-2 text-sm font-semibold text-white">
          Mantención Correctiva (C)
        </p>
        <div className="space-y-2">
          {correctivas.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#253158]">
              <span className="flex-1">{c}</span>
              <button
                type="button"
                onClick={() => setCorrectivas((p) => p.filter((_, j) => j !== i))}
                className="text-xs font-medium text-[#c6352e] hover:underline"
              >
                Quitar
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={nuevaCorrectiva}
              onChange={(e) => setNuevaCorrectiva(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarCorrectiva();
                }
              }}
              placeholder="Describe una reparación correctiva"
              className={inputCls}
            />
            <button
              type="button"
              onClick={agregarCorrectiva}
              className="whitespace-nowrap rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-[#253158] hover:bg-gray-50"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>

      <label className="block">
        <span className={labelCls}>Observaciones generales</span>
        <textarea name="observaciones_generales" rows={3} className={inputCls} />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#253158] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2540] disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Crear check list"}
        </button>
        <Link
          href="/mantencion/checklist-mantencion"
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
