// Vocabulario y formateadores de la bandeja de soporte (lista, detalle y
// server actions).
//
// Este módulo es NEUTRO: no importa getSession, prisma ni redirect, así que se
// puede importar desde un componente cliente sin arrastrar servidor al bundle.
// El guard de acceso vive aparte, en `./guard`. No mezclar las dos cosas.

export const ESTADOS = ["Nuevo", "En revisión", "Resuelto", "Descartado"] as const;

export type EstadoReporte = (typeof ESTADOS)[number];

export function esEstadoValido(valor: string): valor is EstadoReporte {
  return (ESTADOS as readonly string[]).includes(valor);
}

// El estado se guarda con tilde y espacio ("En revisión"). En la URL viaja como
// slug para no arrastrar %20 ni %C3%B3n en los filtros.
export const ESTADO_SLUG: Record<EstadoReporte, string> = {
  Nuevo: "nuevo",
  "En revisión": "en-revision",
  Resuelto: "resuelto",
  Descartado: "descartado",
};

export function estadoDesdeSlug(slug: string | undefined): EstadoReporte | undefined {
  if (!slug) return undefined;
  return ESTADOS.find((e) => ESTADO_SLUG[e] === slug);
}

export const ESTADO_COLORS: Record<EstadoReporte, string> = {
  Nuevo: "bg-amber-50 text-amber-700 border border-amber-200",
  "En revisión": "bg-blue-50 text-blue-600 border border-blue-200",
  Resuelto: "bg-green-50 text-green-600 border border-green-200",
  Descartado: "bg-gray-50 text-gray-500 border border-gray-200",
};

// Los tipos que emite el formulario son "Problema", "Sugerencia" y "Consulta"
// (ver FeedbackPanel y la validación del endpoint). El tipo puede crecer: mapa
// con fallback, nunca un Record cerrado.
export const TIPO_COLORS: Record<string, string> = {
  Problema: "bg-red-50 text-[#c6352e] border border-red-200",
  Sugerencia: "bg-indigo-50 text-indigo-600 border border-indigo-200",
  Consulta: "bg-sky-50 text-sky-600 border border-sky-200",
};

export const TIPO_COLOR_FALLBACK = "bg-gray-50 text-gray-500 border border-gray-200";

export const MODULO_LABELS: Record<string, string> = {
  COMERCIAL: "Comercial",
  MANTENCION: "Mantención",
  OPERACION: "Operación",
};

// Las fechas se guardan en UTC y el servidor de producción corre en UTC. Se
// fuerza la zona de Chile para que el técnico vea la hora real del reporte.
const TZ = "America/Santiago";

export function fmtFecha(valor: Date): string {
  return new Date(valor).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  });
}

export function fmtFechaHora(valor: Date): string {
  return new Date(valor).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

export function formatTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
