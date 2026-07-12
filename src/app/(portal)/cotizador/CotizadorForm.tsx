"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import {
  calcularCotizacion,
  GASTOS_INICIALES,
  nuevoItem,
  type CotizadorItem,
  type CotizadorItemResult,
  type GastosGenerales,
  type TipoCotizacion,
} from "@/lib/cotizador";
import {
  BedDouble,
  CalendarDays,
  Clock,
  FileCheck,
  Fuel,
  HardHat,
  Loader2,
  MapPin,
  Plus,
  PlusCircle,
  Printer,
  RotateCcw,
  Shield,
  Trash2,
  Truck,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import PdfShareActions from "@/components/portal/PdfShareActions";
import { useRouter } from "next/navigation";
import { createQuotation } from "@/app/(portal)/cotizaciones/actions";

interface ClienteOption {
  id:     string;
  nombre: string;
  rut:    string | null;
}

interface Props {
  ivaPorcentaje:   number;
  clientes:        ClienteOption[];
  numeroSugerido:  string;
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

type ActionId = "pdf" | "print" | "whatsapp" | "mail" | "generar";

interface MoneyInputProps {
  id:          string;
  value:       number;
  onChange:    (n: number) => void;
  placeholder?: string;
  className?:  string;
}

/**
 * Input de moneda CLP: mientras está enfocado muestra el número crudo para
 * digitar cómodo; al perder foco muestra el valor formateado ($43.000). El
 * estado externo sigue siendo un `number` — CLP es entero, sin decimales.
 */
function MoneyInput({ id, value, onChange, placeholder, className }: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const display = focused
    ? (value || "")
    : (value ? formatCurrency(value, "CLP") : "");
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={display}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const n = Number(e.target.value.replace(/\D/g, ""));
        onChange(Math.max(0, Number.isFinite(n) ? n : 0));
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

/**
 * Días entre dos fechas ISO (YYYY-MM-DD), ambos extremos inclusive.
 * Usa Date.UTC para evitar el off-by-one por DST/UTC (nunca `new Date("YYYY-MM-DD")`).
 * Devuelve null si alguna fecha no parsea o el rango es inválido (< 1 día).
 */
function diasEntre(desde: string, hasta: string): number | null {
  const re = /^(\d{4})-(\d{2})-(\d{2})$/;
  const md = re.exec(desde);
  const mh = re.exec(hasta);
  if (!md || !mh) return null;
  const utcDesde = Date.UTC(Number(md[1]), Number(md[2]) - 1, Number(md[3]));
  const utcHasta = Date.UTC(Number(mh[1]), Number(mh[2]) - 1, Number(mh[3]));
  const dias = (utcHasta - utcDesde) / 86_400_000 + 1;
  return dias < 1 ? null : dias;
}

export default function CotizadorForm({ ivaPorcentaje, clientes, numeroSugerido }: Props) {
  const [items, setItems]                             = useState<CotizadorItem[]>(() => [nuevoItem()]);
  // Fechas por ítem: SEPARADO de items para no contaminar el payload (items solo lleva números).
  const [fechasPorItem, setFechasPorItem]             = useState<Record<string, { desde: string; hasta: string }>>({});
  const [gastos, setGastos]                           = useState<GastosGenerales>(GASTOS_INICIALES);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);
  const [clienteId, setClienteId]                     = useState("");
  const [busyAction, setBusyAction]                   = useState<ActionId | null>(null);
  const [actionError, setActionError]                 = useState<string | null>(null);
  const [numero, setNumero]                           = useState(numeroSugerido);
  const router = useRouter();

  const clienteSel = clientes.find((c) => c.id === clienteId) ?? null;

  const resumenRef = useRef<HTMLDivElement>(null);

  const result = useMemo(
    () =>
      calcularCotizacion({
        items,
        gastos,
        porcentajeDescuento,
        ivaPorcentaje,
      }),
    [items, gastos, porcentajeDescuento, ivaPorcentaje]
  );

  const itemResultById = useMemo<Map<string, CotizadorItemResult>>(() => {
    const m = new Map<string, CotizadorItemResult>();
    for (const it of result.items) m.set(it.id, it);
    return m;
  }, [result.items]);

  function addItem() {
    setItems((prev) => [...prev, nuevoItem()]);
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
    setFechasPorItem((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
  }

  function updateItem(id: string, patch: Partial<CotizadorItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function updateGasto(key: keyof GastosGenerales, value: number) {
    setGastos((prev) => ({ ...prev, [key]: value }));
  }

  function limpiar() {
    setItems([nuevoItem()]);
    setFechasPorItem({});
    setGastos(GASTOS_INICIALES);
    setPorcentajeDescuento(0);
    setClienteId("");
    setActionError(null);
  }

  // Actualiza el rango de fechas del ítem y, si es válido, fija cantidadDias por
  // defecto. El cálculo va FUERA del updater de setState (updaters puros).
  function updateFecha(id: string, patch: { desde?: string; hasta?: string }) {
    const actual = fechasPorItem[id] ?? { desde: "", hasta: "" };
    const next = { ...actual, ...patch };
    setFechasPorItem((prev) => ({ ...prev, [id]: next }));
    const n = diasEntre(next.desde, next.hasta);
    if (n !== null) updateItem(id, { cantidadDias: n });
  }

  function buildRequestBody() {
    return { items, gastos, porcentajeDescuento, ivaPorcentaje, clienteId: clienteId || null };
  }

  function buildSummaryText(): string {
    const lineas = result.items.map((it) => {
      const cantUnit = it.tipo === "horas" ? "h" : "d";
      return `• ${it.equipo} (${it.cantidad}${cantUnit}): ${formatCurrency(it.subtotal, "CLP")}`;
    });
    const saludo = clienteSel
      ? `Hola, envío presupuesto referencial de arriendo Solterra para ${clienteSel.nombre}:`
      : "Hola, envío presupuesto referencial de arriendo Solterra:";
    return [
      saludo,
      "",
      "Equipos:",
      ...lineas,
      "",
      `Total: ${formatCurrency(result.total, "CLP")}`,
      "",
      "Documento referencial, no válido como factura.",
    ].join("\n");
  }

  async function fetchPdfBlob(): Promise<Blob> {
    const res = await fetch("/api/cotizador/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequestBody()),
    });
    if (!res.ok) {
      const data: unknown = await res.json().catch(() => ({}));
      const msg =
        typeof data === "object" && data !== null && "error" in data && typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : `Error ${res.status}`;
      throw new Error(msg);
    }
    return res.blob();
  }

  async function imprimir() {
    setBusyAction("print");
    setActionError(null);
    try {
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) {
        throw new Error("El navegador bloqueó la nueva pestaña. Permití pop-ups y reintentá.");
      }
      // Revocamos después de que el navegador renderice el PDF.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al abrir PDF para imprimir");
    } finally {
      setBusyAction(null);
    }
  }

  async function generar() {
    setActionError(null);
    const hayDatos = items.some((it) => it.equipo.trim() !== "" || it.valorHora > 0);
    if (!hayDatos) {
      setActionError("Agrega al menos un equipo o servicio con datos.");
      return;
    }
    if (!numero.trim()) {
      setActionError("Ingresa el número de cotización.");
      return;
    }
    setBusyAction("generar");
    try {
      const { id } = await createQuotation({
        numero: numero.trim(),
        clienteId: clienteId || null,
        items,
        gastos,
        porcentajeDescuento,
        ivaPorcentaje,
      });
      router.push(`/cotizaciones/${id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo generar la cotización.");
      setBusyAction(null);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
      {/* ── Columna izquierda: formulario ─────────────────────────── */}
      <div className="space-y-6">
        {/* Cliente */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-xs font-semibold text-[#253158] uppercase tracking-wider">
            Cliente
          </h2>
          <div className="max-w-md">
            <label htmlFor="cliente" className="block text-xs font-medium text-gray-700 mb-1.5">
              Cliente del presupuesto
            </label>
            <select
              id="cliente"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className={inputClass}
            >
              <option value="">Sin cliente seleccionado</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rut ? `${c.nombre} — ${c.rut}` : c.nombre}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Opcional. Si no seleccionás un cliente, el presupuesto se genera igual.
            </p>
          </div>
          <div className="max-w-md">
            <label htmlFor="numero" className="block text-xs font-medium text-gray-700 mb-1.5">
              N° de cotización
            </label>
            <input
              id="numero"
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="001 R0/026"
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              Editable. Formato Solterra: NNN R0/AA (ej. 177 R2/025).
            </p>
          </div>
        </section>

        {/* Equipos */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#253158] uppercase tracking-wider">
              Equipos y servicios
            </h2>
            <span className="text-[11px] text-gray-400">
              {items.length} {items.length === 1 ? "equipo" : "equipos"}
            </span>
          </div>

          <div className="space-y-4">
            {items.map((it, idx) => {
              const itResult = itemResultById.get(it.id);
              const rango = fechasPorItem[it.id] ?? { desde: "", hasta: "" };
              const diasRango = diasEntre(rango.desde, rango.hasta);
              const rangoInvalido =
                rango.desde !== "" && rango.hasta !== "" && diasRango === null;
              return (
                <div
                  key={it.id}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-[#253158]">
                      Equipo #{idx + 1}
                    </h3>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        aria-label={`Eliminar equipo ${idx + 1}`}
                        className="text-gray-400 hover:text-[#c6352e] p-1.5 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor={`equipo-${it.id}`}
                      className="block text-xs font-medium text-gray-700 mb-1.5"
                    >
                      Equipo o servicio
                    </label>
                    <input
                      id={`equipo-${it.id}`}
                      type="text"
                      value={it.equipo}
                      onChange={(e) => updateItem(it.id, { equipo: e.target.value })}
                      placeholder="Ej: Retroexcavadora CAT 320D"
                      className={inputClass}
                      autoComplete="off"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor={`valorHora-${it.id}`}
                        className="block text-xs font-medium text-gray-700 mb-1.5"
                      >
                        Valor hora (CLP)
                      </label>
                      <MoneyInput
                        id={`valorHora-${it.id}`}
                        value={it.valorHora}
                        onChange={(n) => updateItem(it.id, { valorHora: n })}
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`horasMin-${it.id}`}
                        className="block text-xs font-medium text-gray-700 mb-1.5"
                      >
                        Horas mínimas diarias
                      </label>
                      <input
                        id={`horasMin-${it.id}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={24}
                        step={1}
                        value={it.horasMinimasDiarias || ""}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          updateItem(it.id, {
                            horasMinimasDiarias: Math.max(0, Math.min(24, Number.isFinite(n) ? n : 0)),
                          });
                        }}
                        placeholder="Ej: 8"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-gray-700 mb-2">
                      Tipo de cotización
                    </span>
                    <div className="flex gap-2 flex-wrap" role="group" aria-label="Tipo de cotización">
                      <button
                        type="button"
                        onClick={() => updateItem(it.id, { tipo: "horas" as TipoCotizacion })}
                        aria-pressed={it.tipo === "horas"}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                          it.tipo === "horas"
                            ? "bg-[#253158] text-white border-[#253158]"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <Clock className="h-4 w-4" />
                        Por horas
                      </button>
                      <button
                        type="button"
                        onClick={() => updateItem(it.id, { tipo: "dias" as TipoCotizacion })}
                        aria-pressed={it.tipo === "dias"}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                          it.tipo === "dias"
                            ? "bg-[#253158] text-white border-[#253158]"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <CalendarDays className="h-4 w-4" />
                        Por días
                      </button>
                    </div>
                  </div>

                  {it.tipo === "dias" && (
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor={`fecha-desde-${it.id}`}
                            className="block text-xs font-medium text-gray-700 mb-1.5"
                          >
                            Desde
                          </label>
                          <input
                            id={`fecha-desde-${it.id}`}
                            type="date"
                            value={rango.desde}
                            onChange={(e) => updateFecha(it.id, { desde: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`fecha-hasta-${it.id}`}
                            className="block text-xs font-medium text-gray-700 mb-1.5"
                          >
                            Hasta
                          </label>
                          <input
                            id={`fecha-hasta-${it.id}`}
                            type="date"
                            value={rango.hasta}
                            onChange={(e) => updateFecha(it.id, { hasta: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      {rangoInvalido && (
                        <p className="text-xs text-[#c6352e] mt-1.5">
                          La fecha hasta debe ser igual o posterior a la fecha desde.
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor={`cantidad-${it.id}`}
                      className="block text-xs font-medium text-gray-700 mb-1.5"
                    >
                      {it.tipo === "horas" ? "Cantidad de horas" : "Cantidad de días"}
                    </label>
                    <input
                      id={`cantidad-${it.id}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={it.tipo === "horas" ? 0.5 : 1}
                      value={it.tipo === "horas" ? (it.cantidadHoras || "") : (it.cantidadDias || "")}
                      onChange={(e) => {
                        const n = Math.max(0, Number(e.target.value) || 0);
                        if (it.tipo === "horas") updateItem(it.id, { cantidadHoras: n });
                        else updateItem(it.id, { cantidadDias: n });
                      }}
                      placeholder="0"
                      className={inputClass}
                    />
                    {it.tipo === "dias" && diasRango !== null && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        Según fechas: {diasRango} {diasRango === 1 ? "día" : "días"}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 text-xs text-gray-500 border-t border-gray-200">
                    <span className="pt-2">Subtotal:</span>
                    <span className="pt-2 font-semibold text-[#253158] tabular-nums">
                      {formatCurrency(itResult?.subtotal ?? 0, "CLP")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            onClick={addItem}
            variant="outline"
            className="w-full gap-2 border-dashed border-[#253158]/30 text-[#253158] hover:bg-[#253158]/5"
          >
            <PlusCircle className="h-4 w-4" />
            Agregar equipo
          </Button>
        </section>

        {/* Descuento global */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-xs font-semibold text-[#253158] uppercase tracking-wider">
            Descuento global
          </h2>
          <div className="max-w-xs">
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
        </section>

        {/* Gastos generales */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#253158] uppercase tracking-wider">
            Gastos generales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {GASTOS_CONFIG.map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <label
                  htmlFor={`gasto-${key}`}
                  className="block text-xs font-medium text-gray-700 mb-1.5"
                >
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

          <p className="text-xs text-gray-500">
            {items.length} {items.length === 1 ? "equipo" : "equipos"} cotizado{items.length === 1 ? "" : "s"}
          </p>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Subtotal equipos</dt>
              <dd className="font-semibold text-gray-800 tabular-nums">
                {formatCurrency(result.subtotalEquipos, "CLP")}
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

          <div className="pt-2 space-y-2">
            <Button
              type="button"
              onClick={generar}
              disabled={busyAction !== null}
              className="w-full gap-2 bg-[#253158] hover:bg-[#1e305e] text-white disabled:opacity-60"
              aria-busy={busyAction === "generar"}
            >
              {busyAction === "generar"
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <FileCheck className="h-4 w-4" />}
              Generar cotización
            </Button>

            <div className="pt-3 mt-1 border-t border-gray-100 space-y-2">
              <p className="text-[11px] text-gray-400 text-center">Vista previa (no guarda la cotización)</p>
              <PdfShareActions
                pdfUrl=""
                getPdfBlob={fetchPdfBlob}
                fileName={`presupuesto-arriendo-solterra-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.pdf`}
                title={`Cotización Solterra ${new Date().toLocaleDateString("es-CL")}`}
                whatsappMessage={buildSummaryText()}
                emailSubject={`Cotización Solterra ${new Date().toLocaleDateString("es-CL")}`}
                emailBody={buildSummaryText()}
                compact
              />
              <Button
                type="button"
                onClick={imprimir}
                disabled={busyAction !== null}
                variant="outline"
                className="w-full gap-2 border-[#253158]/30 text-[#253158] hover:bg-[#253158]/5 disabled:opacity-60"
                aria-busy={busyAction === "print"}
              >
                {busyAction === "print"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Printer className="h-4 w-4" />}
                Imprimir
              </Button>
            </div>

            <Button
              type="button"
              onClick={limpiar}
              variant="ghost"
              className="w-full gap-2 text-gray-600 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              Limpiar
            </Button>
          </div>

          {actionError && (
            <p role="alert" className="text-xs text-[#c6352e] text-center">
              {actionError}
            </p>
          )}

          <p className="text-[10px] text-gray-400 text-center pt-1">
            Documento referencial · No constituye factura
          </p>
        </div>
      </aside>
    </div>
  );
}
