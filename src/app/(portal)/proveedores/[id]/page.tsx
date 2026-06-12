import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { updateSupplier } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ProveedorActions from "./ProveedorActions";
import DocumentsSection from "@/components/portal/DocumentsSection";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProveedorDetailPage({ params }: Props) {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  const canEdit = session.rol !== "USUARIO";
  const canDeactivate = session.rol === "ADMINISTRADOR" && supplier.activo;

  const updateWithId = updateSupplier.bind(null, id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/proveedores">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">{supplier.nombre}</h1>
            <p className="text-gray-500 text-sm">
              {supplier.rut ?? "Sin RUT"} · Registrado el {new Date(supplier.created_at).toLocaleDateString("es-CL")}
            </p>
          </div>
        </div>
        {!supplier.activo && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-[#c6352e]">
            Inactivo
          </span>
        )}
      </div>

      <form action={updateWithId} className="bg-white rounded-lg shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre / Razón Social <span className="text-[#c6352e]">*</span></Label>
            <Input id="nombre" name="nombre" defaultValue={supplier.nombre} required disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rut">RUT</Label>
            <Input id="rut" name="rut" defaultValue={supplier.rut ?? ""} disabled={!canEdit} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="giro">Giro</Label>
          <Input id="giro" name="giro" defaultValue={supplier.giro ?? ""} disabled={!canEdit} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" name="direccion" defaultValue={supplier.direccion ?? ""} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input id="ciudad" name="ciudad" defaultValue={supplier.ciudad ?? ""} disabled={!canEdit} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" name="telefono" defaultValue={supplier.telefono ?? ""} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={supplier.email ?? ""} disabled={!canEdit} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contacto">Persona de Contacto</Label>
          <Input id="contacto" name="contacto" defaultValue={supplier.contacto ?? ""} disabled={!canEdit} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Textarea id="observaciones" name="observaciones" defaultValue={supplier.observaciones ?? ""} rows={3} disabled={!canEdit} />
        </div>

        {canEdit && (
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="bg-[#253158] hover:bg-[#1e305e] text-white">
              Guardar Cambios
            </Button>
            <Link href="/proveedores">
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
          </div>
        )}
      </form>

      {canDeactivate && (
        <div className="bg-white rounded-lg border border-red-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Zona de peligro</p>
            <p className="text-xs text-gray-400 mt-0.5">Desactivar este proveedor lo ocultará de la lista principal.</p>
          </div>
          <ProveedorActions supplierId={supplier.id} supplierName={supplier.nombre} />
        </div>
      )}

      {/* Documentos adjuntos */}
      <DocumentsSection
        supplier_id={supplier.id}
        sessionId={session.id}
        sessionRol={session.rol}
      />
    </div>
  );
}
