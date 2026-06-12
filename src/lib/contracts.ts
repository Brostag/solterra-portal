// Helpers de numeración y presentación del Contrato Marco.
//
// AISLAMIENTO (ver CLAUDE.md): el módulo de contratos no comparte lógica con
// Facturas/OC. Estas funciones son puras (sin Prisma, sin I/O) y solo manejan
// el formato del número de contrato.
//
// Formato legal vigente: NNN/YYYY (ej. "001/2026"). Los contratos antiguos se
// guardaron como "CTR-XXXX"; para presentación se mapean a NNN/YYYY usando el
// año de fecha_emision. La base de datos NO se modifica: los CTR-XXXX siguen
// almacenados igual, solo cambia cómo se muestran.

export interface ParsedContractNumber {
  correlativo: number;
  anio: number;
}

function yearOf(fecha?: Date | string | null): number | null {
  if (!fecha) return null;
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return Number.isNaN(d.getTime()) ? null : d.getFullYear();
}

/**
 * Parsea cualquiera de los dos formatos a { correlativo, anio }.
 * - "001/2026"            => { correlativo: 1,  anio: 2026 }
 * - "CTR-0003" + fecha    => { correlativo: 3,  anio: <año de la fecha> }
 * - sin formato reconocido => null
 */
export function parseContractNumber(
  numeroContrato: string,
  fechaEmision?: Date | string | null,
): ParsedContractNumber | null {
  if (!numeroContrato) return null;
  const raw = numeroContrato.trim();

  // Formato legal NNN/YYYY (1-4 dígitos de correlativo, 4 de año).
  const legal = raw.match(/^(\d{1,4})\/(\d{4})$/);
  if (legal) {
    return { correlativo: parseInt(legal[1], 10), anio: parseInt(legal[2], 10) };
  }

  // Formato antiguo CTR-XXXX → el año proviene de fecha_emision.
  const ctr = raw.match(/^CTR-?(\d+)$/i);
  if (ctr) {
    const anio = yearOf(fechaEmision);
    if (anio == null) return null;
    return { correlativo: parseInt(ctr[1], 10), anio };
  }

  return null;
}

/**
 * Número visible legal "NNN/YYYY" con padding de 3 dígitos.
 * Fallback: el número crudo tal cual si no se puede normalizar.
 *   "001/2026"          => "001/2026"
 *   "CTR-0003" + 2026   => "003/2026"
 *   "CTR-0012" + 2026   => "012/2026"
 */
export function formatContractDisplayNumber(
  numeroContrato: string,
  fechaEmision?: Date | string | null,
): string {
  const parsed = parseContractNumber(numeroContrato, fechaEmision);
  if (!parsed) return numeroContrato;
  return `${String(parsed.correlativo).padStart(3, "0")}/${parsed.anio}`;
}

/**
 * Solo el correlativo con padding de 3 dígitos (para "Anexo 001-A").
 * Fallback: el número crudo si no se puede normalizar.
 */
export function formatContractCorrelativo(
  numeroContrato: string,
  fechaEmision?: Date | string | null,
): string {
  const parsed = parseContractNumber(numeroContrato, fechaEmision);
  if (!parsed) return numeroContrato;
  return String(parsed.correlativo).padStart(3, "0");
}
