"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/portal/ConfirmDialog";
import { deleteChecklist } from "@/app/(operativo)/operacion/checklists/actions";

// Botón de solo ícono para la columna "Acciones" del listado de checklists
// pre-operacionales. La fila completa navega al detalle (onClick en <tr>),
// así que stopPropagation evita que abrir el diálogo también dispare esa
// navegación.
export default function EliminarChecklistButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await deleteChecklist(id);
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
    <div className="inline-flex" onClick={(ev) => ev.stopPropagation()}>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        title="Eliminar"
        aria-label="Eliminar checklist"
        className="rounded-lg p-1.5 text-[#c6352e] transition hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Eliminar checklist"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleConfirm}
        loading={pending}
        error={error}
      />
    </div>
  );
}
