import { createClient } from "../actions";
import { SubmitButton } from "@/components/portal/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NuevoClientePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clientes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-[#253158]">Nuevo Cliente</h1>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <form action={createClient} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="nombre">
                Nombre / Razón Social <span className="text-[#c6352e]">*</span>
              </Label>
              <Input id="nombre" name="nombre" required placeholder="Empresa S.A." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rut">RUT</Label>
              <Input id="rut" name="rut" placeholder="76.123.456-7" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="contacto@empresa.cl" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" placeholder="+56 9 1234 5678" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" name="direccion" placeholder="Av. Principal 123, Santiago" />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                name="observaciones"
                rows={3}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <SubmitButton label="Guardar Cliente" loadingLabel="Guardando..." />
            <Link href="/clientes">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

