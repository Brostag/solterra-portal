"use client";

// Hook común de borradores para los formularios de terreno — Nivel 1 offline.
// Aporta la parte compartida (persistencia Dexie, debounce, expiración,
// restaurar, limpiar); cada formulario aporta buildSnapshot/applySnapshot.
// Ver docs/offline-design.md §2. Best-effort: si IndexedDB no está disponible
// (modo privado, navegador antiguo), el formulario sigue funcionando igual.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteDraft,
  draftId,
  getDraft,
  putDraft,
  sweepExpiredDrafts,
  type DraftFormType,
} from "./drafts-db";

const DEFAULT_DEBOUNCE_MS = 800;

export interface UseDraftOptions<TSnapshot> {
  formType: DraftFormType;
  /** Estable por sesión de captura. Default "nuevo" (un borrador por formulario). */
  draftKey?: string;
  /** Profile id de la sesión: solo se restaura el borrador del mismo usuario. */
  userId: string;
  /** false = hook inactivo (p. ej. modo edición; los borradores son create-only). */
  enabled?: boolean;
  /**
   * null = snapshot no disponible en este instante (p. ej. el <form> ya fue
   * desmontado y su ref está desconectada) → NO se guarda, para no
   * sobreescribir un borrador bueno con uno degradado.
   */
  buildSnapshot: () => TSnapshot | null;
  applySnapshot: (snapshot: TSnapshot) => void;
  /** Estados controlados que gatillan autosave al cambiar (además de notifyChange). */
  watch?: unknown[];
  debounceMs?: number;
}

export interface UseDraftResult {
  /** Hay un borrador pendiente de decisión → mostrar banner. */
  hasDraft: boolean;
  /** updatedAt (epoch ms) del borrador ofrecido, para el texto del banner. */
  draftSavedAt: number | null;
  restoreDraft: () => void;
  discardDraft: () => void;
  /**
   * Llamar al iniciar el submit. Si el server action termina en redirect()
   * (éxito), su promesa no se resuelve en el cliente (Next 15): el desmontaje
   * del formulario durante un submit sin error es la confirmación de éxito y
   * ahí se borra el borrador. Si el action devuelve { error }, llamar
   * submitFailed() para conservarlo y reactivar el autosave.
   */
  beginSubmit: () => void;
  /** El envío falló: el borrador se conserva y el autosave sigue activo. */
  submitFailed: () => void;
  /** Conectar a <form onChange> para capturar campos no controlados. */
  notifyChange: () => void;
}

export function useDraft<TSnapshot>({
  formType,
  draftKey = "nuevo",
  userId,
  enabled = true,
  buildSnapshot,
  applySnapshot,
  watch = [],
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseDraftOptions<TSnapshot>): UseDraftResult {
  const id = draftId(formType, draftKey);

  const [pending, setPending] = useState<{ payload: TSnapshot; updatedAt: number } | null>(null);

  // Refs para que el debounce siempre use el closure más reciente.
  const buildRef = useRef(buildSnapshot);
  const applyRef = useRef(applySnapshot);
  buildRef.current = buildSnapshot;
  applyRef.current = applySnapshot;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearedRef = useRef(false); // tras envío exitoso no se vuelve a guardar
  const submittingRef = useRef(false); // hay un submit en vuelo sin error
  const interactedRef = useRef(false); // el usuario ya editó en esta visita
  // Serialización del último watch guardado: distingue cambios reales del
  // usuario de re-ejecuciones del effect (p. ej. doble mount de StrictMode).
  const lastWatchSerRef = useRef<string | null>(null);

  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!enabled || clearedRef.current || submittingRef.current) return;
    const payload = buildRef.current();
    if (payload === null) return; // snapshot no disponible: no degradar el borrador
    void putDraft({
      id,
      formType,
      payload,
      updatedAt: Date.now(),
      userId,
    }).catch(() => {
      // Best-effort: sin IndexedDB el formulario sigue online normal.
    });
  }, [enabled, id, formType, userId]);

  const notifyChange = useCallback(() => {
    if (!enabled || clearedRef.current || submittingRef.current) return;
    interactedRef.current = true;
    // Si el usuario empieza a escribir sin decidir sobre el banner, se asume
    // que parte de cero: el autosave sobreescribe el borrador anterior.
    setPending(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveNow, debounceMs);
  }, [enabled, debounceMs, saveNow]);

  // Autosave por cambios de estado controlado (secciones SÍ/NO/NA, ítems, etc.).
  // `watch` ES la lista de dependencias por contrato del hook. La comparación
  // serializada evita el autosave espurio del doble mount de StrictMode (dev).
  useEffect(() => {
    const ser = JSON.stringify(watch);
    if (lastWatchSerRef.current === ser) return; // sin cambio real
    const esPrimera = lastWatchSerRef.current === null;
    lastWatchSerRef.current = ser;
    if (!esPrimera) notifyChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, watch);

  // Al montar: barrido de expirados y oferta de restauración (solo mismo usuario).
  useEffect(() => {
    if (!enabled) return;
    let activo = true;
    void (async () => {
      try {
        await sweepExpiredDrafts();
        const registro = await getDraft(id);
        if (!activo || !registro || registro.userId !== userId) return;
        if (typeof registro.payload !== "object" || registro.payload === null) {
          void deleteDraft(id).catch(() => {}); // registro corrupto: auto-sanear
          return;
        }
        if (interactedRef.current) return; // el usuario ya empezó de cero
        setPending({ payload: registro.payload as TSnapshot, updatedAt: registro.updatedAt });
      } catch {
        // Best-effort: sin IndexedDB no hay borradores, no se rompe el form.
      }
    })();
    return () => {
      activo = false;
    };
  }, [enabled, id, userId]);

  // Flush inmediato si la pestaña se oculta o cierra con un guardado pendiente
  // (cierre de app en terreno: no esperar los 800 ms del debounce).
  useEffect(() => {
    if (!enabled) return;
    const flush = () => {
      if (timerRef.current) saveNow();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      if (submittingRef.current) {
        // Desmontaje con submit en vuelo y sin error = redirect() del action
        // exitoso (su promesa no se resuelve en el cliente): borrar el borrador.
        clearedRef.current = true;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        void deleteDraft(id).catch(() => {});
      } else {
        // Desmontaje por navegación normal: intentar no perder el último
        // cambio. saveNow salta el put si el snapshot ya no está disponible.
        flush();
      }
    };
  }, [enabled, saveNow, id]);

  const restoreDraft = useCallback(() => {
    if (!pending) return;
    try {
      applyRef.current(pending.payload);
    } catch {
      // Borrador incompatible/corrupto: se elimina para no bloquear el form.
      void deleteDraft(id).catch(() => {});
    }
    setPending(null);
  }, [pending, id]);

  const discardDraft = useCallback(() => {
    setPending(null);
    void deleteDraft(id).catch(() => {});
  }, [id]);

  const beginSubmit = useCallback(() => {
    submittingRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const submitFailed = useCallback(() => {
    submittingRef.current = false;
    // Re-agendar un guardado: el estado actual (el que falló) sigue vigente.
    timerRef.current = setTimeout(saveNow, debounceMs);
  }, [saveNow, debounceMs]);

  return {
    hasDraft: pending !== null,
    draftSavedAt: pending?.updatedAt ?? null,
    restoreDraft,
    discardDraft,
    beginSubmit,
    submitFailed,
    notifyChange,
  };
}
