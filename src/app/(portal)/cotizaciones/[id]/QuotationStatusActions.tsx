"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Pencil, Ban, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/portal/ConfirmDialog";
import { emitirCotizacion, anularCotizacion, deleteQuotation } from "../actions";

type EstadoCotizacion = "BORRADOR" | "EMITIDA" | "ANULADA";

interface Props {
  id: string;
  numero: string;
  estado: EstadoCotizacion;
  canManage: boolean;
}

type DialogKind = "anular" | "eliminar" | null;

// Acciones de estado del detalle. Según estado y rol:
//  BORRADOR → Editar · Emitir · Eliminar
//  EMITIDA  → Anular
//  ANULADA  → Eliminar
// Los gates aquí son visuales; los checks reales viven en las server actions.
export default function QuotationStatusActions({ id, numero, estado, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);

  if (!canManage) return null;

  function handleEmitir() {
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

  function handleAnular() {
    setError(null);
    startTransition(async () => {
      try {
        await anularCotizacion(id);
        setDialog(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo anular la cotización.");
      }
    });
  }

  function handleEliminar() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteQuotation(id);
        setDialog(null);
        router.push("/cotizaciones");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar la cotización.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2 justify-end">
        {estado === "BORRADOR" && (
          <Link href={`/cotizaciones/${id}/editar`}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2 border-[#253158]/30 text-[#253158] hover:bg-[#253158]/5"
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
          </Link>
        )}

        {estado === "BORRADOR" && (
          <Button
            type="button"
            size="sm"
            onClick={handleEmitir}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white gap-2 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">{isPending ? "Emitiendo…" : "Emitir cotización"}</span>
            <span className="sm:hidden">{isPending ? "…" : "Emitir"}</span>
          </Button>
        )}

        {estado === "EMITIDA" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => { setError(null); setDialog("anular"); }}
            disabled={isPending}
            className="gap-2 border-[#c6352e]/40 text-[#c6352e] hover:bg-red-50 disabled:opacity-60"
          >
            <Ban className="h-4 w-4" />
            <span className="hidden sm:inline">Anular</span>
          </Button>
        )}

        {estado !== "EMITIDA" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => { setError(null); setDialog("eliminar"); }}
            disabled={isPending}
            className="gap-2 border-[#c6352e]/40 text-[#c6352e] hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Eliminar</span>
          </Button>
        )}
      </div>

      {error && <span className="text-xs text-red-500 max-w-[240px] text-right">{error}</span>}

      <ConfirmDialog
        open={dialog === "anular"}
        onOpenChange={(v) => { if (!isPending) setDialog(v ? "anular" : null); }}
        title="Anular cotización"
        description={`Vas a anular la cotización ${numero}. Queda el registro, pero no podrá volver a emitirse.`}
        confirmLabel="Anular"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleAnular}
        loading={isPending}
      />

      <ConfirmDialog
        open={dialog === "eliminar"}
        onOpenChange={(v) => { if (!isPending) setDialog(v ? "eliminar" : null); }}
        title="Eliminar cotización"
        description={`Vas a eliminar la cotización ${numero}. Esta acción es irreversible. El correlativo no se renumera: el número quedará disponible como hueco histórico.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleEliminar}
        loading={isPending}
      />
    </div>
  );
}
