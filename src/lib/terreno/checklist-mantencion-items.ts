// Catálogo del "Check List de Mantenimiento" de taller (documento real Solterra).
// 3 secciones: A = Mantenimiento del Fabricante (1.01–1.33),
//              B = Mantenimiento Preventivo (2.01–2.50),
//              C = Mantención Correctiva (texto libre).
// Cada ítem A/B se evalúa SÍ / NO / N/A + observación. Compartido por
// form (client), action (server) y detalle. Los valores se guardan como JSON.

export type ValorItem = "SI" | "NO" | "NA";

export type ItemMant = { codigo: string; label: string };

export const SECCION_A: ItemMant[] = [
  { codigo: "1.01", label: "Sustitución de aceite motor" },
  { codigo: "1.02", label: "Sustitución de aceite transmisión" },
  { codigo: "1.03", label: "Sustitución de aceite dirección" },
  { codigo: "1.04", label: "Sustitución de aceite diferencial" },
  { codigo: "1.05", label: "Sustitución de aceite 4DW" },
  { codigo: "1.06", label: "Sustitución de aceite tándem" },
  { codigo: "1.07", label: "Sustitución de aceite caja engranaje del círculo" },
  { codigo: "1.08", label: "Sustitución de aceite caja engranaje de bomba" },
  { codigo: "1.09", label: "Sustitución de aceite hidráulico" },
  { codigo: "1.10", label: "Sustitución de aceite caja engranaje de propulsión" },
  { codigo: "1.11", label: "Sustitución de aceite caja engranaje de giro" },
  { codigo: "1.12", label: "Sustitución de aceite cubo tracción 6 ruedas" },
  { codigo: "1.13", label: "Sustitución de aceite basculamiento hidráulico" },
  { codigo: "1.14", label: "Sustitución de aceite carcaza planetaria" },
  { codigo: "1.15", label: "Sustitución o recarga gas refrigerante A/C" },
  { codigo: "1.16", label: "Sustitución o relleno líquido limpia parabrisas" },
  { codigo: "1.17", label: "Sustitución de líquido de frenos" },
  { codigo: "1.18", label: "Sustitución de líquido batería" },
  { codigo: "1.19", label: "Sustitución de líquido refrigerante" },
  { codigo: "1.20", label: "Sustitución filtro aceite motor" },
  { codigo: "1.21", label: "Sustitución filtro combustible" },
  { codigo: "1.22", label: "Sustitución filtro aire motor" },
  { codigo: "1.23", label: "Sustitución filtro aire acondicionado" },
  { codigo: "1.24", label: "Sustitución filtro dirección" },
  { codigo: "1.25", label: "Sustitución filtro transmisión" },
  { codigo: "1.26", label: "Sustitución filtro respiradero combustible" },
  { codigo: "1.27", label: "Sustitución filtro respiradero hidráulico" },
  { codigo: "1.28", label: "Sustitución filtro respiradero transmisión" },
  { codigo: "1.29", label: "Sustitución filtro post tratado AD-BLUE" },
  { codigo: "1.30", label: "Sustitución de filtro de eje" },
  { codigo: "1.31", label: "Sustitución filtro respiradero eje trasero" },
  { codigo: "1.32", label: "Sustitución filtro hidráulico" },
  { codigo: "1.33", label: "Sustitución filtro hidráulico tracción 6 ruedas" },
];

