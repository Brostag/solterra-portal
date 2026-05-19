/**
 * Cotizador — funciones puras de cálculo de presupuestos de arriendo.
 * NO importa Prisma, Next ni React. Reusable desde client y server.
 *
 * Aislado a propósito de `calculateInvoiceTotals` y `calculateOCTotals`
 * (en `src/lib/currency/index.ts`) para que cotizaciones no cruce con
 * la lógica de facturas u órdenes de compra.
 */

export type TipoCotizacion = "horas" | "dias";

export interface GastosGenerales {
  combustible: number;
  operador:    number;
  traslado:    number;
  peajes:      number;
  viaticos:    number;
  alojamiento: number;
  mantencion:  number;
  seguro:      number;
  otros:       number;
}

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

export const GASTOS_INICIALES: GastosGenerales = {
  combustible: 0,
  operador:    0,
  traslado:    0,
  peajes:      0,
  viaticos:    0,
  alojamiento: 0,
  mantencion:  0,
  seguro:      0,
  otros:       0,
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const safe   = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function sumarGastos(g: GastosGenerales): number {
  return round2(
    safe(g.combustible) + safe(g.operador)    + safe(g.traslado) +
    safe(g.peajes)      + safe(g.viaticos)    + safe(g.alojamiento) +
    safe(g.mantencion)  + safe(g.seguro)      + safe(g.otros)
  );
}

export function nuevoItem(): CotizadorItem {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const id =
    typeof c?.randomUUID === "function"
      ? c.randomUUID()
      : `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
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
