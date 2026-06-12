"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrder, updatePurchaseOrder } from "../actions";
import { calculateOCTotals, formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, X } from "lucide-react";
import Stepper from "@/components/portal/Stepper";
import Link from "next/link";
import type { Moneda } from "@/types";
import type { PurchaseOrderData } from "@/lib/validations/purchase-order";

interface LineItem {
  producto_id?: string | null;
  descripcion: string;
  cantidad: number;
  valor_unitario: number;
}

interface Supplier { id: string; nombre: string; rut: string | null }
interface Product  { id: string; nombre: string; precio_unitario: number }

interface DefaultValues {
  proveedor_id: string;
  fecha_envio: string;
  moneda: "CLP" | "USD";
  tipo_cambio: number;
  condiciones_pago: string;
  observaciones: string;
  descuento_pct: number;
  items: LineItem[];
}

interface Props {
  suppliers: Supplier[];
  products: Product[];
  ivaPercent: number;
  mode?: "create" | "edit";
  ocId?: string;
  defaultValues?: Partial<DefaultValues>;
}

// Pasos del asistente de creación (la edición mantiene la vista completa).
const WIZARD_STEPS = ["Proveedor y condiciones", "Productos / Servicios", "Revisar y emitir"];

export default function NuevoOCForm({
  suppliers, products, ivaPercent,
  mode = "create", ocId, defaultValues,
}: Props) {
  const router = useRouter();

  const [proveedorId, setProveedorId]         = useState(defaultValues?.proveedor_id ?? "");
  const [fechaEnvio, setFechaEnvio]           = useState(defaultValues?.fecha_envio ?? "");
  const [moneda, setMoneda]                   = useState<"CLP" | "USD">(defaultValues?.moneda ?? "CLP");
  const [tipoCambio, setTipoCambio]           = useState(defaultValues?.tipo_cambio ?? 0);
  const [condicionesPago, setCondicionesPago] = useState(defaultValues?.condiciones_pago ?? "");
  const [observaciones, setObs]               = useState(defaultValues?.observaciones ?? "");
  const [descuentoPct, setDescuento]          = useState(defaultValues?.descuento_pct ?? 0);
  const [items, setItems]                     = useState<LineItem[]>(
    defaultValues?.items?.length ? defaultValues.items : [{ descripcion: "", cantidad: 1, valor_unitario: 0 }]
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // Asistente por pasos solo al crear (presentación pura, mismo payload).
  const wizard = mode === "create";
  const [step, setStep] = useState(1);

  const totals = calculateOCTotals(items, descuentoPct, ivaPercent);

  function addLine() {
    setItems([...items, { descripcion: "", cantidad: 1, valor_unitario: 0 }]);
  }

  function removeLine(idx: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof LineItem, value: string | number | null) {
    setItems(
      items.map((item, i) => {
        if (i !== idx) return item;
        if (field === "producto_id") {
          const prod = products.find((p) => p.id === value);
          return {
            ...item,
            producto_id: value as string | null,
            descripcion: prod ? prod.nombre : item.descripcion,
            valor_unitario: prod ? Number(prod.precio_unitario) : item.valor_unitario,
          };
        }
        return { ...item, [field]: value };
      })
    );
  }

  // Condiciones del paso 1 del asistente (proveedor + moneda). Reutilizadas por validate().
  function proveedorErrors(): string[] {
    const errs: string[] = [];
    if (!proveedorId) errs.push("Selecciona un proveedor");
    if (moneda === "USD" && (!tipoCambio || tipoCambio <= 0)) errs.push("El tipo de cambio es requerido para moneda USD");
    return errs;
  }

  // Condiciones del paso 2 (ítems). Reutilizadas por validate().
  function itemsErrors(): string[] {
    const errs: string[] = [];
    if (items.some((it) => !it.descripcion.trim())) errs.push("Todos los ítems deben tener descripción");
    if (items.some((it) => it.cantidad <= 0)) errs.push("La cantidad de cada ítem debe ser mayor a 0");
    return errs;
  }

  // Validación parcial al avanzar de paso en el asistente (solo modo create).
  function validateStep(s: number): boolean {
    const errs = s === 1 ? proveedorErrors() : s === 2 ? itemsErrors() : [];
    setErrors(errs);
    return errs.length === 0;
  }

  function validate(): boolean {
    const errs: string[] = [...proveedorErrors(), ...itemsErrors()];
    setErrors(errs);
    return errs.length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    const data: PurchaseOrderData = {
      proveedor_id: proveedorId,
      fecha_envio: fechaEnvio || null,
      moneda,
      tipo_cambio: moneda === "USD" ? tipoCambio : null,
      condiciones_pago: condicionesPago || undefined,
      observaciones: observaciones || undefined,
      descuento_pct: descuentoPct,
      items: items.map((it) => ({
        producto_id: it.producto_id ?? null,
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        valor_unitario: it.valor_unitario,
      })),
    };

    try {
      if (mode === "create") {
        const result = await createPurchaseOrder(data);
        router.push(`/ordenes-compra/${result.id}`);
      } else {
        await updatePurchaseOrder(ocId!, data);
        router.refresh();
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Error al guardar la OC"]);
      setLoading(false);
    }
  }

  const fmtAmt = (n: number) => formatCurrency(n, moneda as Moneda);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {mode === "create" && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">Nueva Orden de Compra</h1>
            <p className="text-gray-500 text-sm mt-0.5">Asistente paso a paso · Borrador editable hasta que se emita.</p>
          </div>
          <Link href="/ordenes-compra" className="flex-shrink-0">
            <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500 hover:text-[#253158]">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </Link>
        </div>
      )}

      {wizard && <Stepper steps={WIZARD_STEPS} current={step} />}

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-sm text-[#c6352e]">{e}</p>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">
        {(!wizard || step === 1) && (<>
        {/* ── Fila 1: Proveedor + Fecha envío ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Proveedor <span className="text-[#c6352e]">*</span></Label>
            <Select value={proveedorId} onValueChange={(v) => setProveedorId(v ?? "")}>
              <SelectTrigger className="w-full">
                <span className={`flex-1 text-left text-sm truncate ${!proveedorId ? "text-muted-foreground" : ""}`}>
                  {proveedorId
                    ? (() => { const s = suppliers.find((x) => x.id === proveedorId); return s ? `${s.nombre}${s.rut ? ` · ${s.rut}` : ""}` : ""; })()
                    : "Seleccionar proveedor..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}{s.rut ? ` · ${s.rut}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha_envio">Fecha de Envío</Label>
            <Input
              id="fecha_envio"
              type="date"
              value={fechaEnvio}
              onChange={(e) => setFechaEnvio(e.target.value)}
            />
          </div>
        </div>

        {/* ── Fila 2: Moneda + Tipo cambio ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Moneda</Label>
            <Select value={moneda} onValueChange={(v) => setMoneda(v as "CLP" | "USD")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLP">CLP — Peso Chileno</SelectItem>
                <SelectItem value="USD">USD — Dólar Americano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {moneda === "USD" && (
            <div className="space-y-2">
              <Label htmlFor="tipo_cambio">
                Tipo de Cambio (CLP/USD) <span className="text-[#c6352e]">*</span>
              </Label>
              <Input
                id="tipo_cambio"
                type="number"
                min={1}
                step="0.01"
                value={tipoCambio || ""}
                onChange={(e) => setTipoCambio(Number(e.target.value))}
                placeholder="Ej: 950"
              />
            </div>
          )}
        </div>

        {/* ── Fila 3: Condiciones de pago ── */}
        <div className="space-y-2">
          <Label htmlFor="condiciones_pago">Condiciones de Pago</Label>
          <Input
            id="condiciones_pago"
            value={condicionesPago}
            onChange={(e) => setCondicionesPago(e.target.value)}
            placeholder="Ej: 30 días, Contado, etc."
          />
        </div>

        {/* ── Observaciones ── */}
        <div className="space-y-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Textarea
            id="observaciones"
            rows={3}
            value={observaciones}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Notas adicionales que aparecerán en el PDF..."
          />
        </div>
        </>)}

        {(!wizard || step === 2) && (<>
        {/* ── Tabla de ítems ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Ítems <span className="text-[#c6352e]">*</span></Label>
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1 text-[#253158]">
              <Plus className="h-4 w-4" /> Agregar ítem
            </Button>
          </div>

          <div className="border border-gray-200 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-44">Producto (opcional)</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Detalle</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-24">Cantidad</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-28">Valor Hr</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-28">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const lineTotal = Math.round(item.cantidad * item.valor_unitario * 100) / 100;
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2">
                        <Select
                          value={item.producto_id ?? "__none__"}
                          onValueChange={(v) => updateLine(idx, "producto_id", v === "__none__" ? null : v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <span className="flex-1 text-left text-xs truncate text-muted-foreground">
                              {item.producto_id
                                ? products.find((p) => p.id === item.producto_id)?.nombre ?? "Texto libre"
                                : "Texto libre"}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Texto libre</SelectItem>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-8 text-sm"
                          value={item.descripcion}
                          onChange={(e) => updateLine(idx, "descripcion", e.target.value)}
                          placeholder="Descripción del ítem..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-8 text-sm text-right"
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.cantidad || ""}
                          onChange={(e) => updateLine(idx, "cantidad", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-8 text-sm text-right"
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.valor_unitario || ""}
                          onChange={(e) => updateLine(idx, "valor_unitario", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 font-medium">
                        {fmtAmt(lineTotal)}
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={items.length === 1}
                          onClick={() => removeLine(idx)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-[#c6352e]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>)}

        {(!wizard || step === 3) && (<>
        {/* ── Descuento + Totales ── */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2 border-t">
          <div className="space-y-2 w-48">
            <Label htmlFor="descuento_pct">Descuento (%)</Label>
            <Input
              id="descuento_pct"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={descuentoPct || ""}
              onChange={(e) => setDescuento(Number(e.target.value))}
              placeholder="0"
            />
          </div>

          <div className="w-full sm:w-72 space-y-2">
            {[
              { label: "Subtotal",                value: fmtAmt(totals.subtotal) },
              ...(descuentoPct > 0 ? [{ label: `Descuento (${descuentoPct}%)`, value: `−${fmtAmt(totals.descuento_monto)}` }] : []),
              { label: "Neto",                    value: fmtAmt(totals.neto) },
              { label: `IVA (${ivaPercent}%)`,    value: fmtAmt(totals.iva_monto) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-800">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t-2 border-[#253158]">
              <span className="font-bold text-[#253158] text-base">TOTAL {moneda}</span>
              <span className="font-bold text-[#253158] text-lg">{fmtAmt(totals.total)}</span>
            </div>
          </div>
        </div>

        {/* Cierre paso 3 (Descuento + Totales) */}
        </>)}

        {/* ── Acciones ── */}
        {wizard ? (
          <div className="flex justify-between gap-2 pt-2 border-t">
            <Button type="button" variant="outline" disabled={step === 1 || loading} onClick={() => setStep(step - 1)}>
              ← Atrás
            </Button>
            <div className="flex gap-2">
              <Link href="/ordenes-compra">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              {step < 3 ? (
                <Button
                  type="button"
                  className="bg-[#253158] hover:bg-[#1e305e] text-white"
                  onClick={() => { if (validateStep(step)) setStep(step + 1); }}
                >
                  Siguiente →
                </Button>
              ) : (
                <Button type="button" disabled={loading} onClick={handleSubmit} className="bg-[#253158] hover:bg-[#1e305e] text-white">
                  {loading ? "Guardando..." : "Crear Orden de Compra"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-[#253158] hover:bg-[#1e305e] text-white"
            >
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
            <Link href={ocId ? `/ordenes-compra/${ocId}` : "/ordenes-compra"}>
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
