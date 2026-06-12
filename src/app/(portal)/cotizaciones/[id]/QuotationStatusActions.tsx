"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emitirCotizacion } from "../actions";

type EstadoCotizacion = "BORRADOR" | "EMITIDA" | "ANULADA";

interface Props {
  id: string;
  estado: EstadoCotizacion;
  canManage: boolean;
}

// Botón opcional BORRADOR → EMITIDA. Solo ADMIN/SUPERVISOR y solo en borrador.
export default function QuotationStatusActions({ id, estado, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canManage || estado !== "BORRADOR") return null;

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await emitirCotizacion(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo emitir la cotización.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="bg-green-600 hover:bg-green-700 text-white gap-2 disabled:opacity-60"
      >
        <CheckCircle2 className="h-4 w-4" />
        <span className="hidden sm:inline">{isPending ? "Emitiendo…" : "Emitir cotización"}</span>
        <span className="sm:hidden">{isPending ? "…" : "Emitir"}</span>
      </Button>
      {error && <span className="text-xs text-red-500 max-w-[220px] text-right">{error}</span>}
    </div>
  );
}
