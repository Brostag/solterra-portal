// Helpers de numeración del módulo Cotizaciones.
//
// AISLAMIENTO (ver CLAUDE.md): no comparte lógica con Facturas/OC/Contratos.
// Funciones puras (sin Prisma). El cálculo de montos vive en `src/lib/cotizador.ts`.
//
// Formato Solterra EDITABLE: "NNN R{rev}/YYY"
//   YYY = año en 3 dígitos (year % 1000): 2026 -> "026", 2025 -> "025".
//   Ejemplos: "001 R0/026", "177 R2/025".
// El usuario puede sobrescribir el número (numeraciones previas del cliente).

export interface ParsedQuotationNumber {
  correlativo: number;
  revision: number;
  anioCorto: number; // ej. 26 (parte numérica de "026")
}

const QUOTATION_NUMBER_RE = /^(\d{1,4})\s*R(\d+)\s*\/\s*(\d{1,3})$/i;

/** Año en 3 dígitos para el formato Solterra: 2026 -> "026". */
export function anioCorto(year: number): string {
  return String(year % 1000).padStart(3, "0");
}

/** Parsea "NNN R{rev}/YYY". Devuelve null si no calza con el formato. */
export function parseQuotationNumber(numero: string): ParsedQuotationNumber | null {
  if (!numero) return null;
  const m = numero.trim().match(QUOTATION_NUMBER_RE);
  if (!m) return null;
  return {
    correlativo: parseInt(m[1], 10),
    revision: parseInt(m[2], 10),
    anioCorto: parseInt(m[3], 10),
  };
}

/**
 * Construye el número por defecto sugerido: "NNN R0/YYY" con
 * NNN = maxCorrelativoDelAnio + 1 (padding 3). Best-effort: el campo es editable.
 */
export function buildDefaultQuotationNumber(year: number, maxCorrelativoDelAnio: number): string {
  const next = Math.max(0, maxCorrelativoDelAnio) + 1;
  return `${String(next).padStart(3, "0")} R0/${anioCorto(year)}`;
}
