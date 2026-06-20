"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Island de auto-actualización para listas "vivas" (partes, checklists).
 * Refresca el RSC cada `intervalMs` SOLO cuando la pestaña está visible,
 * y al volver a primer plano. No renderiza nada.
 *
 * Requisito: la query de la lista NO debe estar bajo `unstable_cache`, o
 * `router.refresh()` devolvería el snapshot cacheado (ver getPartes/getChecklists).
 */
export default function AutoRefresh({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, intervalMs);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh(); // refresco inmediato al volver a foco
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
