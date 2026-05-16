import { createProduct } from "../actions";
import { SubmitButton } from "@/components/portal/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NuevoProductoPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/productos">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-[#253158]">Nuevo Producto / Servicio</h1>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <form action={createProduct} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="nombre">Nombre <span className="text-[#c6352e]">*</span></Label>
              <Input id="nombre" name="nombre" required placeholder="Arriendo maquinaria" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo_interno">Código Interno</Label>
              <Input id="codigo_interno" name="codigo_interno" placeholder="SRV-001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio_unitario">
                Precio Unitario (CLP) <span className="text-[#c6352e]">*</span>
              </Label>
              <Input id="precio_unitario" name="precio_unitario" type="number" min="0" step="1" required placeholder="150000" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea id="descripcion" name="descripcion" rows={3} placeholder="Detalle del servicio..." />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <SubmitButton label="Guardar" loadingLabel="Guardando..." />
            <Link href="/productos">
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

