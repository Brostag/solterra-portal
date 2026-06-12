import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { createSupplier } from "../actions";
import { SubmitButton } from "@/components/portal/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NuevoProveedorPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (session.rol === "USUARIO") redirect("/proveedores");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/proveedores">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-[#253158]">Nuevo Proveedor</h1>
      </div>

      <form action={createSupplier} className="bg-white rounded-lg shadow-sm p-6 space-y-5">
        {/* Fila 1: Nombre + RUT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre / Razón Social <span className="text-[#c6352e]">*</span></Label>
            <Input id="nombre" name="nombre" placeholder="Nombre del proveedor" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rut">RUT</Label>
            <Input id="rut" name="rut" placeholder="76.123.456-7" />
          </div>
        </div>

        {/* Fila 2: Giro */}
        <div className="space-y-2">
          <Label htmlFor="giro">Giro</Label>
          <Input id="giro" name="giro" placeholder="Actividad económica" />
        </div>

        {/* Fila 3: Dirección + Ciudad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" name="direccion" placeholder="Calle y número" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input id="ciudad" name="ciudad" placeholder="Ciudad" />
          </div>
        </div>

        {/* Fila 4: Teléfono + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" name="telefono" placeholder="+56 9 1234 5678" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="contacto@proveedor.cl" />
          </div>
        </div>

        {/* Fila 5: Contacto */}
        <div className="space-y-2">
          <Label htmlFor="contacto">Persona de Contacto</Label>
          <Input id="contacto" name="contacto" placeholder="Nombre del contacto" />
        </div>

        {/* Fila 6: Observaciones */}
        <div className="space-y-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Textarea id="observaciones" name="observaciones" placeholder="Notas adicionales..." rows={3} />
        </div>

        <div className="flex gap-3 pt-2">
          <SubmitButton label="Guardar Proveedor" loadingLabel="Guardando..." />
          <Link href="/proveedores">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

