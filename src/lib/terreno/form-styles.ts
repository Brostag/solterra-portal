// Clases Tailwind compartidas por los formularios del módulo terreno
// (Operación/Mantención). Antes estaban duplicadas en 6 componentes.

export const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#253158] placeholder:text-gray-400 focus:border-[#253158] focus:outline-none focus:ring-2 focus:ring-[#253158]/15";

export const labelCls = "mb-1.5 block text-sm font-semibold text-gray-700";

// Botón "Tomar foto" / "Elegir de galería" de FotosPendientes y FotosRegistro.
export function botonCls(deshabilitado: boolean): string {
  const base =
    "cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-center text-sm font-semibold text-[#253158] transition hover:bg-gray-50";
  return deshabilitado ? `${base} pointer-events-none opacity-60` : base;
}

// Botón de valor SÍ/NO/NA usado en checklist de mantenimiento y registro.
export function valorBtnCls(activo: boolean, valor: "SI" | "NO" | "NA"): string {
  const base = "rounded px-2 py-1 text-xs font-semibold transition ";
  if (!activo) return base + "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50";
  if (valor === "SI") return base + "bg-green-600 text-white";
  if (valor === "NO") return base + "bg-[#c6352e] text-white";
  return base + "bg-gray-400 text-white";
}
