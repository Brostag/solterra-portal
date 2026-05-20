"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/portal/ConfirmDialog";
import { deactivateUser } from "./actions";

interface Props {
  userId:    string;
  userLabel: string;
}

export default function EliminarUsuarioButton({ userId, userLabel }: Props) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await deactivateUser(userId);
      setOpen(false);
    } catch {
      // El botón no se renderiza en la fila del propio usuario, así que el
      // error de auto-eliminación no llega por UI. Ante otros fallos el botón
      // se re-habilita para reintentar.
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Eliminar usuario ${userLabel}`}
        className="p-1.5 rounded-md text-gray-400 hover:text-[#c6352e] hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Eliminar usuario"
        description={`Esta acción eliminará o desactivará el acceso de ${userLabel}. ¿Deseas continuar?`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirm}
        loading={loading}
      />
    </>
  );
}
