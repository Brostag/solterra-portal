"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ConfirmDialog from "@/components/portal/ConfirmDialog";
import { Send, CheckCircle, XCircle, Banknote, ThumbsDown } from "lucide-react";
import type { EstadoOC, Rol } from "@/types";

interface Props {
  ocId: string;
  estado: EstadoOC;
  rol: Rol;
  onChangeStatus: (id: string, estado: EstadoOC) => Promise<void>;
  onAnnul: (id: string, motivo: string) => Promise<void>;
}

type TargetStatus = Extract<EstadoOC, "EMITIDA" | "ENVIADA" | "APROBADA" | "RECHAZADA">;

const STATUS_LABELS: Record<TargetStatus, string> = {
  EMITIDA:   "Emitir",
  ENVIADA:   "Marcar como Enviada",
  APROBADA:  "Aprobar",
  RECHAZADA: "Rechazar",
};

const STATUS_ICONS: Record<TargetStatus, React.ReactNode> = {
  EMITIDA:   <Banknote className="h-4 w-4" />,
  ENVIADA:   <Send className="h-4 w-4" />,
  APROBADA:  <CheckCircle className="h-4 w-4" />,
  RECHAZADA: <ThumbsDown className="h-4 w-4" />,
};

const STATUS_STYLES: Record<TargetStatus, string> = {
  EMITIDA:   "border-blue-400 text-blue-700 hover:bg-blue-50",
  ENVIADA:   "border-indigo-400 text-indigo-700 hover:bg-indigo-50",
  APROBADA:  "bg-green-600 hover:bg-green-700 text-white",
  RECHAZADA: "border-red-400 text-[#c6352e] hover:bg-red-50",
};

// Transitions allowed per state — mirrors server-side logic for UI display
const ALLOWED_TRANSITIONS: Record<string, { to: TargetStatus; minRol: "SUPERVISOR" | "ADMINISTRADOR" }[]> = {
  BORRADOR:  [{ to: "EMITIDA",   minRol: "SUPERVISOR" }],
  EMITIDA:   [{ to: "ENVIADA",   minRol: "SUPERVISOR" }],
  ENVIADA:   [
    { to: "APROBADA",  minRol: "ADMINISTRADOR" },
    { to: "RECHAZADA", minRol: "ADMINISTRADOR" },
  ],
};

function rolLevel(rol: Rol): number {
  return rol === "ADMINISTRADOR" ? 2 : rol === "SUPERVISOR" ? 1 : 0;
}

export default function OCActions({ ocId, estado, rol, onChangeStatus, onAnnul }: Props) {
  const [confirmStatus, setConfirmStatus] = useState<TargetStatus | null>(null);
  const [annulOpen, setAnnulOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState("");
  const [loading, setLoading] = useState(false);

  const transitions = (ALLOWED_TRANSITIONS[estado] ?? []).filter(
    (t) => rolLevel(rol) >= rolLevel(t.minRol as Rol)
  );
  const canAnnul = rol === "ADMINISTRADOR" && estado !== "ANULADA";

  async function handleStatusConfirm() {
    if (!confirmStatus) return;
    setLoading(true);
    try {
      await onChangeStatus(ocId, confirmStatus);
    } finally {
      setLoading(false);
      setConfirmStatus(null);
    }
  }

  async function handleAnnulConfirm() {
    if (motivo.trim().length < 5) {
      setMotivoError("El motivo debe tener al menos 5 caracteres");
      return;
    }
    setMotivoError("");
    setLoading(true);
    try {
      await onAnnul(ocId, motivo.trim());
    } finally {
      setLoading(false);
      setAnnulOpen(false);
    }
  }

  if (transitions.length === 0 && !canAnnul) return null;

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {transitions.map((t) => (
          <Button
            key={t.to}
            variant={t.to === "APROBADA" ? "default" : "outline"}
            className={`gap-2 ${STATUS_STYLES[t.to]}`}
            onClick={() => setConfirmStatus(t.to)}
          >
            {STATUS_ICONS[t.to]}
            {STATUS_LABELS[t.to]}
          </Button>
        ))}

        {canAnnul && (
          <Button
            variant="outline"
            className="gap-2 border-red-300 text-[#c6352e] hover:bg-red-50"
            onClick={() => setAnnulOpen(true)}
          >
            <XCircle className="h-4 w-4" />
            Anular OC
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmStatus !== null}
        onOpenChange={(open) => { if (!open) setConfirmStatus(null); }}
        title={confirmStatus ? `¿${STATUS_LABELS[confirmStatus]}?` : ""}
        description={
          confirmStatus === "RECHAZADA"
            ? "La orden quedará rechazada. El administrador puede anularla si es necesario."
            : confirmStatus === "APROBADA"
            ? "Se aprobará formalmente esta Orden de Compra."
            : confirmStatus === "EMITIDA"
            ? "La OC pasará a estado EMITIDA. Podrás enviarla al proveedor."
            : "Se registrará que la OC fue enviada al proveedor."
        }
        confirmLabel={confirmStatus ? STATUS_LABELS[confirmStatus] : "Confirmar"}
        onConfirm={handleStatusConfirm}
        loading={loading}
      />

      <Dialog
        open={annulOpen}
        onOpenChange={(open) => { if (!open && !loading) { setAnnulOpen(false); setMotivo(""); setMotivoError(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#253158]">Anular Orden de Compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-500">
              Esta acción es <strong>irreversible</strong>. La OC quedará anulada permanentemente.
            </p>
            <div className="space-y-2">
              <Label htmlFor="motivo">
                Motivo de anulación <span className="text-[#c6352e]">*</span>
              </Label>
              <Textarea
                id="motivo"
                rows={3}
                placeholder="Describe el motivo (mínimo 5 caracteres)"
                value={motivo}
                onChange={(e) => { setMotivo(e.target.value); setMotivoError(""); }}
              />
              {motivoError && <p className="text-sm text-[#c6352e]">{motivoError}</p>}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setAnnulOpen(false); setMotivo(""); setMotivoError(""); }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleAnnulConfirm} disabled={loading}>
              {loading ? "Anulando..." : "Confirmar anulación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
