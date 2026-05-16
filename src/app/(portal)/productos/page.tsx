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

export default async function ProductosPage() {
  const products = await prisma.product.findMany({
    orderBy: { created_at: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Productos y Servicios</h1>
          <p className="text-gray-500 text-sm mt-1">
            {products.filter((p) => p.activo).length} activos
          </p>
        </div>
        <Link href="/productos/nuevo">
          <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Precio Unit.</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                  No hay productos registrados
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-gray-500 text-sm">{p.codigo_interno ?? "—"}</TableCell>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{p.descripcion ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(p.precio_unitario), "CLP")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        p.activo
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500"
                      }
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/productos/${p.id}`}>
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
