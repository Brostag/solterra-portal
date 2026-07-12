"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import {
  calcularCotizacion,
  nuevoGasto,
  nuevoItem,
  type CotizadorItem,
  type CotizadorItemResult,
  type GastosGenerales,
  type TipoCotizacion,
} from "@/lib/cotizador";
import {
  CalendarDays,
  Check,
  Clock,
  FileCheck,
  Loader2,
  PlusCircle,
  Printer,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import PdfShareActions from "@/components/portal/PdfShareActions";
import { useRouter } from "next/navigation";
import { createQuotation, updateQuotation } from "@/app/(portal)/cotizaciones/actions";
import { saveCotizadorGastosDefault } from "./actions";

interface ClienteOption {
  id:     string;
  nombre: string;
  rut:    string | null;
}

// Valores iniciales para el modo edición. Cuando viene, el form arranca con
// estos datos y guarda con updateQuotation en vez de createQuotation.
interface InitialCotizacion {
  numero:              string;
  validezDias:         number | null;
  clienteId:          string | null;
  porcentajeDescuento: number;
  items:               CotizadorItem[];
  gastos:              GastosGenerales;
}

interface Props {
  ivaPorcentaje:   number;
  clientes:        ClienteOption[];
  numeroSugerido:  string;
  gastosDefault:   GastosGenerales;
  canSaveGastos:   boolean;
  // Modo edición (opcional). Sin estas props el comportamiento es idéntico
  // al de crear una cotización nueva.
  quotationId?:    string;
  initial?:        InitialCotizacion;
}

type SaveGastosState = "idle" | "saving" | "ok" | "error";

// Opciones de validez del presupuesto (días). Default 30.
const VALIDEZ_OPCIONES = [7, 15, 30, 60] as const;
const VALIDEZ_DEFAULT = 30;

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

// Parsea "YYYY-MM-DD" como fecha LOCAL. Evita el off-by-one de
// new Date("YYYY-MM-DD"), que interpreta el string en UTC.
function parseFechaLocal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Diferencia de calendario (inicio ≤ fin) en años/meses/días. Cuando los días
// no alcanzan, toma prestado el largo del mes de INICIO (día 0 del mes
// siguiente = último día del mes de inicio); luego, si los meses quedan
// negativos, baja un año. Mismo patrón usado en NuevoContratoForm.
function desgloseSpan(inicio: Date, fin: Date): { anios: number; meses: number; dias: number } {
  let anios = fin.getFullYear() - inicio.getFullYear();
  let meses = fin.getMonth() - inicio.getMonth();
  let dias = fin.getDate() - inicio.getDate();
  if (dias < 0) {
    meses -= 1;
    dias += new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }
  return { anios, meses, dias };
}

// Humaniza el desglose en es-CL con singular/plural y unión natural.
function textoSpan({ anios, meses, dias }: { anios: number; meses: number; dias: number }): string {
  const partes: string[] = [];
  if (anios > 0) partes.push(`${anios} ${anios === 1 ? "año" : "años"}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? "mes" : "meses"}`);
  if (dias > 0) partes.push(`${dias} ${dias === 1 ? "día" : "días"}`);
  if (partes.length === 0) return "0 días";
  if (partes.length === 1) return partes[0];
  if (partes.length === 2) return `${partes[0]} y ${partes[1]}`;
  return `${partes[0]}, ${partes[1]} y ${partes[2]}`;
}

// Texto de "Tiempo de arriendo" a partir del rango. Muestra el desglose de
// calendario y el total de días entre paréntesis cuando el desglose no es solo
// días (ej: "1 mes y 3 días (34 días)"). Si es solo días, deja "34 días".
// "—" cuando no hay rango válido.
function textoTiempoArriendo(desde: string, hasta: string): string {
  const dias = diasEntre(desde, hasta);
  if (dias === null) return "—";
  const ini = parseFechaLocal(desde);
  const fin = parseFechaLocal(hasta);
  if (!ini || !fin) return "—";
  const span = desgloseSpan(ini, fin);
  const soloDias = span.anios === 0 && span.meses === 0;
  const humano = textoSpan(span);
  if (soloDias) return `${dias} ${dias === 1 ? "día" : "días"}`;
  return `${humano} (${dias} ${dias === 1 ? "día" : "días"})`;
}

export default function CotizadorForm({
  ivaPorcentaje,
  clientes,
  numeroSugerido,
  gastosDefault,
  canSaveGastos,
  quotationId,
  initial,
}: Props) {
  const isEditing = quotationId != null;
  const [items, setItems]                             = useState<CotizadorItem[]>(() =>
    initial ? initial.items : [nuevoItem()]
  );
  // Fechas por ítem: SEPARADO de items para no contaminar el payload (items solo lleva números).
  // En edición no se reconstruyen fechas (los items ya traen cantidades resueltas).
  const [fechasPorItem, setFechasPorItem]             = useState<Record<string, { desde: string; hasta: string }>>({});
  const [gastos, setGastos]                           = useState<GastosGenerales>(() =>
    initial ? initial.gastos : gastosDefault
  );
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(() =>
    initial ? initial.porcentajeDescuento : 0
  );
  const [clienteId, setClienteId]                     = useState(() =>
    initial ? (initial.clienteId ?? "") : ""
  );
  const [busyAction, setBusyAction]                   = useState<ActionId | null>(null);
  const [actionError, setActionError]                 = useState<string | null>(null);
  const [numero, setNumero]                           = useState(() =>
    initial ? initial.numero : numeroSugerido
  );
  const [validezDias, setValidezDias]                 = useState<number>(() =>
    initial ? (initial.validezDias ?? VALIDEZ_DEFAULT) : VALIDEZ_DEFAULT
  );
  const [saveGastosState, setSaveGastosState]         = useState<SaveGastosState>("idle");
  const [saveGastosError, setSaveGastosError]         = useState<string | null>(null);
  const router = useRouter();

  const clienteSel = clientes.find((c) => c.id === clienteId) ?? null;

  const resumenRef = useRef<HTMLDivElement>(null);

  // Gastos que se envían al servidor: solo los que tienen nombre. El estado
  // `gastos` puede tener uno recién agregado con label en blanco, y el schema
  // server-side exige label no vacío. El total no cambia: sumarGastos ignora
  // montos ≤ 0 y estos gastos-en-blanco parten en 0.
  const gastosPayload = useMemo<GastosGenerales>(
    () => gastos.map((g) => ({ ...g, label: g.label.trim() })).filter((g) => g.label !== ""),
    [gastos]
  );

  const result = useMemo(
    () =>
      calcularCotizacion({
        items,
        gastos: gastosPayload,
        porcentajeDescuento,
        ivaPorcentaje,
      }),
    [items, gastosPayload, porcentajeDescuento, ivaPorcentaje]
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

  function updateGastoMonto(id: string, monto: number) {
    setGastos((prev) => prev.map((g) => (g.id === id ? { ...g, monto } : g)));
    setSaveGastosState("idle");
  }

  function updateGastoLabel(id: string, label: string) {
    setGastos((prev) => prev.map((g) => (g.id === id ? { ...g, label } : g)));
    setSaveGastosState("idle");
  }

  function addGasto() {
    setGastos((prev) => [...prev, nuevoGasto()]);
    setSaveGastosState("idle");
  }

  function removeGasto(id: string) {
    setGastos((prev) => prev.filter((g) => g.id !== id));
    setSaveGastosState("idle");
  }

  async function guardarGastosDefault() {
    setSaveGastosError(null);
    setSaveGastosState("saving");
    try {
      // Solo gastos con nombre no vacío se persisten como default.
      const limpios = gastos
        .map((g) => ({ id: g.id, label: g.label.trim(), monto: g.monto }))
        .filter((g) => g.label !== "");
      await saveCotizadorGastosDefault(limpios);
      setSaveGastosState("ok");
    } catch (err) {
      setSaveGastosError(err instanceof Error ? err.message : "No se pudieron guardar los gastos.");
      setSaveGastosState("error");
    }
  }

  function limpiar() {
    // En edición "Limpiar" descarta cambios y vuelve al estado original de la
    // cotización; al crear, deja el formulario vacío.
    if (initial) {
      setItems(initial.items);
      setGastos(initial.gastos);
      setPorcentajeDescuento(initial.porcentajeDescuento);
      setClienteId(initial.clienteId ?? "");
      setNumero(initial.numero);
      setValidezDias(initial.validezDias ?? VALIDEZ_DEFAULT);
    } else {
      setItems([nuevoItem()]);
      setGastos(gastosDefault);
      setPorcentajeDescuento(0);
      setClienteId("");
      setNumero(numeroSugerido);
      setValidezDias(VALIDEZ_DEFAULT);
    }
    setFechasPorItem({});
    setActionError(null);
    setSaveGastosState("idle");
    setSaveGastosError(null);
  }

  // Actualiza el rango de fechas del ítem y, si es válido, deriva el campo del
  // modo activo: en "dias" → cantidadDias = N; en "horas" → cantidadHoras =
  // N × horasMinimasDiarias (solo si horasMin > 0). El cálculo va FUERA del
  // updater de setState (updaters puros).
  function updateFecha(id: string, patch: { desde?: string; hasta?: string }) {
    const actual = fechasPorItem[id] ?? { desde: "", hasta: "" };
    const next = { ...actual, ...patch };
    setFechasPorItem((prev) => ({ ...prev, [id]: next }));
    const n = diasEntre(next.desde, next.hasta);
    if (n === null) return;
    const item = items.find((it) => it.id === id);
    if (!item) return;
    if (item.tipo === "dias") {
      updateItem(id, { cantidadDias: n });
    } else if (item.horasMinimasDiarias > 0) {
      updateItem(id, { cantidadHoras: n * item.horasMinimasDiarias });
    }
  }

  // Cambia las horas mínimas diarias y, en modo "horas" con rango válido,
  // re-deriva cantidadHoras = N × horasMin. En "dias" no toca la cantidad.
  // Cálculo fuera del updater (updaters puros).
  function updateHorasMin(id: string, horasMin: number) {
    updateItem(id, { horasMinimasDiarias: horasMin });
    const item = items.find((it) => it.id === id);
    if (!item || item.tipo !== "horas") return;
    const rango = fechasPorItem[id];
    if (!rango) return;
    const n = diasEntre(rango.desde, rango.hasta);
    if (n !== null && horasMin > 0) updateItem(id, { cantidadHoras: n * horasMin });
  }

  // Cambia el tipo (horas↔dias) y, si hay rango válido, re-deriva el campo del
  // modo destino: a "horas" → cantidadHoras = N × horasMin (si horasMin > 0);
  // a "dias" → cantidadDias = N. Sin rango válido, no toca nada.
  function updateTipo(id: string, tipo: TipoCotizacion) {
    updateItem(id, { tipo });
    const item = items.find((it) => it.id === id);
    const rango = fechasPorItem[id];
    if (!item || !rango) return;
    const n = diasEntre(rango.desde, rango.hasta);
    if (n === null) return;
    if (tipo === "dias") {
      updateItem(id, { cantidadDias: n });
    } else if (item.horasMinimasDiarias > 0) {
      updateItem(id, { cantidadHoras: n * item.horasMinimasDiarias });
    }
  }

  function buildRequestBody() {
    return {
      items,
      gastos: gastosPayload,
      porcentajeDescuento,
      ivaPorcentaje,
      clienteId: clienteId || null,
      // N° visible en el encabezado del PDF de vista previa (mismo dato que
      // viaja a createQuotation al generar la cotización formal).
      numero: numero.trim() || null,
      // Validez del presupuesto en días (se refleja en el PDF de vista previa).
      validezDias,
    };
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
    const payload = {
      numero: numero.trim(),
      clienteId: clienteId || null,
      items,
      gastos: gastosPayload,
      porcentajeDescuento,
      ivaPorcentaje,
      validez_dias: validezDias,
    };
    try {
      const { id } = quotationId
        ? await updateQuotation({ id: quotationId, ...payload })
        : await createQuotation(payload);
      router.push(`/cotizaciones/${id}`);
    } catch (err) {
      const fallback = quotationId
        ? "No se pudieron guardar los cambios."
        : "No se pudo generar la cotización.";
      setActionError(err instanceof Error ? err.message : fallback);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div>
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
            <div>
              <label htmlFor="validez" className="block text-xs font-medium text-gray-700 mb-1.5">
                Validez de la cotización
              </label>
              <select
                id="validez"
                value={String(validezDias)}
                onChange={(e) => setValidezDias(Number(e.target.value) || VALIDEZ_DEFAULT)}
                className={inputClass}
              >
                {VALIDEZ_OPCIONES.map((d) => (
                  <option key={d} value={d}>
                    {d} días
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Días de vigencia del presupuesto desde la emisión.
              </p>
            </div>
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

                  {/* Valor hora — a media anchura en sm, en su propia fila */}
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
                  </div>

                  {/* Tipo de cotización */}
                  <div>
                    <span className="block text-xs font-medium text-gray-700 mb-2">
                      Tipo de cotización
                    </span>
                    <div className="flex gap-2 flex-wrap" role="group" aria-label="Tipo de cotización">
                      <button
                        type="button"
                        onClick={() => updateTipo(it.id, "horas")}
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
                        onClick={() => updateTipo(it.id, "dias")}
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

                  {/* Bloque según tipo: en ambos modos van Horas mínimas + Desde + Hasta */}
                  {it.tipo === "horas" ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                              updateHorasMin(it.id, Math.max(0, Math.min(24, Number.isFinite(n) ? n : 0)));
                            }}
                            placeholder="Ej: 8"
                            className={inputClass}
                          />
                        </div>
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
                        <p className="text-xs text-[#c6352e]">
                          La fecha hasta debe ser igual o posterior a la fecha desde.
                        </p>
                      )}
                      {/* Tiempo de arriendo — solo lectura, rango humanizado */}
                      <div>
                        <span className="block text-xs font-medium text-gray-700 mb-1.5">
                          Tiempo de arriendo
                        </span>
                        <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-[#253158]">
                          {textoTiempoArriendo(rango.desde, rango.hasta)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                              updateHorasMin(it.id, Math.max(0, Math.min(24, Number.isFinite(n) ? n : 0)));
                            }}
                            placeholder="Ej: 8"
                            className={inputClass}
                          />
                        </div>
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

                  {/* Cantidad — editable a mano; auto-calculada desde fechas */}
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
                    {it.tipo === "horas" && diasRango !== null && it.horasMinimasDiarias > 0 && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        Según fechas: {diasRango} {diasRango === 1 ? "día" : "días"} × {it.horasMinimasDiarias} h/día = {diasRango * it.horasMinimasDiarias} horas
                      </p>
                    )}
                    {it.tipo === "horas" && diasRango !== null && it.horasMinimasDiarias === 0 && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        Ingresa las horas mínimas diarias para calcular las horas.
                      </p>
                    )}
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-[#253158] uppercase tracking-wider">
              Gastos generales
            </h2>
            <span className="text-[11px] text-gray-400">
              {gastos.length} {gastos.length === 1 ? "gasto" : "gastos"}
            </span>
          </div>

          {gastos.length === 0 ? (
            <p className="text-sm text-gray-400">
              Sin gastos generales. Agrega uno para incluirlo en el presupuesto.
            </p>
          ) : (
            <div className="space-y-2.5">
              {gastos.map((g, idx) => (
                <div key={g.id} className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    {idx === 0 && (
                      <span className="block text-xs font-medium text-gray-700 mb-1.5">
                        Nombre del gasto
                      </span>
                    )}
                    <input
                      type="text"
                      value={g.label}
                      onChange={(e) => updateGastoLabel(g.id, e.target.value)}
                      placeholder="Nombre del gasto"
                      maxLength={60}
                      autoComplete="off"
                      aria-label={`Nombre del gasto ${idx + 1}`}
                      className={inputClass}
                    />
                  </div>
                  <div className="w-32 sm:w-40 flex-shrink-0">
                    {idx === 0 && (
                      <span className="block text-xs font-medium text-gray-700 mb-1.5">
                        Monto (CLP)
                      </span>
                    )}
                    <MoneyInput
                      id={`gasto-monto-${g.id}`}
                      value={g.monto}
                      onChange={(n) => updateGastoMonto(g.id, n)}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGasto(g.id)}
                    aria-label={`Eliminar gasto ${idx + 1}`}
                    className="text-gray-400 hover:text-[#c6352e] p-2 rounded transition-colors flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            onClick={addGasto}
            variant="outline"
            className="w-full gap-2 border-dashed border-[#253158]/30 text-[#253158] hover:bg-[#253158]/5"
          >
            <PlusCircle className="h-4 w-4" />
            Agregar gasto
          </Button>

          {canSaveGastos && (
            <div className="pt-3 border-t border-gray-100 space-y-1.5">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={guardarGastosDefault}
                  disabled={saveGastosState === "saving"}
                  variant="outline"
                  className="gap-2 border-[#253158]/30 text-[#253158] hover:bg-[#253158]/5 disabled:opacity-60"
                  aria-busy={saveGastosState === "saving"}
                >
                  {saveGastosState === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar mis gastos
                </Button>
                {saveGastosState === "ok" && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <Check className="h-3.5 w-3.5" />
                    Guardado
                  </span>
                )}
              </div>
              {saveGastosState === "error" && saveGastosError && (
                <p role="alert" className="text-xs text-[#c6352e]">
                  {saveGastosError}
                </p>
              )}
              <p className="text-[11px] text-gray-400">
                Guarda esta lista como predeterminada para las próximas cotizaciones.
              </p>
            </div>
          )}
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
                : isEditing ? <Save className="h-4 w-4" /> : <FileCheck className="h-4 w-4" />}
              {isEditing ? "Guardar cambios" : "Generar cotización"}
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
