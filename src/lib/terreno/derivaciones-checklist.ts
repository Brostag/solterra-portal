// Derivaciones del Check List de Mantenimiento (83 ítems) hacia la Orden de
// Trabajo del Taller. Funciones puras: sin BD, sin React. El servidor re-lee el
// checklist y llama a estas funciones; nunca acepta el texto ya derivado que
// mande el cliente (mismo criterio que /api/cotizador/pdf).
//
// ── INTERPRETACIÓN DEL LLENADO (propuesta, pendiente de confirmar con el
// cliente). Está concentrada acá a propósito: cambiarla es editar una regla.
//
//   SI en ítem de sustitución  → "Repuestos usados" (consumió repuesto o insumo)
//   SI en el resto de acciones → "Trabajos realizados"
//   SI en ítem de conformidad  → no genera texto (solo certifica que está conforme)
//   NO en ítem de conformidad  → "Observaciones" como pendiente (es un hallazgo)
//   NO en ítem de acción       → no genera texto (es pauta no ejecutada, no un hallazgo)
//   NA                         → se ignora siempre
//   Sección C (correctivas)    → "Trabajos realizados", bajo el rótulo "Correctivas:"
//
// La sección C solo puede contener lo que el MECÁNICO escribió a mano: trabajo
// que él declara haber ejecutado. Un hallazgo del registro de ingreso/salida (un
// componente marcado "NO") es lo contrario: algo detectado y no reparado, y por
// eso cadena.ts lo siembra en las observaciones del Check List y nunca en la
// sección C. Sembrarlo en C haría que esta derivación lo empujara a
// `trabajos_realizados` y la orden de trabajo terminaría declarando como hecha
// una reparación que solo fue detectada. No reintroducir ese atajo.
//
// La observación del ítem se anexa a su línea: en el documento real es donde el
// mecánico anota la marca del repuesto o el detalle del hallazgo.
//
// Si una categoría no tiene nada que derivar devuelve "" — el campo queda vacío
// para que lo llene el usuario, no se rellena con texto inventado. Todo lo
// derivado queda editable en el formulario de la OT: esto llena campos, no los
// congela.

import {
  SECCION_A,
  SECCION_B,
  VALORES_ITEM,
  esItemDeConformidad,
  esItemDeSustitucion,
  type ItemMant,
  type ValorItem,
} from "@/lib/terreno/checklist-mantencion-items";

export type DerivacionOT = {
  repuestos_usados: string;
  trabajos_realizados: string;
  observaciones: string;
};

export type OpcionesDerivacion = {
  correlativo?: number;
  // Ya formateada por el llamador. `checklist.fecha` es @db.Date (medianoche
  // UTC): formatearla con los helpers de format.ts, nunca con getters locales,
  // o reaparece el off-by-one de un día.
  fecha?: string;
  // Las observaciones generales del Check List NO se pasan por acá: las
  // concatena el llamador (prefillOTDesdeChecklist en cadena.ts) una sola vez.
  // Si se reponen como opción, hay dos lugares que las agregan y salen
  // duplicadas en la orden de trabajo.
};

type ItemLeido = { valor: ValorItem | null; obs: string };

const ITEM_VACIO: ItemLeido = { valor: null, obs: "" };

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esValorItem(valor: unknown): valor is ValorItem {
  return typeof valor === "string" && VALORES_ITEM.some((v) => v === valor);
}

// El Json viene de la BD y pudo escribirse con otra versión del catálogo: se lee
// campo por campo y lo que no calce se ignora, sin lanzar.
function leerItem(seccion: unknown, codigo: string): ItemLeido {
  if (!esObjeto(seccion)) return ITEM_VACIO;
  const bruto = seccion[codigo];
  if (!esObjeto(bruto)) return ITEM_VACIO;
  return {
    valor: esValorItem(bruto.valor) ? bruto.valor : null,
    obs: typeof bruto.obs === "string" ? bruto.obs.trim() : "",
  };
}

function leerCorrectivas(seccion: unknown): string[] {
  if (!Array.isArray(seccion)) return [];
  return seccion
    .filter((linea): linea is string => typeof linea === "string")
    .map((linea) => linea.trim())
    .filter(Boolean);
}

function lineaItem(item: ItemMant, obs: string): string {
  const base = `${item.codigo} ${item.label}`;
  return obs ? `${base} — ${obs}` : base;
}

