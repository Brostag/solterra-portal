"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/portal/ConfirmDialog";
import { deleteChecklistMantencion } from "@/app/(operativo)/mantencion/checklist-mantencion/actions";

// Botón de solo ícono para la columna "Acciones" del listado de check list de
// mantenimiento. La fila no es clickeable (a diferencia de otros listados de
// Mantención), así que no hace falta stopPropagation.
export default function EliminarChecklistMantButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        // No redirige: se llama desde el propio listado. En error devuelve { error }.
        const res = await deleteChecklistMantencion(id);
        if (res?.error) {
          setError(res.error);
          return;
        }
        setOpen(false);
      } catch {
        // La action puede RECHAZAR en vez de devolver { error }: requireModule
        // lanza, y en terreno la conexión se cae a media llamada. Sin este
        // catch el diálogo queda abierto sin mensaje y el usuario reintenta a
        // ciegas.
        setError(
          "No se pudo completar la acción. Revisa tu conexión e intenta nuevamente.",
        );
      }
    });
  }

  return (
    <div className="inline-flex">
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        title="Eliminar"
        aria-label="Eliminar check list de mantenimiento"
        className="rounded-lg p-1.5 text-[#c6352e] transition hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Eliminar check list de mantenimiento"
        description="Esta acción no se puede deshacer. El documento dejará de listarse pero su número no se reutiliza."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleConfirm}
        loading={pending}
        error={error}
      />
    </div>
  );
}
