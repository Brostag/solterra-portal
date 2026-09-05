// Definición de los tours guiados (spotlight paso a paso) por módulo.
//
// Contenido en español de Chile, corto y verificado contra las pantallas
// reales del portal. Complementa —no reemplaza— las guías de uso completas
// (/ayuda, /mantencion/ayuda, /operacion/ayuda).
//
// Cada `element` es un selector CSS que apunta a un ancla `data-tour="..."`
// del DOM real. Los pasos SIN `element` se muestran como modal centrado
// (bienvenida / cierre). AppTour.usableSteps() resuelve cada paso antes de
// armar el tour:
//   - element presente y en viewport → spotlight normal.
//   - element ausente del viewport horizontal (sidebar móvil cerrado) +
//     fallbackCentered: true → popover centrado sin spotlight.
//   - element ausente del viewport horizontal sin fallback → paso descartado.
//   - element bajo el fold → driver.js lo scrollea a la vista (no se filtra).
//
// Para el sidebar hay dos pasos gemelos: uno apunta a '[data-tour="sidebar-nav"]'
// (el <nav> del sidebar, visible solo en desktop), el otro a
// '[data-tour="menu-toggle"]' (el botón hamburguesa del Topbar, visible solo
// en móvil). isElementUsable() descarta el que no aplique en cada pantalla.

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
  /**
   * Si el ancla no está usable (p. ej. elemento de sidebar fuera del viewport
   * horizontal en móvil), en vez de descartar el paso se muestra como modal
   * centrado sin element. Útil para pasos de ítems del sidebar que solo son
   * visibles en desktop.
   */
  fallbackCentered?: boolean;
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
  // Paso gemelo para móvil: apunta al botón hamburguesa (lg:hidden en Topbar).
  // En desktop el hamburguesa no está en pantalla → isElementUsable() lo filtra.
  // En móvil el sidebar-nav está fuera del viewport horizontal → se filtra allá.
  // Así nunca se muestran los dos al mismo tiempo.
  {
    element: '[data-tour="menu-toggle"]',
    title: "Menú de navegación",
    description:
      "Toca este botón para abrir el menú. Desde ahí llegas a Contratos, Empresas, Servicios, Documentos, Órdenes de Compra, Cotizador y Cotizaciones.",
    side: "bottom",
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
    element: '[data-tour="feedback-button"]',
    title: "Reportar un problema",
    description:
      "Si algo falla o quieres sugerir una mejora, usa este botón. Puedes capturar la pantalla, marcar dónde está el problema y el reporte llega al equipo técnico.",
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
  // Paso gemelo para móvil: apunta al botón hamburguesa (lg:hidden en Topbar).
  {
    element: '[data-tour="menu-toggle"]',
    title: "Menú de navegación",
    description:
      "Toca este botón para abrir el menú. Desde ahí entras a Equipos, Taller, Planes, Check List, Certificado, Vencimientos y Reportes.",
    side: "bottom",
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
    // «Planes» es un ítem del sidebar (/mantencion/planes). En desktop apunta
    // al enlace en el sidebar abierto. En móvil el sidebar está cerrado fuera
    // del viewport horizontal, así que fallbackCentered lo muestra centrado.
    element: '[data-tour="planes"]',
    title: "El flujo en 3 pasos",
    description:
      "El ciclo es: 1) Registro de entrada en Operación, 2) crear el Plan (A según fabricante, B preventivo, C correctivo) en «Planes» del menú, y 3) generar la Orden de Trabajo hacia el Taller.",
    side: "right",
    align: "center",
    fallbackCentered: true,
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
    element: '[data-tour="feedback-button"]',
    title: "Reportar un problema",
    description:
      "Si algo falla o quieres sugerir una mejora, usa este botón. Puedes capturar la pantalla, marcar dónde está el problema y el reporte llega al equipo técnico.",
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
      "Te mostramos lo esencial en un minuto: el control diario del equipo en terreno con órdenes de trabajo y checklists. Puedes salir cuando quieras con la X o la tecla Esc.",
  },
  {
    element: '[data-tour="sidebar-nav"]',
    title: "Menú de navegación",
    description:
      "Desde aquí llegas a Órdenes de Trabajo y a Checklists. Los equipos se gestionan en Mantención; aquí solo los seleccionas.",
    side: "right",
    align: "start",
  },
  // Paso gemelo para móvil: apunta al botón hamburguesa (lg:hidden en Topbar).
  {
    element: '[data-tour="menu-toggle"]',
    title: "Menú de navegación",
    description:
      "Toca este botón para abrir el menú. Desde ahí llegas a Órdenes de Trabajo y a Checklists.",
    side: "bottom",
    align: "start",
  },
  {
    element: '[data-tour="kpis"]',
    title: "Tu día de un vistazo",
    description:
      "Equipos totales y activos, equipos en mantención, y las órdenes de trabajo y checklists de hoy. Haz clic en una tarjeta para ir a esa lista.",
    side: "bottom",
    align: "center",
  },
  {
    element: '[data-tour="acciones"]',
    title: "Acciones rápidas",
    description:
      "Las dos acciones del día: «Nueva orden de trabajo» documenta el ingreso y la salida del equipo del taller y «Nuevo checklist» deja la inspección pre-operacional.",
    side: "bottom",
    align: "center",
  },
  {
    element: '[data-tour="listas"]',
    title: "Actividad reciente",
    description:
      "Las últimas órdenes de trabajo y checklists del equipo, con su estado. Una orden de trabajo queda Pendiente hasta que el supervisor la revise.",
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
    element: '[data-tour="feedback-button"]',
    title: "Reportar un problema",
    description:
      "Si algo falla en terreno o quieres sugerir una mejora, usa este botón. Puedes capturar la pantalla, marcar dónde está el problema y el reporte llega al equipo técnico.",
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
