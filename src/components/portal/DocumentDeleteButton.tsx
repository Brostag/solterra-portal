"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  docId:  string;
  nombre: string;
}

export default function DocumentDeleteButton({ docId, nombre }: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/documentos/${docId}`, { method: "DELETE" });
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 w-8 p-0 text-gray-400 hover:text-[#c6352e]"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Eliminar documento"
        description={`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleDelete}
        loading={loading}
      />
    </>
  );
}
