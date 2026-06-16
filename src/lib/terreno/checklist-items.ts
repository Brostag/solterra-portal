// Ítems de inspección pre-operacional del checklist.
// Las keys coinciden EXACTAMENTE con las columnas booleanas de `mant_checklists`
// (Prisma `MantChecklist`). Compartido por form (client), action (server) y detalle.

export type ChecklistItemKey =
  | "nivel_aceite"
  | "nivel_combustible"
  | "nivel_agua_radiador"
  | "nivel_hidraulico"
  | "presion_neumaticos"
  | "luces_funcionan"
  | "frenos_funcionan"
  | "cinturon_seguridad"
  | "extintor_presente"
  | "documentacion_vigente"
  | "limpieza_cabina"
  | "alarma_retroceso"
  | "estado_cucharas"
  | "fugas_aceite"
  | "fugas_combustible";

export const CHECKLIST_ITEMS: { key: ChecklistItemKey; label: string }[] = [
  { key: "nivel_aceite", label: "Nivel de Aceite" },
  { key: "nivel_combustible", label: "Nivel de Combustible" },
  { key: "nivel_agua_radiador", label: "Nivel Agua Radiador" },
  { key: "nivel_hidraulico", label: "Nivel Hidráulico" },
  { key: "presion_neumaticos", label: "Presión Neumáticos" },
  { key: "luces_funcionan", label: "Luces Funcionan" },
  { key: "frenos_funcionan", label: "Frenos Funcionan" },
  { key: "cinturon_seguridad", label: "Cinturón de Seguridad" },
  { key: "extintor_presente", label: "Extintor Presente y Vigente" },
  { key: "documentacion_vigente", label: "Documentación Vigente" },
  { key: "limpieza_cabina", label: "Limpieza Cabina" },
  { key: "alarma_retroceso", label: "Alarma de Retroceso" },
  { key: "estado_cucharas", label: "Estado Cucharas / Uñas" },
  { key: "fugas_aceite", label: "Sin Fugas de Aceite" },
  { key: "fugas_combustible", label: "Sin Fugas de Combustible" },
];

export const CHECKLIST_ITEM_KEYS: ChecklistItemKey[] = CHECKLIST_ITEMS.map(
  (i) => i.key,
);

// Estado general derivado de los ítems (réplica de la lógica del original):
// algún ítem en falla → "No Apto"; todos OK → "Apto".
export function calcEstadoGeneral(
  valores: Record<ChecklistItemKey, boolean>,
): "Apto" | "No Apto" {
  return CHECKLIST_ITEM_KEYS.some((k) => valores[k] === false)
    ? "No Apto"
    : "Apto";
}
