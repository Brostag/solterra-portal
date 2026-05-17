"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/portal/ConfirmDialog";
import { UserX } from "lucide-react";

interface ClienteActionsProps {
  clientId: string;
  deactivate: (id: string) => Promise<void>;
}

export default function ClienteActions({ clientId, deactivate }: ClienteActionsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDeactivate() {
    setLoading(true);
    try {
      await deactivate(clientId);
    } catch {
      // error handled silently; button re-enables via finally
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-[#c6352e] border-[#c6352e] hover:bg-red-50 gap-2"
      >
        <UserX className="h-4 w-4" />
        Desactivar
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Desactivar cliente?"
        description="El cliente quedará inactivo. Esta acción no elimina el registro ni sus facturas asociadas."
        confirmLabel="Sí, desactivar"
        variant="destructive"
        onConfirm={handleDeactivate}
        loading={loading}
      />
    </>
  );
}
