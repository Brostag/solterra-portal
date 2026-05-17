"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/portal/ConfirmDialog";
import { PackageX } from "lucide-react";

interface ProductoActionsProps {
  productId: string;
  deactivate: (id: string) => Promise<void>;
}

export default function ProductoActions({ productId, deactivate }: ProductoActionsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDeactivate() {
    setLoading(true);
    try {
      await deactivate(productId);
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
        <PackageX className="h-4 w-4" />
        Desactivar
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Desactivar producto?"
        description="El producto quedará inactivo y no aparecerá al crear nuevas facturas. El historial existente no se modifica."
        confirmLabel="Sí, desactivar"
        variant="destructive"
        onConfirm={handleDeactivate}
        loading={loading}
      />
    </>
  );
}
