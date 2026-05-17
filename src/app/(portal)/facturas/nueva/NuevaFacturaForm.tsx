"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoice } from "../actions";
import { formatCurrency, calculateInvoiceTotals } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import ConfirmDialog from "@/components/portal/ConfirmDialog";
import { Plus, Trash2 } from "lucide-react";
import type { Moneda } from "@/types";

interface LineItem {
  product_id?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

interface Props {
  clients: { id: string; nombre: string; rut: string | null }[];
  products: { id: string; nombre: string; precio_unitario: number }[];
  ivaPercent: number;
  defaultMoneda: Moneda;
  configWarnings: string[];
}

export default function NuevaFacturaForm({
  clients, products, ivaPercent, defaultMoneda, configWarnings,
}: Props) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [moneda, setMoneda] = useState<Moneda>(defaultMoneda);
  const [tipoCambio, setTipoCambio] = useState(1);
  const [items, setItems] = useState<LineItem[]>([
    { descripcion: "", cantidad: 1, precio_unitario: 0 },
  ]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const selectedClient = clients.find((c) => c.id === clientId);
  const clientMissingRut = !!selectedClient && !selectedClient.rut;

  const totals = calculateInvoiceTotals(items, ivaPercent);

  function addLine() {
    setItems([...items, { descripcion: "", cantidad: 1, precio_unitario: 0 }]);
  }

  function removeLine(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof LineItem, value: string | number) {
    setItems(
      items.map((item, i) => {
        if (i !== idx) return item;
        if (field === "product_id") {
          const prod = products.find((p) => p.id === value);
          return {
            ...item,
            product_id: value as string,
            descripcion: prod?.nombre ?? item.descripcion,
            precio_unitario: prod?.precio_unitario ?? item.precio_unitario,
          };
        }
        return { ...item, [field]: value };
      })
    );
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!clientId) errs.push("Selecciona un cliente");
    if (moneda !== "CLP" && tipoCambio <= 1)
      errs.push(`Para moneda ${moneda}, el tipo de cambio debe ser mayor a 1.`);
    if (items.length === 0) errs.push("Agrega al menos un ítem");
    for (const item of items) {
      if (!item.descripcion) errs.push("Todos los ítems deben tener descripción");
      if (item.cantidad <= 0) errs.push("La cantidad debe ser mayor a 0");
      if (item.precio_unitario <= 0) errs.push("El precio debe ser mayor a 0");
    }
    setErrors(errs);
    return errs.length === 0;
  }

  function handleSubmitClick() {
    if (validate()) setConfirmOpen(true);
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const result = await createInvoice({ client_id: clientId, moneda, tipo_cambio: tipoCambio, items });
      router.push(`/facturas/${result.id}`);
    } catch (err) {
      setErrors(err instanceof Error ? err.message.split("\n") : ["Error al guardar la factura. Intenta nuevamente."]);
      setLoading(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {configWarnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">⚠ Empresa incompleta en Configuración:</p>
            {configWarnings.map((w) => (
              <p key={w} className="text-xs text-amber-700">• {w}</p>
            ))}
          </div>
        )}
        {/* Cabecera */}
        <div className="bg-white rounded-lg border p-6 grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Cliente <span className="text-[#c6352e]">*</span></Label>
            <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente...">
                  {selectedClient
                    ? `${selectedClient.nombre}${selectedClient.rut ? ` — ${selectedClient.rut}` : ""}`
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}{c.rut ? ` — ${c.rut}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clientMissingRut && (
              <p className="text-xs text-amber-600 mt-1">⚠ Este cliente no tiene RUT. El PDF no identificará al receptor con RUT.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Moneda</Label>
            <Select value={moneda} onValueChange={(v) => { if (v) setMoneda(v as Moneda); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CLP">CLP</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="UF">UF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {moneda !== "CLP" && (
            <div className="space-y-2">
              <Label>Tipo de Cambio</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={tipoCambio}
                onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 1)}
              />
            </div>
          )}
        </div>

        {/* Líneas de factura */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold text-[#253158]">Productos / Servicios</h2>

          {/* Header de columnas */}
          <div className="grid gap-3 items-center" style={{ gridTemplateColumns: "1fr 120px 160px 100px 36px" }}>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Descripción</div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cantidad</div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Precio Unitario</div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Subtotal</div>
            <div />
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid gap-3 items-center" style={{ gridTemplateColumns: "1fr 120px 160px 100px 36px" }}>
                {/* Descripción — con autocompletado del catálogo */}
                <Input
                  value={item.descripcion}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = products.find((p) => p.nombre === val);
                    if (matched) {
                      setItems(items.map((it, i) => i !== idx ? it : {
                        ...it,
                        descripcion: val,
                        product_id: matched.id,
                        precio_unitario: matched.precio_unitario,
                      }));
                    } else {
                      updateLine(idx, "descripcion", val);
                    }
                  }}
                  placeholder="Escribir descripción o elegir del catálogo..."
                  list={`catalog-${idx}`}
                />
                <datalist id={`catalog-${idx}`}>
                  {products.map((p) => (
                    <option key={p.id} value={p.nombre} />
                  ))}
                </datalist>

                {/* Cantidad */}
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.cantidad}
                  onChange={(e) => updateLine(idx, "cantidad", parseFloat(e.target.value) || 0)}
                />

                {/* Precio unitario */}
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={item.precio_unitario}
                  onChange={(e) => updateLine(idx, "precio_unitario", parseFloat(e.target.value) || 0)}
                />

                {/* Subtotal */}
                <p className="text-sm font-medium text-gray-700 text-right tabular-nums">
                  {formatCurrency(item.cantidad * item.precio_unitario, moneda)}
                </p>

                {/* Eliminar */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(idx)}
                  disabled={items.length === 1}
                  className="h-8 w-8 p-0 text-gray-300 hover:text-[#c6352e] hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLine}
            className="gap-2 text-[#253158] border-[#253158]"
          >
            <Plus className="h-4 w-4" />
            Agregar línea
          </Button>
        </div>

        {/* Totales */}
        <div className="bg-white rounded-lg border p-6">
          <div className="max-w-xs ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(totals.subtotal, moneda)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">IVA ({ivaPercent}%)</span>
              <span className="font-medium">{formatCurrency(totals.iva, moneda)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span className="text-[#253158]">Total</span>
              <span className="text-[#253158]">{formatCurrency(totals.total, moneda)}</span>
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            {errors.map((e) => (
              <p key={e} className="text-sm text-[#c6352e]">• {e}</p>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={handleSubmitClick}
            className="bg-[#253158] hover:bg-[#1e305e] text-white"
          >
            Guardar Factura
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Confirmar factura?"
        description={`Se guardará la factura por ${formatCurrency(totals.total, moneda)} con IVA incluido. Una vez creada, podrás cambiar su estado pero no modificar los montos.`}
        confirmLabel="Sí, crear factura"
        onConfirm={handleConfirm}
        loading={loading}
      />
    </>
  );
}
