"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/portal/ConfirmDialog";
import { deleteQuotation } from "./actions";

interface Props {
  id:     string;
  numero: string;
  /** Estilo del disparador: ícono compacto (tablas) o botón full (cards móvil). */
  variant?: "icon" | "button";
}

/**
 * Elimina una cotización (BORRADOR o ANULADA) con confirmación. El gate visual
 * lo decide el llamador (no se renderiza para EMITIDA); el check real vive en
 * deleteQuotation. Al éxito refresca la lista.
 */
export default function DeleteQuotationButton({ id, numero, variant = "icon" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteQuotation(id);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar la cotización.");
      }
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => { setError(null); setOpen(true); }}
          title="Eliminar cotización"
          aria-label={`Eliminar cotización ${numero}`}
          className="p-1.5 rounded-md text-gray-400 hover:text-[#c6352e] hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => { setError(null); setOpen(true); }}
          aria-label={`Eliminar cotización ${numero}`}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#c6352e] border border-red-200 rounded-md hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </button>
      )}

      <ConfirmDialog
        open={open}
        onOpenChange={(v) => { if (!isPending) setOpen(v); }}
        title="Eliminar cotización"
        description={
          error
            ? error
            : `Vas a eliminar la cotización ${numero}. Esta acción es irreversible. El correlativo no se renumera: el número quedará disponible como hueco histórico.`
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirm}
        loading={isPending}
      />
    </>
  );
}
