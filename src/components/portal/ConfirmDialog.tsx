"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  /**
   * Error a mostrar DENTRO del diálogo (por ejemplo, el { error } devuelto por
   * una server action bloqueada por una guarda). Opcional y aditiva: si no se
   * pasa, el diálogo se comporta exactamente igual que antes. El diálogo NO
   * se cierra solo porque haya error — quien lo usa decide cuándo cerrarlo
   * (normalmente solo en éxito).
   */
  error?: string | null;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
  loading = false,
  error = null,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, loading, onOpenChange]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const isDestructive = variant === "destructive";

  return createPortal(
    <>
      {/* Overlay */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[200] bg-slate-900/40 animate-in fade-in duration-150"
        onClick={() => { if (!loading) onOpenChange(false); }}
      />

      {/* Modal centrado */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
          {/* Franja de acento superior */}
          <div className={`h-1 w-full rounded-t-xl ${isDestructive ? "bg-[#c6352e]" : "bg-[#253158]"}`} />

          <div className="px-6 pt-5 pb-6">
            {/* Ícono + Título */}
            <div className="flex items-start gap-4 mb-3">
              <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${isDestructive ? "bg-red-50" : "bg-[#253158]/10"}`}>
                <AlertTriangle className={`h-5 w-5 ${isDestructive ? "text-[#c6352e]" : "text-[#253158]"}`} />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h2
                  id="confirm-dialog-title"
                  className="text-base font-semibold text-gray-900 leading-tight"
                >
                  {title}
                </h2>
              </div>
            </div>

            {/* Descripción */}
            <p
              id="confirm-dialog-description"
              className="text-sm text-gray-500 leading-relaxed ml-14"
            >
              {description}
            </p>

            {/* Error de la action (p.ej. una guarda que bloqueó el borrado).
                Dentro del diálogo para que nunca quede tapado ni recortado
                por el contenedor que abrió el diálogo. */}
            {error && (
              <p
                role="alert"
                className="ml-14 mt-3 text-sm font-medium text-[#c6352e]"
              >
                {error}
              </p>
            )}

            {/* Botones */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`h-9 px-4 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  isDestructive
                    ? "bg-[#c6352e] hover:bg-red-700"
                    : "bg-[#253158] hover:bg-[#1e2a4a]"
                }`}
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {loading ? "Procesando..." : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
