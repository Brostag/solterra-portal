import type { Moneda } from "@/types";

export function formatCurrency(amount: number | string, moneda: Moneda): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;

  const locales: Record<Moneda, string> = {
    CLP: "es-CL",
    USD: "en-US",
    UF: "es-CL",
  };

  const currencies: Record<Moneda, string> = {
    CLP: "CLP",
    USD: "USD",
    UF: "CLP",
  };

  if (moneda === "UF") {
    return `UF ${value.toFixed(4)}`;
  }

  return new Intl.NumberFormat(locales[moneda], {
    style: "currency",
    currency: currencies[moneda],
    minimumFractionDigits: moneda === "CLP" ? 0 : 2,
    maximumFractionDigits: moneda === "CLP" ? 0 : 2,
  }).format(value);
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateOCTotals(
  items: { cantidad: number; valor_unitario: number }[],
  descuento_pct: number,
  ivaPercent: number
): { subtotal: number; descuento_monto: number; neto: number; iva_monto: number; total: number } {
  const subtotal = r2(items.reduce((sum, i) => sum + i.cantidad * i.valor_unitario, 0));
  const descuento_monto = r2(subtotal * descuento_pct / 100);
  const neto = r2(subtotal - descuento_monto);
  const iva_monto = r2(neto * ivaPercent / 100);
  const total = r2(neto + iva_monto);
  return { subtotal, descuento_monto, neto, iva_monto, total };
}

export function calculateInvoiceTotals(
  items: { cantidad: number; precio_unitario: number }[],
  ivaPercent: number
): { subtotal: number; iva: number; total: number } {
  const subtotal = items.reduce(
    (sum, item) => sum + item.cantidad * item.precio_unitario,
    0
  );
  const iva = Math.round(subtotal * (ivaPercent / 100) * 100) / 100;
  const total = subtotal + iva;
  return { subtotal, iva, total };
}
