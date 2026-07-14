"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, BookOpen, Lightbulb, ArrowRight, Sparkles } from "lucide-react";
import { getHelpEntry } from "@/lib/help-content";
import { moduleForPath } from "@/lib/modules";
import { startTour } from "@/components/portal/AppTour";

// Ruta de la guía de uso completa según el módulo de la pantalla actual.
const GUIA_HREF: Record<ReturnType<typeof moduleForPath>, string> = {
  COMERCIAL: "/ayuda",
  MANTENCION: "/mantencion/ayuda",
  OPERACION: "/operacion/ayuda",
};

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
}

export default function HelpPanel({ open, onClose, pathname }: HelpPanelProps) {
  const entry = getHelpEntry(pathname);
  const currentModule = moduleForPath(pathname);

  // Cierra el panel y luego lanza el tour: el spotlight necesita ver el DOM
  // de la pantalla, que este panel cubre con su overlay.
  const handleStartTour = () => {
    onClose();
    // Esperar a que el panel se desmonte antes de iniciar el spotlight.
    setTimeout(() => {
      void startTour(currentModule);
    }, 260);
  };

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Bloquear scroll del body mientras el panel está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      {/* Overlay sólido sobre toda la app */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[200] bg-slate-900/40 animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Panel lateral — sólido, alto z-index, sin transparencia */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Panel de ayuda"
        className="fixed inset-y-0 right-0 z-[201] flex flex-col w-full sm:w-[420px] bg-white shadow-2xl border-l border-gray-200 animate-in slide-in-from-right duration-200"
      >
        {/* Franja de acento superior */}
        <div className="h-1 w-full bg-[#253158] flex-shrink-0" />

        {/* Cabecera */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="h-8 w-8 rounded-lg bg-[#253158]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <BookOpen className="h-4 w-4 text-[#253158]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[#253158] leading-tight">
              {entry ? entry.titulo : "Ayuda"}
            </h2>
            {entry && (
              <p className="text-sm text-gray-500 leading-snug mt-0.5">
                {entry.descripcion}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de ayuda"
            className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cuerpo con scroll interno */}
        {entry ? (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* Para qué sirve */}
            <section>
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Para qué sirve
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {entry.paraQueSirve}
              </p>
            </section>

            <div className="border-t border-gray-100" />

            {/* Pasos básicos */}
            <section>
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Pasos básicos
              </h3>
              <ol className="space-y-3">
                {entry.pasos.map((paso, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-[#253158] text-white text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-600 leading-relaxed">
                      {paso}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            {entry.consejos.length > 0 && (
              <>
                <div className="border-t border-gray-100" />

                {/* Consejos */}
                <section>
                  <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Consejos
                  </h3>
                  <ul className="space-y-3">
                    {entry.consejos.map((consejo, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Lightbulb className="flex-shrink-0 mt-0.5 h-4 w-4 text-amber-500" />
                        <span className="text-sm text-gray-600 leading-relaxed">
                          {consejo}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center px-6 py-16">
            <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
              <BookOpen className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              Sin ayuda disponible
            </p>
            <p className="text-xs text-gray-400">
              No hay contenido de ayuda para esta página.
            </p>
          </div>
        )}

        {/* Footer fijo: iniciar tour + enlace a la guía completa del módulo actual */}
        <div className="flex-shrink-0 border-t border-gray-100 px-5 py-3.5 space-y-2.5">
          <button
            type="button"
            onClick={handleStartTour}
            className="flex w-full items-center justify-between gap-2 rounded-lg bg-[#253158] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e305e]"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              Iniciar tour guiado
            </span>
            <ArrowRight className="h-4 w-4 flex-shrink-0" />
          </button>
          <Link
            href={GUIA_HREF[currentModule]}
            onClick={onClose}
            className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#253158] transition-colors hover:border-[#253158] hover:bg-[#253158]/5"
          >
            Ver guía de uso completa
            <ArrowRight className="h-4 w-4 flex-shrink-0" />
          </Link>
        </div>
      </aside>
    </>,
    document.body
  );
}
