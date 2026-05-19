"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import {
  calcularCotizacion,
  GASTOS_INICIALES,
  type GastosGenerales,
  type TipoCotizacion,
} from "@/lib/cotizador";
import {
  BedDouble,
  CalendarDays,
  Calculator,
  Clock,
  Fuel,
  HardHat,
  MapPin,
  Plus,
  RotateCcw,
  Shield,
  Truck,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";

interface Props {
  ivaPorcentaje: number;
}

interface GastoConfig {
  key:   keyof GastosGenerales;
  label: string;
  icon:  typeof Fuel;
}

const GASTOS_CONFIG: GastoConfig[] = [
  { key: "combustible", label: "Combustible", icon: Fuel },
  { key: "operador",    label: "Operador",    icon: HardHat },
  { key: "traslado",    label: "Traslado",    icon: Truck },
  { key: "peajes",      label: "Peajes",      icon: MapPin },
  { key: "viaticos",    label: "Viáticos",    icon: UtensilsCrossed },
  { key: "alojamiento", label: "Alojamiento", icon: BedDouble },
  { key: "mantencion",  label: "Mantención",  icon: Wrench },
  { key: "seguro",      label: "Seguro",      icon: Shield },
  { key: "otros",       label: "Otros",       icon: Plus },
];

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] tabular-nums disabled:bg-gray-50 disabled:text-gray-400";

