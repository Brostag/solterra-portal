"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import type { Module } from "@/lib/modules";
import { getTourSteps, tourSeenKey, type TourStep } from "@/lib/tour/tours";

// Ancho mínimo para lanzar el tour automáticamente. Bajo esto (móvil) el
// sidebar y varios anclas están ocultos, así que el auto-inicio no aplica.
const DESKTOP_MIN_WIDTH = 768;

/** ¿El ancla existe y está visible en el DOM actual? Un elemento presente pero
 *  oculto (display:none, sin layout, o fuera de pantalla por transform como el
 *  sidebar en móvil) no sirve como spotlight: mejor omitir ese paso. */
function isElementUsable(selector: string): boolean {
  if (typeof document === "undefined") return false;
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

/** Deja solo los pasos utilizables: los de bienvenida/cierre (sin element) y
 *  los cuyo ancla exista y esté visible. Así el tour degrada limpio en móvil
 *  o cuando una pantalla no tiene todas las secciones. */
function usableSteps(steps: TourStep[]): TourStep[] {
  return steps.filter((s) => !s.element || isElementUsable(s.element));
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

  const [{ driver }] = await Promise.all([
    import("driver.js"),
    import("driver.js/dist/driver.css"),
    import("./app-tour.css"),
  ]);

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
 * Isla que inicia el tour automáticamente en la primera visita de escritorio.
 * Render null. Se monta al final del JSX de los dashboards (server components).
 */
export function AppTourAutoStart({ module }: TourModuleProps) {
  const launched = useRef(false);

  useEffect(() => {
    // Guard de doble ejecución (React StrictMode monta el efecto dos veces).
    if (launched.current) return;

    if (typeof window === "undefined") return;
    if (window.innerWidth < DESKTOP_MIN_WIDTH) return;

    let seen = false;
    try {
      seen = localStorage.getItem(tourSeenKey(module)) !== null;
    } catch {
      // Sin localStorage: no auto-iniciamos para no repetir en cada carga.
      seen = true;
    }
    if (seen) return;

    launched.current = true;

    // Esperar un frame para que el DOM (KPIs, listas) esté montado y medible.
    const raf = requestAnimationFrame(() => {
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
      <Sparkles className="h-4 w-4 flex-shrink-0" />
      Iniciar tour
    </button>
  );
}
