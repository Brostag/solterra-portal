// Helpers de formato compartidos por el módulo terreno. Antes duplicados en
// varias listas/formularios. Los badges de estado siguen siendo locales a cada
// componente porque su semántica (colores/estados) es específica del dominio.

export function fmtNum(n: number | null): string {
  return n != null ? n.toLocaleString("es-CL") : "—";
}

// ISO de un campo @db.Date (medianoche UTC) → "YYYY-MM-DD" para <input type="date">.
// Usa getters UTC para no retroceder un día en zonas negativas (Chile UTC-4).
export function toUTCDateInput(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// ISO de un campo DateTime → "YYYY-MM-DD" local para <input type="date">.
export function toLocalDateInput(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ISO de un campo DateTime → "YYYY-MM-DDTHH:mm" local para <input type="datetime-local">.
export function toLocalDateTimeInput(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
