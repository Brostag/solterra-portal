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
import { CheckCircle, Send, XCircle } from "lucide-react";

interface Props {
  invoiceId: string;
  currentStatus: "CREADA" | "ENVIADA" | "PAGADA";
  userRol: string;
  updateStatus: (id: string, status: "ENVIADA" | "PAGADA") => Promise<void>;
  annul: (id: string, formData: FormData) => Promise<void>;
}

export default function FacturaActions({
  invoiceId, currentStatus, userRol, updateStatus, annul,
}: Props) {
  const [confirmStatus, setConfirmStatus] = useState<"ENVIADA" | "PAGADA" | null>(null);
  const [annulOpen, setAnnulOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState("");
  const [loading, setLoading] = useState(false);

  const canAnnul = userRol === "ADMINISTRADOR" || userRol === "SUPERVISOR";
  const canMarkPaid = userRol === "ADMINISTRADOR" || userRol === "SUPERVISOR";

  async function handleStatusConfirm() {
    if (!confirmStatus) return;
    setLoading(true);
    await updateStatus(invoiceId, confirmStatus);
    setLoading(false);
    setConfirmStatus(null);
  }

  async function handleAnnulConfirm() {
    if (motivo.trim().length < 10) {
      setMotivoError("El motivo debe tener al menos 10 caracteres");
      return;
    }
    setMotivoError("");
    setLoading(true);
    const fd = new FormData();
    fd.append("motivo_anulacion", motivo.trim());
    await annul(invoiceId, fd);
    setLoading(false);
    setAnnulOpen(false);
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {currentStatus === "CREADA" && (
          <Button
            variant="outline"
            className="gap-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
            onClick={() => setConfirmStatus("ENVIADA")}
          >
            <Send className="h-4 w-4" />
            Marcar como Enviada
          </Button>
        )}

        {canMarkPaid && (currentStatus === "CREADA" || currentStatus === "ENVIADA") && (
          <Button
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setConfirmStatus("PAGADA")}
          >
            <CheckCircle className="h-4 w-4" />
            Marcar como Pagada
          </Button>
        )}

        {canAnnul && (
          <Button
            variant="outline"
            className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => setAnnulOpen(true)}
          >
            <XCircle className="h-4 w-4" />
            Anular Factura
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmStatus !== null}
        onOpenChange={(open) => { if (!open) setConfirmStatus(null); }}
        title={`¿Marcar como ${confirmStatus === "ENVIADA" ? "Enviada" : "Pagada"}?`}
        description={
          confirmStatus === "PAGADA"
            ? "Esta acción marcará la factura como pagada. Podrás anularla posteriormente si es necesario."
            : "Se registrará que la factura fue enviada al cliente."
        }
        confirmLabel={confirmStatus === "ENVIADA" ? "Sí, marcar como enviada" : "Sí, marcar como pagada"}
        onConfirm={handleStatusConfirm}
        loading={loading}
      />

      <Dialog open={annulOpen} onOpenChange={(open) => { if (!open && !loading) { setAnnulOpen(false); setMotivo(""); setMotivoError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#253158]">Anular Factura</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-500">
              Esta acción es <strong>irreversible</strong>. La factura quedará anulada permanentemente.
            </p>
            <div className="space-y-2">
              <Label htmlFor="motivo">
                Motivo de anulación <span className="text-[#c6352e]">*</span>
              </Label>
              <Textarea
                id="motivo"
                rows={3}
                placeholder="Describe el motivo de la anulación (mínimo 10 caracteres)"
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
            <Button
              variant="destructive"
              onClick={handleAnnulConfirm}
              disabled={loading}
            >
              {loading ? "Anulando..." : "Confirmar anulación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
