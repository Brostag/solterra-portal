import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function ProveedoresPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const suppliers = await prisma.supplier.findMany({
    where: {
      activo: true,
      ...(query
        ? {
            OR: [
              { nombre: { contains: query, mode: "insensitive" } },
              { rut: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Proveedores</h1>
          <p className="text-gray-500 text-sm mt-1">
            {suppliers.length} {suppliers.length === 1 ? "proveedor activo" : "proveedores activos"}
            {query && ` · búsqueda: "${query}"`}
          </p>
        </div>
        {session.rol !== "USUARIO" && (
          <Link href="/proveedores/nuevo">
            <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </Link>
        )}
      </div>

      {/* Buscador */}
      <form method="GET" className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre o RUT..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253158]/30"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Buscar
        </Button>
        {query && (
          <Link href="/proveedores">
            <Button variant="ghost" size="sm">Limpiar</Button>
          </Link>
        )}
      </form>

      <div className="bg-white rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre / Razón Social</TableHead>
              <TableHead>RUT</TableHead>
              <TableHead>Giro</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{query ? "No se encontraron proveedores con esa búsqueda." : "No hay proveedores registrados."}</p>
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((s) => (
                <TableRow key={s.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-[#253158]">{s.nombre}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{s.rut ?? "—"}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{s.giro ?? "—"}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{s.ciudad ?? "—"}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{s.telefono ?? "—"}</TableCell>
                  <TableCell>
                    <Link href={`/proveedores/${s.id}`}>
                      <Button variant="ghost" size="sm" className="text-[#253158]">
                        Ver
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

