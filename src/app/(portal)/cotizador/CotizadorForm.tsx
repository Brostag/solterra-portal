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
  Download,
  Fuel,
  HardHat,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
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

type ActionId = "pdf" | "print" | "whatsapp" | "mail";

export default function CotizadorForm({ ivaPorcentaje }: Props) {
  const [items, setItems]                             = useState<CotizadorItem[]>(() => [nuevoItem()]);
  const [gastos, setGastos]                           = useState<GastosGenerales>(GASTOS_INICIALES);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);
  const [busyAction, setBusyAction]                   = useState<ActionId | null>(null);
  const [actionError, setActionError]                 = useState<string | null>(null);

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
  }

  function updateItem(id: string, patch: Partial<CotizadorItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function updateGasto(key: keyof GastosGenerales, value: number) {
    setGastos((prev) => ({ ...prev, [key]: value }));
  }

  function limpiar() {
    setItems([nuevoItem()]);
    setGastos(GASTOS_INICIALES);
    setPorcentajeDescuento(0);
    setActionError(null);
  }

  function buildRequestBody() {
    return { items, gastos, porcentajeDescuento, ivaPorcentaje };
  }

  function buildSummaryText(): string {
    const lineas = result.items.map((it) => {
      const cantUnit = it.tipo === "horas" ? "h" : "d";
      return `• ${it.equipo} (${it.cantidad}${cantUnit}): ${formatCurrency(it.subtotal, "CLP")}`;
    });
    return [
      "Hola, envío presupuesto referencial de arriendo Solterra:",
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

  async function descargarPDF() {
    setBusyAction("pdf");
    setActionError(null);
    try {
      const blob = await fetchPdfBlob();
      const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `presupuesto-arriendo-solterra-${yyyymmdd}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al descargar PDF");
    } finally {
      setBusyAction(null);
    }
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

  function compartirWhatsApp() {
    setActionError(null);
    const msg = encodeURIComponent(buildSummaryText());
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  }

  function enviarCorreo() {
    setActionError(null);
    const subject = encodeURIComponent("Presupuesto de Arriendo Solterra");
    const body = encodeURIComponent(buildSummaryText());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
      {/* ── Columna izquierda: formulario ─────────────────────────── */}
      <div className="space-y-6">
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
                      <input
                        id={`valorHora-${it.id}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={it.valorHora || ""}
                        onChange={(e) =>
                          updateItem(it.id, { valorHora: Math.max(0, Number(e.target.value) || 0) })
                        }
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
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={descargarPDF}
                disabled={busyAction !== null}
                variant="outline"
                className="gap-2 border-[#253158]/30 text-[#253158] hover:bg-[#253158]/5 disabled:opacity-60"
                aria-busy={busyAction === "pdf"}
              >
                {busyAction === "pdf"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
                PDF
              </Button>
              <Button
                type="button"
                onClick={imprimir}
                disabled={busyAction !== null}
                variant="outline"
                className="gap-2 border-[#253158]/30 text-[#253158] hover:bg-[#253158]/5 disabled:opacity-60"
                aria-busy={busyAction === "print"}
              >
                {busyAction === "print"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Printer className="h-4 w-4" />}
                Imprimir
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={compartirWhatsApp}
                disabled={busyAction !== null}
                variant="outline"
                className="gap-2 border-[#253158]/30 text-[#253158] hover:bg-[#253158]/5 disabled:opacity-60"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                type="button"
                onClick={enviarCorreo}
                disabled={busyAction !== null}
                variant="outline"
                className="gap-2 border-[#253158]/30 text-[#253158] hover:bg-[#253158]/5 disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                Correo
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