export const SECCION_B: ItemMant[] = [
  { codigo: "2.01", label: "Limpieza filtro aire motor" },
  { codigo: "2.02", label: "Limpieza filtro aire acondicionado" },
  { codigo: "2.03", label: "Inspección de niveles en general" },
  { codigo: "2.04", label: "Inspección de freno y freno parking" },
  { codigo: "2.05", label: "Inspección de tapa relleno de aceite en general" },
  { codigo: "2.06", label: "Inspección de luces en general" },
  { codigo: "2.07", label: "Limpieza/inspección radiador, ventilador, poleas, etc" },
  { codigo: "2.08", label: "Engrase en general" },
  { codigo: "2.09", label: "Inspección de flexibles" },
  { codigo: "2.10", label: "Inspección de anclajes de tapa filtros de aire" },
  { codigo: "2.11", label: "Inspección de pasadores" },
  { codigo: "2.12", label: "Inspección de guías deslizadores" },
  { codigo: "2.13", label: "Inspección material desgaste" },
  { codigo: "2.14", label: "Sustitución de material desgaste" },
  { codigo: "2.15", label: "Inspección posibles fugas" },
  { codigo: "2.16", label: "Inspección presión de aire neumáticos" },
  { codigo: "2.17", label: "Inspección rotación/sustitución neumáticos" },
  { codigo: "2.18", label: "Alineamiento" },
  { codigo: "2.19", label: "Balanceo" },
  { codigo: "2.20", label: "Sustitución de baterías" },
  { codigo: "2.21", label: "Sustitución de ampolletas" },
  { codigo: "2.22", label: "Inspección alarma retroceso/Giro" },
  { codigo: "2.23", label: "Inspección de indicadores de tuercas" },
  { codigo: "2.24", label: "Inspección de alternador y motor de arranque" },
  { codigo: "2.25", label: "Inspección y ajuste de correas" },
  { codigo: "2.26", label: "Inspección varillas de aceite" },
  { codigo: "2.27", label: "Inspección baliza y pértiga" },
  { codigo: "2.28", label: "Inspección botiquín" },
  { codigo: "2.29", label: "Inspección mangueras" },
  { codigo: "2.30", label: "Sustitución de pastillas y balatas de frenos" },
  { codigo: "2.31", label: "Inspección de A/C y Calefacción" },
  { codigo: "2.32", label: "Inspección Tablero y indicadores de panel" },
  { codigo: "2.33", label: "Inspección de torque de pernos/tuercas" },
  { codigo: "2.34", label: "Inspección suspensión y dirección" },
  { codigo: "2.35", label: "Carga y vencimiento extintor" },
  { codigo: "2.36", label: "Set de emergencia" },
  { codigo: "2.37", label: "Buen estado de parabrisa, vidrios laterales y luneta" },
  { codigo: "2.38", label: "Inspección y ajuste de sistema vaciado de aceite" },
  { codigo: "2.39", label: "Revisión lámina antiexplosivas" },
  { codigo: "2.40", label: "Revisión focos delanteros, laterales y traseros" },
  { codigo: "2.41", label: "Revisión retrovisores y laterales" },
  { codigo: "2.42", label: "Rotulación estanque" },
  { codigo: "2.43", label: "Buen estado parachoques delantero y trasero" },
  { codigo: "2.44", label: "Cuñas de acuerdo al equipo" },
  { codigo: "2.45", label: "Revisión corta corriente y anclaje" },
  { codigo: "2.46", label: "Revisión escaleras y plataforma 3 punto de apoyo" },
  { codigo: "2.47", label: "Revisión tubo escape" },
  { codigo: "2.48", label: "Inspección cruceta, anclaje y cardán" },
  { codigo: "2.49", label: "Inspección de cinturón seguridad" },
  { codigo: "2.50", label: "Documentos/fechas al día" },
];

export const TODOS_ITEMS: ItemMant[] = [...SECCION_A, ...SECCION_B];
export const ITEM_CODIGOS: string[] = TODOS_ITEMS.map((i) => i.codigo);

// Estructura del campo JSON `items`:
// { seccion_a: { "1.01": {valor, obs}, ... },
//   seccion_b: { "2.01": {valor, obs}, ... },
//   seccion_c: ["reparación 1", "reparación 2", ...] }
export type ItemValor = { valor: ValorItem | null; obs?: string | null };
export type ChecklistMantData = {
  seccion_a: Record<string, ItemValor>;
  seccion_b: Record<string, ItemValor>;
  seccion_c: string[];
};

export const TIPO_MANTENCION_OPCIONES = ["A", "B", "C", "A-B", "A-B-C", "Correctiva"];
