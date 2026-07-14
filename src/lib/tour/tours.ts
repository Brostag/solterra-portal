// Definición de los tours guiados (spotlight paso a paso) por módulo.
//
// Contenido en español de Chile, corto y verificado contra las pantallas
// reales del portal. Complementa —no reemplaza— las guías de uso completas
// (/ayuda, /mantencion/ayuda, /operacion/ayuda).
//
// Cada `element` es un selector CSS que apunta a un ancla `data-tour="..."`
// del DOM real. Los pasos SIN `element` se muestran como modal centrado
// (bienvenida / cierre). En pantallas donde un ancla no exista (p. ej. el
// sidebar oculto en móvil), el paso degrada a popover centrado; AppTour
// filtra los pasos cuyo elemento no esté presente antes de armar el tour.

import type { Module } from "@/lib/modules";

/** Un paso del tour. Tipos propios: no dependemos de los tipos de driver.js
 *  en la capa de datos para poder testear el contenido de forma aislada. */
export type TourStep = {
  /** Selector CSS del ancla. Ausente = modal centrado (bienvenida/cierre). */
  element?: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

const comercialSteps: TourStep[] = [
  {
    title: "Bienvenido al Módulo Comercial",
    description:
      "Te mostramos lo esencial en un minuto: contratos, cotizaciones, empresas y órdenes de compra. Puedes salir cuando quieras con la X o la tecla Esc.",
  },
  {
    element: '[data-tour="sidebar-nav"]',
    title: "Menú de navegación",
    description:
      "Desde aquí llegas a Contratos, Empresas, Servicios, Documentos, Órdenes de Compra, Cotizador y Cotizaciones. Es tu punto de partida en todo el módulo.",
    side: "right",
    align: "start",
  },
  {
    element: '[data-tour="kpis"]',
    title: "Tus números de un vistazo",
    description:
      "Estas tarjetas resumen contratos, empresas, órdenes de compra y documentos. Haz clic en cualquiera para ir directo a esa sección.",
    side: "bottom",
    align: "center",
  },
  {
    element: '[data-tour="acciones"]',
    title: "Acciones rápidas",
    description:
      "Los atajos más usados: crear un contrato marco, una empresa, una orden de compra, subir un documento o abrir el cotizador.",
    side: "bottom",
    align: "center",
  },
  {
    element: '[data-tour="listas"]',
    title: "Actividad reciente",
    description:
      "Los últimos contratos, órdenes de compra y empresas quedan a mano. Haz clic en una fila para abrir su detalle.",
    side: "top",
    align: "center",
  },
  {
    element: '[data-tour="help-button"]',
    title: "Ayuda de cada pantalla",
    description:
      "Este botón abre la ayuda contextual de la pantalla en la que estés: para qué sirve, pasos básicos y consejos.",
    side: "bottom",
    align: "end",
  },
  {
    title: "Sigue el orden recomendado",
    description:
      "En Guía de uso está el paso a paso completo: primero Empresas, luego la Cotización y recién ahí el Contrato. Ábrela desde el enlace «Guía de uso» bajo el saludo.",
  },
];

const mantencionSteps: TourStep[] = [
  {
    title: "Bienvenido al Módulo de Mantención",
    description:
      "Te mostramos lo esencial en un minuto: la flota, los planes de mantención, el taller y los certificados. Puedes salir cuando quieras con la X o la tecla Esc.",
  },
  {
    element: '[data-tour="sidebar-nav"]',
    title: "Menú de navegación",
    description:
      "Desde aquí entras a Equipos, Taller, Planes, Check List, Certificado, Vencimientos y Reportes. Recorre el módulo desde este menú.",
    side: "right",
    align: "start",
  },
  {
    element: '[data-tour="kpis"]',
    title: "Estado de la mantención",
    description:
      "Equipos en mantención, trabajos abiertos y completados, y certificados vigentes, por vencer o vencidos. Haz clic en una tarjeta para ver el detalle.",
    side: "bottom",
    align: "center",
  },
  {
    element: '[data-tour="submodulos"]',
    title: "Taller, Certificados y Reportes",
    description:
      "Accesos directos a las tres áreas principales: ejecutar mantenciones en el Taller, controlar vencimientos y exportar Reportes.",
    side: "bottom",
    align: "center",
  },
  {
    element: '[data-tour="planes"]',
    title: "El flujo en 3 pasos",
    description:
      "El ciclo es: 1) Registro de entrada en Operación, 2) crear el Plan (A según fabricante, B preventivo, C correctivo) aquí en «Planes», y 3) generar la Orden de Trabajo hacia el Taller.",
    side: "right",
    align: "center",
  },
  {
    element: '[data-tour="help-button"]',
    title: "Ayuda de cada pantalla",
    description:
      "Este botón abre la ayuda contextual de la pantalla en la que estés: para qué sirve, pasos básicos y consejos.",
    side: "bottom",
    align: "end",
  },
  {
    title: "Revisa la guía completa",
    description:
      "En Guía de uso está el paso a paso completo del ciclo, de la flota al plan, del plan a la orden de trabajo y de ahí al certificado. Ábrela desde el enlace «Guía de uso» bajo el título.",
  },
];

const operacionSteps: TourStep[] = [
  {
    title: "Bienvenido al Módulo de Operación",
    description:
      "Te mostramos lo esencial en un minuto: el control diario del equipo en terreno con partes diarios y checklists. Puedes salir cuando quieras con la X o la tecla Esc.",
  },
  {
    element: '[data-tour="sidebar-nav"]',
    title: "Menú de navegación",
    description:
      "Desde aquí llegas a Partes Diarios y Checklists. Los equipos se gestionan en Mantención; aquí solo los seleccionas.",
    side: "right",
    align: "start",
  },
  {
    element: '[data-tour="kpis"]',
    title: "Tu día de un vistazo",
    description:
      "Equipos totales y activos, equipos en mantención, y los partes diarios y checklists registrados hoy. Haz clic en una tarjeta para ir a esa lista.",
    side: "bottom",
    align: "center",
  },
  {
    element: '[data-tour="acciones"]',
    title: "Acciones rápidas",
    description:
      "Los dos registros del día: «Nuevo parte diario» documenta el uso del equipo y «Nuevo checklist» deja la inspección pre-operacional.",
    side: "bottom",
    align: "center",
  },
  {
    element: '[data-tour="listas"]',
    title: "Actividad reciente",
    description:
      "Los últimos partes diarios y checklists del equipo, con su estado. Un parte queda Pendiente hasta que el supervisor lo revise.",
    side: "top",
    align: "center",
  },
  {
    element: '[data-tour="help-button"]',
    title: "Ayuda de cada pantalla",
    description:
      "Este botón abre la ayuda contextual de la pantalla en la que estés: para qué sirve, pasos básicos y consejos.",
    side: "bottom",
    align: "end",
  },
  {
    title: "Revisa la guía completa",
    description:
      "En Guía de uso está el paso a paso completo del control diario: registrar el uso, inspeccionar y dejar todo listo para que Mantención planifique. Ábrela desde el enlace «Guía de uso» bajo el título.",
  },
];

const TOURS: Record<Module, TourStep[]> = {
  COMERCIAL: comercialSteps,
  MANTENCION: mantencionSteps,
  OPERACION: operacionSteps,
};

/** Pasos del tour para un módulo dado. */
export function getTourSteps(module: Module): TourStep[] {
  return TOURS[module];
}

/** Prefijo de la clave de localStorage que marca el tour como visto. */
export const TOUR_SEEN_PREFIX = "solterra-tour-";

export function tourSeenKey(module: Module): string {
  return `${TOUR_SEEN_PREFIX}${module}`;
}
