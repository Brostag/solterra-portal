"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createProduct } from "./actions";
import { SubmitButton } from "@/components/portal/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";

// Modal de creación rápida desde el listado. Usa EXACTAMENTE el mismo server
// action y los mismos campos que /productos/nuevo (la ruta se conserva como
// fallback). createProduct revalida y redirige a /productos al terminar.
export default function NuevoServicioDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
        <Plus className="h-4 w-4" />
        Nuevo
      </Button>

      {open &&
        createPortal(
          <>
            <div
              aria-hidden="true"
              className="fixed inset-0 z-[200] bg-slate-900/40 animate-in fade-in duration-150"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="nuevo-servicio-titulo"
              className="fixed left-1/2 top-1/2 z-[201] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white border border-gray-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
            >
              <div className="px-6 pt-5 flex items-start justify-between gap-3">
                <div>
                  <h2 id="nuevo-servicio-titulo" className="text-lg font-bold text-[#253158]">
                    Nuevo Producto / Servicio
                  </h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Queda disponible para usar en cotizaciones y órdenes de compra.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* El submit despacha el server action y luego cierra el modal;
                  createProduct revalida la lista y redirige a /productos. */}
              <form action={createProduct} onSubmit={() => setOpen(false)} className="px-6 pt-4 pb-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dlg-nombre">Nombre <span className="text-[#c6352e]">*</span></Label>
                  <Input id="dlg-nombre" name="nombre" required placeholder="Arriendo maquinaria" autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dlg-codigo">Código Interno</Label>
                    <Input id="dlg-codigo" name="codigo_interno" placeholder="SRV-001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dlg-precio">
                      Precio Unitario (CLP) <span className="text-[#c6352e]">*</span>
                    </Label>
                    <Input id="dlg-precio" name="precio_unitario" type="number" min="0" step="1" required placeholder="150000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dlg-descripcion">Descripción</Label>
                  <Textarea id="dlg-descripcion" name="descripcion" rows={3} placeholder="Detalle del servicio..." />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <SubmitButton label="Guardar" loadingLabel="Guardando..." />
                </div>
              </form>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
