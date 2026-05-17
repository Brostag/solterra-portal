"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/portal/ConfirmDialog";
import { UserX } from "lucide-react";

interface Props {
  userId: string;
  userName: string;
  deactivate: (id: string) => Promise<void>;
}

export default function UsuarioActions({ userId, userName, deactivate }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await deactivate(userId);
    } catch {
      // error handled silently; button re-enables via finally
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <div className="border-t pt-4">
        <Button
          variant="outline"
          className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
          onClick={() => setOpen(true)}
        >
          <UserX className="h-4 w-4" />
          Desactivar usuario
        </Button>
      </div>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Desactivar usuario?"
        description={`${userName} perderá el acceso al sistema. Esta acción se puede revertir editando el usuario.`}
        confirmLabel="Sí, desactivar"
        variant="destructive"
        onConfirm={handleConfirm}
        loading={loading}
      />
    </>
  );
}