export default function CotizadorForm({ ivaPorcentaje }: Props) {
  const [equipo, setEquipo]                           = useState("");
  const [valorHora, setValorHora]                     = useState(0);
  const [horasMinimasDiarias, setHorasMinimasDiarias] = useState(8);
  const [tipo, setTipo]                               = useState<TipoCotizacion>("horas");
  const [cantidadHoras, setCantidadHoras]             = useState(0);
  const [cantidadDias, setCantidadDias]               = useState(0);
  const [gastos, setGastos]                           = useState<GastosGenerales>(GASTOS_INICIALES);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);

  const resumenRef = useRef<HTMLDivElement>(null);

  const result = useMemo(
    () =>
      calcularCotizacion({
        tipo,
        valorHora,
        horasMinimasDiarias,
        cantidadHoras,
        cantidadDias,
        gastos,
        porcentajeDescuento,
        ivaPorcentaje,
      }),
    [tipo, valorHora, horasMinimasDiarias, cantidadHoras, cantidadDias, gastos, porcentajeDescuento, ivaPorcentaje]
  );

  function updateGasto(key: keyof GastosGenerales, value: number) {
    setGastos((prev) => ({ ...prev, [key]: value }));
  }

  function limpiar() {
    setEquipo("");
    setValorHora(0);
    setHorasMinimasDiarias(8);
    setTipo("horas");
    setCantidadHoras(0);
    setCantidadDias(0);
    setGastos(GASTOS_INICIALES);
    setPorcentajeDescuento(0);
  }

  function calcular() {
    resumenRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    resumenRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
      {/* ── Columna izquierda: formulario ─────────────────────────── */}
      <div className="space-y-6">
        {/* Datos del arriendo */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#253158] uppercase tracking-wider">
            Datos del arriendo
          </h2>

          <div>
            <label htmlFor="equipo" className="block text-xs font-medium text-gray-700 mb-1.5">
              Equipo o servicio
            </label>
            <input
              id="equipo"
              type="text"
              value={equipo}
              onChange={(e) => setEquipo(e.target.value)}
              placeholder="Ej: Retroexcavadora CAT 320D"
              className={inputClass}
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="valorHora" className="block text-xs font-medium text-gray-700 mb-1.5">
                Valor hora (CLP)
              </label>
              <input
                id="valorHora"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={valorHora || ""}
                onChange={(e) => setValorHora(Number(e.target.value) || 0)}
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="horasMinimas" className="block text-xs font-medium text-gray-700 mb-1.5">
                Horas mínimas diarias
              </label>
              <input
                id="horasMinimas"
                type="number"
                inputMode="numeric"
                min={1}
                max={24}
                step={1}
                value={horasMinimasDiarias}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setHorasMinimasDiarias(Math.max(1, Math.min(24, Number.isFinite(n) ? n : 1)));
                }}
                disabled={tipo === "horas"}
                className={inputClass}
                aria-describedby={tipo === "horas" ? "horas-min-help" : undefined}
              />
              {tipo === "horas" && (
                <p id="horas-min-help" className="mt-1 text-[11px] text-gray-400">
                  Solo aplica cuando cotizas por días.
                </p>
              )}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-gray-700 mb-2">
              Tipo de cotización
            </span>
            <div className="flex gap-2 flex-wrap" role="group" aria-label="Tipo de cotización">
              <button
                type="button"
                onClick={() => setTipo("horas")}
                aria-pressed={tipo === "horas"}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  tipo === "horas"
                    ? "bg-[#253158] text-white border-[#253158]"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Clock className="h-4 w-4" />
                Por horas
              </button>
              <button
                type="button"
                onClick={() => setTipo("dias")}
                aria-pressed={tipo === "dias"}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  tipo === "dias"
                    ? "bg-[#253158] text-white border-[#253158]"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                Por días
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cantidad" className="block text-xs font-medium text-gray-700 mb-1.5">
                {tipo === "horas" ? "Cantidad de horas" : "Cantidad de días"}
              </label>
              <input
                id="cantidad"
                type="number"
                inputMode="decimal"
                min={0}
                step={tipo === "horas" ? 0.5 : 1}
                value={tipo === "horas" ? (cantidadHoras || "") : (cantidadDias || "")}
                onChange={(e) => {
                  const n = Math.max(0, Number(e.target.value) || 0);
                  if (tipo === "horas") setCantidadHoras(n);
                  else setCantidadDias(n);
                }}
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="descuento" className="block text-xs font-medium text-gray-700 mb-1.5">
                Descuento (%)
              </label>
              <input
                id="descuento"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                value={porcentajeDescuento || ""}
                onChange={(e) => {
                  const n = Number(e.target.value) || 0;
                  setPorcentajeDescuento(Math.max(0, Math.min(100, n)));
                }}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Gastos generales */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#253158] uppercase tracking-wider">
            Gastos generales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {GASTOS_CONFIG.map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <label htmlFor={`gasto-${key}`} className="block text-xs font-medium text-gray-700 mb-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-gray-400" />
                    {label}
                  </span>
                </label>
                <input
                  id={`gasto-${key}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={gastos[key] || ""}
                  onChange={(e) => updateGasto(key, Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Columna derecha: resumen sticky ───────────────────────── */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div
          ref={resumenRef}
          tabIndex={-1}
          className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 focus:outline-none focus:ring-2 focus:ring-[#253158]/20"
          aria-live="polite"
          aria-atomic="true"
        >
          <h2 className="text-xs font-semibold text-[#253158] uppercase tracking-wider">
            Resumen
          </h2>

          {equipo.trim() && (
            <p className="text-sm font-medium text-gray-800 truncate" title={equipo}>
              {equipo}
            </p>
          )}

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Subtotal equipo</dt>
              <dd className="font-semibold text-gray-800 tabular-nums">
                {formatCurrency(result.subtotalEquipo, "CLP")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Gastos generales</dt>
              <dd className="font-semibold text-gray-800 tabular-nums">
                {formatCurrency(result.gastosGeneralesTotal, "CLP")}
              </dd>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between">
              <dt className="text-gray-600 font-medium">Subtotal</dt>
              <dd className="font-semibold text-gray-800 tabular-nums">
                {formatCurrency(result.subtotal, "CLP")}
              </dd>
            </div>

            {porcentajeDescuento > 0 && (
              <div className="flex justify-between text-[#c6352e]">
                <dt>Descuento ({porcentajeDescuento}%)</dt>
                <dd className="font-semibold tabular-nums">
                  − {formatCurrency(result.descuentoMonto, "CLP")}
                </dd>
              </div>
            )}

            <div className="flex justify-between">
              <dt className="text-gray-500">Neto</dt>
              <dd className="font-semibold text-gray-800 tabular-nums">
                {formatCurrency(result.neto, "CLP")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">IVA {ivaPorcentaje}%</dt>
              <dd className="font-semibold text-gray-800 tabular-nums">
                {formatCurrency(result.iva, "CLP")}
              </dd>
            </div>

            <div className="border-t-2 border-[#253158] pt-3 flex justify-between items-baseline">
              <dt className="text-sm font-bold text-[#253158]">TOTAL</dt>
              <dd className="text-xl font-bold text-[#253158] tabular-nums">
                {formatCurrency(result.total, "CLP")}
              </dd>
            </div>
          </dl>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={limpiar}
              variant="ghost"
              className="flex-1 gap-2 text-gray-600 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              Limpiar
            </Button>
            <Button
              type="button"
              onClick={calcular}
              className="flex-1 gap-2 bg-[#253158] hover:bg-[#1e305e] text-white"
            >
              <Calculator className="h-4 w-4" />
              Calcular
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
