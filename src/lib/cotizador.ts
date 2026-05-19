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

export interface CotizadorInput {
  tipo:                 TipoCotizacion;
  valorHora:            number;
  horasMinimasDiarias:  number;  // usado solo si tipo === "dias"
  cantidadHoras:        number;  // usado solo si tipo === "horas"
  cantidadDias:         number;  // usado solo si tipo === "dias"
  gastos:               GastosGenerales;
  porcentajeDescuento:  number;  // 0–100
  ivaPorcentaje:        number;  // ej: 19
}

export interface CotizadorResult {
  subtotalEquipo:        number;
  gastosGeneralesTotal:  number;
  subtotal:              number;
  descuentoMonto:        number;
  neto:                  number;
  iva:                   number;
  total:                 number;
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

export function calcularCotizacion(i: CotizadorInput): CotizadorResult {
  const valorHora = safe(i.valorHora);

  const subtotalEquipo =
    i.tipo === "horas"
      ? round2(valorHora * safe(i.cantidadHoras))
      : round2(valorHora * safe(i.horasMinimasDiarias) * safe(i.cantidadDias));

  const gastosGeneralesTotal = sumarGastos(i.gastos);

  const subtotal       = round2(subtotalEquipo + gastosGeneralesTotal);
  const descuentoPct   = Math.max(0, Math.min(100, i.porcentajeDescuento || 0));
  const descuentoMonto = round2(subtotal * (descuentoPct / 100));
  const neto           = round2(subtotal - descuentoMonto);
  const ivaPct         = Math.max(0, i.ivaPorcentaje || 0);
  const iva            = round2(neto * (ivaPct / 100));
  const total          = round2(neto + iva);

  return { subtotalEquipo, gastosGeneralesTotal, subtotal, descuentoMonto, neto, iva, total };
}
