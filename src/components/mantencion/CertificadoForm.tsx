"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createCertificado,
  updateCertificado,
} from "@/app/(operativo)/mantencion/certificados/actions";
import type { EquipoOption } from "@/lib/terreno/queries";

export type CertificadoFormValues = {
  id: string;
  equipo_id: string;
  tipo: string;
  numero: string | null;
  fecha_emision: string | null; // ISO date
  fecha_vencimiento: string; // ISO date
  empresa_emisora: string | null;
  observaciones: string | null;
};

const TIPOS = [
  "Revisión Técnica",
  "Seguro Obligatorio (SOAP)",
  "Permiso de Circulación",
  "Inspección de Grúa",
  "Certificado de Operador",
  "Certificación de Equipo",
  "Licencia Municipal",
  "Otro",
];

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#253158] placeholder:text-gray-400 focus:border-[#253158] focus:outline-none focus:ring-2 focus:ring-[#253158]/15";
const labelCls = "mb-1.5 block text-sm font-semibold text-gray-700";

// ISO → "YYYY-MM-DD" para <input type="date">. Las fechas son @db.Date
// (medianoche UTC): usar getters UTC para no retroceder un día en Chile.
function toLocalDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export default function CertificadoForm({
  equipos,
  certificado,
}: {
  equipos: EquipoOption[];
  certificado?: CertificadoFormValues;
}) {
  const editar = Boolean(certificado);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = certificado
        ? await updateCertificado(certificado.id, fd)
        : await createCertificado(fd);
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
          <span className={labelCls}>
            Equipo <span className="text-[#c6352e]">*</span>
          </span>
          <select
            name="equipo_id"
            required
            defaultValue={certificado?.equipo_id ?? ""}
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
            Tipo de certificado <span className="text-[#c6352e]">*</span>
          </span>
          <select
            name="tipo"
            defaultValue={certificado?.tipo ?? "Revisión Técnica"}
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
          <span className={labelCls}>N° de documento</span>
          <input
            name="numero"
            type="text"
            placeholder="RT-2026-001"
            defaultValue={certificado?.numero ?? undefined}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className={labelCls}>Fecha de emisión</span>
          <input
            name="fecha_emision"
            type="date"
            defaultValue={toLocalDate(certificado?.fecha_emision)}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className={labelCls}>
            Fecha de vencimiento <span className="text-[#c6352e]">*</span>
          </span>
          <input
            name="fecha_vencimiento"
            type="date"
            required
            defaultValue={toLocalDate(certificado?.fecha_vencimiento)}
            className={inputCls}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelCls}>Empresa emisora</span>
          <input
            name="empresa_emisora"
            type="text"
            placeholder="PRT, Municipalidad, Mutual…"
            defaultValue={certificado?.empresa_emisora ?? undefined}
            className={inputCls}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelCls}>Observaciones</span>
          <textarea
            name="observaciones"
            rows={3}
            defaultValue={certificado?.observaciones ?? undefined}
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
          {pending ? "Guardando…" : editar ? "Guardar cambios" : "Crear certificado"}
        </button>
        <Link
          href={
            certificado
              ? `/mantencion/certificados/${certificado.id}`
              : "/mantencion/certificados"
          }
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