function encabezadoPendientes(opts: OpcionesDerivacion): string {
  const numero =
    typeof opts.correlativo === "number" && Number.isFinite(opts.correlativo)
      ? ` N°${opts.correlativo}`
      : "";
  const fecha = opts.fecha?.trim() ? ` (${opts.fecha.trim()})` : "";
  return `Pendientes del Check List${numero}${fecha}:`;
}

export function derivarOrdenTrabajo(
  items: unknown,
  opts: OpcionesDerivacion = {},
): DerivacionOT {
  const raiz: Record<string, unknown> = esObjeto(items) ? items : {};

  const repuestos: string[] = [];
  const trabajos: string[] = [];
  const pendientes: string[] = [];

  // Se recorre el catálogo, no el Json: el orden de salida queda igual al del
  // documento y los códigos desconocidos del Json quedan fuera por sí solos.
  const recorrer = (catalogo: ItemMant[], seccion: unknown): void => {
    for (const item of catalogo) {
      const { valor, obs } = leerItem(seccion, item.codigo);
      if (valor === null || valor === "NA") continue;

      const conformidad = esItemDeConformidad(item.codigo);

      if (valor === "SI") {
        if (conformidad) continue;
        const destino = esItemDeSustitucion(item.codigo) ? repuestos : trabajos;
        destino.push(lineaItem(item, obs));
        continue;
      }

      // valor === "NO": solo es hallazgo cuando el ítem juzga un estado.
      if (conformidad) pendientes.push(lineaItem(item, obs));
    }
  };

  recorrer(SECCION_A, raiz.seccion_a);
  recorrer(SECCION_B, raiz.seccion_b);

  const correctivas = leerCorrectivas(raiz.seccion_c);
  const bloquesTrabajos: string[] = [];
  if (trabajos.length > 0) bloquesTrabajos.push(trabajos.join("\n"));
  if (correctivas.length > 0) {
    bloquesTrabajos.push(
      `Correctivas:\n${correctivas.map((c) => `- ${c}`).join("\n")}`,
    );
  }

  // `observaciones` trae SOLO los pendientes derivados de los ítems. Las
  // observaciones generales que escribió el mecánico las suma el llamador.
  const observaciones =
    pendientes.length > 0
      ? `${encabezadoPendientes(opts)}\n${pendientes.join("\n")}`
      : "";

  return {
    repuestos_usados: repuestos.join("\n"),
    trabajos_realizados: bloquesTrabajos.join("\n\n"),
    observaciones,
  };
}

// ── Vocabulario de "tipo de mantención" ──
// Destino: la whitelist TIPOS de mantencion/taller/actions.ts. Si cambia allá,
// cambia acá: un valor fuera de esa whitelist hace rebotar el guardado de la OT
// con "Tipo de mantención inválido".
const TIPO_OT_SEGUN_FABRICANTE = "Según Fabricante";
const TIPO_OT_PREVENTIVA = "Preventiva";
const TIPO_OT_CORRECTIVA = "Correctiva";

// tipoOTdesdePlan (planes/actions.ts) cae a "Correctiva" porque su entrada es el
// enum A/B/C ya validado por Zod. Acá la entrada es texto libre de la BD, y
// marcarla correctiva afirmaría una falla que nadie reportó: el neutro es que
// una OT nacida de un Check List es trabajo planificado.
export const TIPO_OT_DEFAULT = TIPO_OT_PREVENTIVA;

// Mismo criterio que tipoOTdesdePlan: A → fabricante, B → preventiva,
// C → correctiva. Las combinaciones nacen planificadas; si "A-B-C" trae
// correctivas, van descritas en trabajos_realizados, no en el tipo de la OT.
// Map y no objeto literal: evita que claves como "constructor" resuelvan al
// prototipo de Object.
const TIPO_OT_POR_CHECKLIST = new Map<string, string>([
  ["A", TIPO_OT_SEGUN_FABRICANTE],
  ["B", TIPO_OT_PREVENTIVA],
  ["A-B", TIPO_OT_PREVENTIVA],
  ["A-B-C", TIPO_OT_PREVENTIVA],
  ["C", TIPO_OT_CORRECTIVA],
  ["CORRECTIVA", TIPO_OT_CORRECTIVA],
]);

export function tipoOTdesdeChecklist(tipo: string | null | undefined): string {
  if (typeof tipo !== "string") return TIPO_OT_DEFAULT;
  return TIPO_OT_POR_CHECKLIST.get(tipo.trim().toUpperCase()) ?? TIPO_OT_DEFAULT;
}
