"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/portal/ConfirmDialog";
import { deactivateSupplier } from "../actions";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

interface Props {
  supplierId: string;
  supplierName: string;
}

export default function ProveedorActions({ supplierId, supplierName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDeactivate() {
    setLoading(true);
    try {
      await deactivateSupplier(supplierId);
      router.push("/proveedores");
    } catch {
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
        <XCircle className="h-4 w-4" />
        Desactivar Proveedor
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Desactivar proveedor?"
        description={`"${supplierName}" dejará de aparecer en la lista de proveedores activos. Podrás reactivarlo editando el registro directamente en base de datos.`}
        confirmLabel="Sí, desactivar"
        onConfirm={handleDeactivate}
        loading={loading}
      />
    </>
  );
}
