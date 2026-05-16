import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { Moneda } from "@/types";

const estadoColors: Record<string, string> = {
  CREADA: "bg-blue-100 text-blue-700",
  ENVIADA: "bg-yellow-100 text-yellow-700",
  PAGADA: "bg-green-100 text-green-700",
  ANULADA: "bg-red-100 text-red-600",
};

export default async function FacturasPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { created_at: "desc" },
    include: {
      client: { select: { nombre: true } },
      user: { select: { nombre: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Facturas</h1>
          <p className="text-gray-500 text-sm mt-1">{invoices.length} registros</p>
        </div>
        <Link href="/facturas/nueva">
          <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
            <Plus className="h-4 w-4" />
            Nueva Factura
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Factura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creada por</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                  No hay facturas registradas
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">#{inv.numero_factura}</TableCell>
                  <TableCell>{inv.client.nombre}</TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {new Date(inv.fecha_emision).toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(Number(inv.total), inv.moneda as Moneda)}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${estadoColors[inv.estado]} hover:${estadoColors[inv.estado]}`}>
                      {inv.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">{inv.user.nombre}</TableCell>
                  <TableCell>
                    <Link href={`/facturas/${inv.id}`}>
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

