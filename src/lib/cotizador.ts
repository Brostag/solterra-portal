/**
 * Cotizador — funciones puras de cálculo de presupuestos de arriendo.
 * NO importa Prisma, Next ni React. Reusable desde client y server.
 *
 * Aislado a propósito de `calculateInvoiceTotals` y `calculateOCTotals`
 * (en `src/lib/currency/index.ts`) para que cotizaciones no cruce con
 * la lógica de facturas u órdenes de compra.
 */

export type TipoCotizacion = "horas" | "dias";

/**
 * Un gasto general del cotizador. Lista dinámica: el usuario nombra cada gasto
 * y le asigna un monto. Reemplaza al antiguo record fijo de 9 claves.
 */
export type GastoGeneral = {
  id:    string;
  label: string;
  monto: number;
};

export type GastosGenerales = GastoGeneral[];

export interface CotizadorItem {
  id:                  string;
  equipo:              string;
  valorHora:           number;
  horasMinimasDiarias: number;  // usado solo si tipo === "dias"
  tipo:                TipoCotizacion;
  cantidadHoras:       number;  // usado solo si tipo === "horas"
  cantidadDias:        number;  // usado solo si tipo === "dias"
}

export interface CotizadorItemResult {
  id:                  string;
  equipo:              string;   // label normalizado
  tipo:                TipoCotizacion;
  valorHora:           number;
  horasMinimasDiarias: number;
  cantidad:            number;   // cantidadHoras o cantidadDias según tipo
  subtotal:            number;
}

export interface CotizadorInput {
  items:               CotizadorItem[];
  gastos:              GastosGenerales;
  porcentajeDescuento: number;   // 0–100
  ivaPorcentaje:       number;   // ej: 19
}

export interface CotizadorResult {
  items:                CotizadorItemResult[];
  subtotalEquipos:      number;
  gastosGeneralesTotal: number;
  subtotal:             number;
  descuentoMonto:       number;
  neto:                 number;
  iva:                  number;
  total:                number;
}

// Etiquetas de los 9 gastos históricos, en orden. Se usan como lista inicial
// por defecto y como diccionario para migrar el shape antiguo (record fijo)
// guardado en cotizaciones anteriores a la lista dinámica.
const GASTOS_LEGACY_LABELS: { id: string; label: string }[] = [
  { id: "combustible", label: "Combustible" },
  { id: "operador",    label: "Operador" },
  { id: "traslado",    label: "Traslado" },
  { id: "peajes",      label: "Peajes" },
  { id: "viaticos",    label: "Viáticos" },
  { id: "alojamiento", label: "Alojamiento" },
  { id: "mantencion",  label: "Mantención" },
  { id: "seguro",      label: "Seguro" },
  { id: "otros",       label: "Otros" },
];

export const GASTOS_INICIALES: GastosGenerales = GASTOS_LEGACY_LABELS.map(
  ({ id, label }) => ({ id, label, monto: 0 })
);

const round2 = (n: number) => Math.round(n * 100) / 100;
const safe   = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

function randomId(prefix: string): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return typeof c?.randomUUID === "function"
    ? c.randomUUID()
    : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function sumarGastos(gastos: GastosGenerales): number {
  return round2(gastos.reduce((acc, g) => acc + safe(g.monto), 0));
}

/**
 * Adapter de compatibilidad. Acepta:
 *  - una lista nueva (array de GastoGeneral) → filtra/normaliza cada ítem.
 *  - el shape antiguo (record fijo { combustible, operador, ... }) guardado en
 *    cotizaciones previas → lo convierte a lista con las etiquetas por defecto.
 *  - cualquier otra cosa → lista vacía.
 * Nunca lanza: normaliza en silencio para no romper el render de datos viejos.
 */
export function normalizarGastos(raw: unknown): GastosGenerales {
  if (Array.isArray(raw)) {
    const out: GastosGenerales = [];
    for (const item of raw) {
      if (typeof item !== "object" || item === null) continue;
      const o = item as Record<string, unknown>;
      const label = typeof o.label === "string" ? o.label.trim() : "";
      if (label === "") continue;
      const monto = typeof o.monto === "number" && Number.isFinite(o.monto) && o.monto >= 0 ? o.monto : 0;
      const id = typeof o.id === "string" && o.id.trim() !== "" ? o.id : randomId("gasto");
      out.push({ id, label, monto });
    }
    return out;
  }

  if (typeof raw === "object" && raw !== null) {
    const g = raw as Record<string, unknown>;
    return GASTOS_LEGACY_LABELS.map(({ id, label }) => {
      const v = g[id];
      const monto = typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
      return { id, label, monto };
    });
  }

  return [];
}

export function nuevoGasto(label = ""): GastoGeneral {
  return { id: randomId("gasto"), label, monto: 0 };
}

export function nuevoItem(): CotizadorItem {
  const id = randomId("item");
  return {
    id,
    equipo:              "",
    valorHora:           0,
    horasMinimasDiarias: 0,
    tipo:                "horas",
    cantidadHoras:       0,
    cantidadDias:        0,
  };
}

export function calcularSubtotalItem(item: CotizadorItem): number {
  const valorHora = safe(item.valorHora);
  if (item.tipo === "horas") {
    return round2(valorHora * safe(item.cantidadHoras));
  }
  return round2(valorHora * safe(item.horasMinimasDiarias) * safe(item.cantidadDias));
}

export function calcularCotizacion(i: CotizadorInput): CotizadorResult {
  const items: CotizadorItemResult[] = i.items.map((item) => {
    return {
      id:                  item.id,
      equipo:              item.equipo.trim() || "Equipo o servicio no especificado",
      tipo:                item.tipo,
      valorHora:           safe(item.valorHora),
      horasMinimasDiarias: safe(item.horasMinimasDiarias),
      cantidad:            item.tipo === "horas" ? safe(item.cantidadHoras) : safe(item.cantidadDias),
      subtotal:            calcularSubtotalItem(item),
    };
  });

  const subtotalEquipos      = round2(items.reduce((acc, it) => acc + it.subtotal, 0));
  const gastosGeneralesTotal = sumarGastos(i.gastos);
  const subtotal             = round2(subtotalEquipos + gastosGeneralesTotal);
  const descuentoPct         = Math.max(0, Math.min(100, i.porcentajeDescuento || 0));
  const descuentoMonto       = round2(subtotal * (descuentoPct / 100));
  const neto                 = round2(subtotal - descuentoMonto);
  const ivaPct               = Math.max(0, i.ivaPorcentaje || 0);
  const iva                  = round2(neto * (ivaPct / 100));
  const total                = round2(neto + iva);

  return {
    items,
    subtotalEquipos,
    gastosGeneralesTotal,
    subtotal,
    descuentoMonto,
    neto,
    iva,
    total,
  };
}
