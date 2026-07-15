"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import type { Module } from "@/lib/modules";
import { getTourSteps, tourSeenKey, type TourStep } from "@/lib/tour/tours";

/** ¿El ancla existe y está visible en el DOM actual?
 *
 *  Descarta un elemento si:
 *  - No existe en el DOM.
 *  - No tiene dimensiones (display:none, visibility:hidden, sin layout).
 *  - Está fuera del viewport HORIZONTAL (rect.right <= 0 o rect.left >=
 *    window.innerWidth). El caso más común es el sidebar en móvil: usa
 *    "-translate-x-full" y getBoundingClientRect() devuelve right <= 0 aunque
 *    width > 0. El portal no tiene scroll horizontal, por lo que un elemento
 *    fuera de ese eje jamás es visible para el usuario.
 *
 *  NO filtra por posición vertical: elementos bajo el fold son legítimos
 *  porque driver.js los scrollea automáticamente a la vista. */
function isElementUsable(selector: string): boolean {
  if (typeof document === "undefined") return false;
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  // Descarta elementos fuera del viewport horizontal (p. ej. sidebar móvil cerrado).
  if (rect.right <= 0 || rect.left >= window.innerWidth) return false;
  return true;
}

/** Resuelve los pasos utilizables para el contexto de pantalla actual:
 *
 *  - Pasos sin `element` (bienvenida/cierre): se pasan tal cual (popover centrado).
 *  - Pasos con `element` usable: se pasan tal cual.
 *  - Pasos con `element` NO usable y `fallbackCentered: true`: se pasan SIN
 *    `element` — driver.js los muestra como modal centrado. Útil para pasos que
 *    apuntan a ítems del sidebar que en móvil están fuera de pantalla.
 *  - Pasos con `element` NO usable sin fallback: se descartan.
 *
 *  Inmutable: nunca muta el array ni los objetos originales. */
function usableSteps(steps: TourStep[]): TourStep[] {
  return steps.flatMap((s) => {
    if (!s.element) return [s];
    if (isElementUsable(s.element)) return [s];
    if (s.fallbackCentered) {
      // Copia inmutable del paso, sin `element`, `side`, `align` ni `fallbackCentered`
      // (driver.js lo mostrará como modal centrado sin spotlight).
      return [{ title: s.title, description: s.description }];
    }
    return [];
  });
}

// Instancia activa a nivel de módulo: permite destruir un tour en curso si el
// usuario navega a otra página (los componentes la limpian al desmontar) o si
// se lanza un tour nuevo sobre uno abierto (overlay/listeners no quedan huérfanos).
let activeTour: { destroy: () => void } | null = null;

/** Destruye el tour activo si lo hay. Seguro de llamar siempre. */
export function destroyActiveTour(): void {
  if (activeTour) {
    const t = activeTour;
    activeTour = null;
    try {
      t.destroy();
    } catch {
      // Instancia ya destruida por driver.js: nada que hacer.
    }
  }
}

/**
 * Lanza el tour del módulo dado. Carga driver.js y su CSS de forma dinámica
 * (import()), por lo que nada de esto entra en el First Load JS de las páginas
 * que solo montan el lanzador. Marca el tour como visto al cerrarse.
 */
export async function startTour(module: Module): Promise<void> {
  const steps = usableSteps(getTourSteps(module));
  if (steps.length === 0) return;

  // Un tour a la vez: cierra cualquier instancia previa antes de abrir otra.
  destroyActiveTour();

  let driverModule: typeof import("driver.js");
  try {
    const [mod] = await Promise.all([
      import("driver.js"),
      import("driver.js/dist/driver.css"),
      import("./app-tour.css"),
    ]);
    driverModule = mod;
  } catch (error) {
    // Carga dinámica fallida (red caída, chunks viejos tras un deploy): el tour
    // es una ayuda opcional — se aborta sin romper la página, dejando rastro.
    console.error("No se pudo cargar driver.js para el tour", error);
    return;
  }
  const { driver } = driverModule;

  const markSeen = () => {
    try {
      localStorage.setItem(tourSeenKey(module), new Date().toISOString());
    } catch {
      // localStorage no disponible (modo privado, etc.): no es crítico.
    }
  };

  const instance = driver({
    showProgress: true,
    allowClose: true,
    stagePadding: 6,
    stageRadius: 8,
    overlayColor: "#0f172a", // slate-900, consistente con overlays del portal
    overlayOpacity: 0.55,
    popoverClass: "solterra-tour",
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Siguiente",
    prevBtnText: "Atrás",
    doneBtnText: "Listo",
    steps: steps.map((s) => ({
      element: s.element,
      popover: {
        title: s.title,
        description: s.description,
        side: s.side,
        align: s.align,
      },
    })),
    onDestroyed: () => {
      activeTour = null;
      markSeen();
    },
  });

  activeTour = instance;
  instance.drive();
}

interface TourModuleProps {
  module: Module;
}

/**
 * Isla que inicia el tour automáticamente en la primera visita (móvil y escritorio).
 * Render null. Se monta al final del JSX de los dashboards (server components).
 *
 * En móvil, los pasos que apuntan a anclas fuera del viewport horizontal (p. ej.
 * el sidebar cerrado) se filtran o degradan a centrado automáticamente mediante
 * isElementUsable() y el campo fallbackCentered de cada paso.
 */
export function AppTourAutoStart({ module }: TourModuleProps) {
  const launched = useRef(false);

  useEffect(() => {
    // Guard de doble arranque. Se marca DENTRO del rAF (no aquí): en dev,
    // StrictMode ejecuta setup → cleanup → setup antes de que dispare el frame;
    // si se marcara aquí, el cleanup cancelaría el rAF y el segundo setup haría
    // early-return, dejando el auto-inicio muerto en desarrollo.
    if (launched.current) return;

    let seen = false;
    try {
      seen = localStorage.getItem(tourSeenKey(module)) !== null;
    } catch {
      // Sin localStorage: no auto-iniciamos para no repetir en cada carga.
      seen = true;
    }
    if (seen) return;

    // Esperar un frame para que el DOM (KPIs, listas, sidebar) esté montado y medible.
    const raf = requestAnimationFrame(() => {
      launched.current = true;
      void startTour(module);
    });

    // Al desmontar (navegación client-side con el tour abierto), además de
    // cancelar el frame se destruye la instancia activa: sin overlay huérfano.
    return () => {
      cancelAnimationFrame(raf);
      destroyActiveTour();
    };
  }, [module]);

  return null;
}

interface TourButtonProps {
  module: Module;
  className?: string;
}

/**
 * Botón para lanzar el tour manualmente. Estilo outline consistente con los
 * CTAs secundarios del portal. Al lanzarlo también queda marcado como visto.
 */
export function TourButton({ module, className }: TourButtonProps) {
  return (
    <button
      type="button"
      onClick={() => void startTour(module)}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-[#253158] transition-colors hover:border-[#253158] hover:bg-[#253158]/5"
      }
    >
      <Sparkles aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
      Iniciar tour
    </button>
  );
}
