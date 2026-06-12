import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getPortalSessionFast } from "@/lib/auth/session";
import { updateClient, deactivateClient } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClienteActions from "./ClienteActions";
import DocumentsSection from "@/components/portal/DocumentsSection";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { created_at: "desc" },
        take: 5,
        select: {
          id: true,
          numero_factura: true,
          total: true,
          moneda: true,
          estado: true,
          fecha_emision: true,
        },
      },
    },
  });

  if (!client) notFound();

  const updateWithId = updateClient.bind(null, id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clientes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-[#253158]">{client.nombre}</h1>
          <Badge
            className={
              client.activo
                ? "bg-green-100 text-green-700 hover:bg-green-100"
                : "bg-gray-100 text-gray-500"
            }
          >
            {client.activo ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        {client.activo && <ClienteActions clientId={id} deactivate={deactivateClient} />}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <form action={updateWithId} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="nombre">Nombre / Razón Social *</Label>
              <Input id="nombre" name="nombre" defaultValue={client.nombre} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rut">RUT</Label>
              <Input id="rut" name="rut" defaultValue={client.rut ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={client.email ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" defaultValue={client.telefono ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" name="direccion" defaultValue={client.direccion ?? ""} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea id="observaciones" name="observaciones" rows={3} defaultValue={client.observaciones ?? ""} />
            </div>
          </div>
          <Button type="submit" className="bg-[#253158] hover:bg-[#1e305e] text-white">
            Guardar Cambios
          </Button>
        </form>
      </div>

      {client.invoices.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="font-semibold text-[#253158] mb-4">Últimas Facturas</h2>
          <div className="space-y-2">
            {client.invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/facturas/${inv.id}`}
                className="flex items-center justify-between p-3 rounded hover:bg-gray-50"
              >
                <span className="text-sm font-medium">#{inv.numero_factura}</span>
                <span className="text-sm text-gray-500">{inv.estado}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Documentos adjuntos */}
      <DocumentsSection
        client_id={id}
        sessionId={session.id}
        sessionRol={session.rol}
      />
    </div>
  );
}
