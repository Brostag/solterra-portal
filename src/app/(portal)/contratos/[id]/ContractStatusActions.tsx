"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marcarContratoVigente } from "../actions";

type EstadoContrato = "BORRADOR" | "VIGENTE" | "FINALIZADO" | "ANULADO";

interface Props {
  id: string;
  estado: EstadoContrato;
  canManage: boolean;
}

// Botón de transición BORRADOR → VIGENTE. Solo se muestra a ADMIN/SUPERVISOR y
// solo cuando el contrato está en BORRADOR. El resto de estados no exponen
// acción (el badge de estado lo renderiza la página servidor).
export default function ContractStatusActions({ id, estado, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canManage || estado !== "BORRADOR") return null;

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await marcarContratoVigente(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch sm:items-end gap-1 w-full sm:w-auto">
      <Button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="bg-green-600 hover:bg-green-700 text-white gap-2 min-h-[44px] w-full sm:w-auto disabled:opacity-60"
      >
        <CheckCircle2 className="h-4 w-4" />
        <span>{isPending ? "Guardando…" : "Marcar como vigente"}</span>
      </Button>
      {error && <span className="text-xs text-red-500 max-w-[200px] text-right">{error}</span>}
    </div>
  );
}
