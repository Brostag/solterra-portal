import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";

export default async function ClientesPage() {
  const clients = await prisma.client.findMany({
    orderBy: { created_at: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {clients.filter((c) => c.activo).length} clientes activos
          </p>
        </div>
        <Link href="/clientes/nuevo">
          <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>RUT</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                  No hay clientes registrados
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.nombre}</TableCell>
                  <TableCell className="text-gray-500">{client.rut ?? "—"}</TableCell>
                  <TableCell className="text-gray-500">{client.email ?? "—"}</TableCell>
                  <TableCell className="text-gray-500">{client.telefono ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={client.activo ? "default" : "secondary"}
                      className={
                        client.activo
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500"
                      }
                    >
                      {client.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/clientes/${client.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

