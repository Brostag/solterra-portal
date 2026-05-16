import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Search } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import type { EstadoOC, Moneda } from "@/types";

const ESTADO_LABELS: Record<EstadoOC, string> = {
  BORRADOR:  "Borrador",
  EMITIDA:   "Emitida",
  ENVIADA:   "Enviada",
  APROBADA:  "Aprobada",
  RECHAZADA: "Rechazada",
  ANULADA:   "Anulada",
};

const ESTADO_COLORS: Record<EstadoOC, string> = {
  BORRADOR:  "bg-gray-100 text-gray-600",
  EMITIDA:   "bg-blue-100 text-blue-700",
  ENVIADA:   "bg-indigo-100 text-indigo-700",
  APROBADA:  "bg-green-100 text-green-700",
  RECHAZADA: "bg-red-100 text-[#c6352e]",
  ANULADA:   "bg-red-50 text-red-800",
};

const ESTADOS_FILTER: EstadoOC[] = ["BORRADOR","EMITIDA","ENVIADA","APROBADA","RECHAZADA","ANULADA"];

interface Props {
  searchParams: Promise<{ q?: string; estado?: string }>;
}

export default async function OrdenesCompraPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { q, estado } = await searchParams;
  const query = q?.trim() ?? "";
  const estadoFilter = ESTADOS_FILTER.includes(estado as EstadoOC) ? (estado as EstadoOC) : undefined;

  const ordenes = await prisma.purchaseOrder.findMany({
    where: {
      activo: true,
      ...(estadoFilter ? { estado: estadoFilter } : {}),
      ...(query
        ? {
            OR: [
              { numero: { contains: query, mode: "insensitive" } },
              { proveedor: { nombre: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { proveedor: { select: { nombre: true } } },
    orderBy: { created_at: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Órdenes de Compra</h1>
          <p className="text-gray-500 text-sm mt-1">
            {ordenes.length} {ordenes.length === 1 ? "orden" : "órdenes"}
            {estadoFilter && ` · estado: ${ESTADO_LABELS[estadoFilter]}`}
            {query && ` · búsqueda: "${query}"`}
          </p>
        </div>
        {session.rol !== "USUARIO" && (
          <Link href="/ordenes-compra/nueva">
            <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              <Plus className="h-4 w-4" />
              Nueva OC
            </Button>
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <form method="GET" className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Buscar por Nro. OC o proveedor..."
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#253158]/30 w-64"
            />
          </div>
          {estadoFilter && <input type="hidden" name="estado" value={estadoFilter} />}
          <Button type="submit" variant="outline" size="sm">Buscar</Button>
        </form>

        <div className="flex gap-1 flex-wrap">
          <Link href="/ordenes-compra">
            <span className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${!estadoFilter ? "bg-[#253158] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              Todos
            </span>
          </Link>
          {ESTADOS_FILTER.map((e) => (
            <Link key={e} href={`/ordenes-compra?estado=${e}${query ? `&q=${encodeURIComponent(query)}` : ""}`}>
              <span className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${estadoFilter === e ? "bg-[#253158] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {ESTADO_LABELS[e]}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nro. OC</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{query || estadoFilter ? "No se encontraron órdenes." : "No hay órdenes de compra registradas."}</p>
                </TableCell>
              </TableRow>
            ) : (
              ordenes.map((oc) => (
                <TableRow key={oc.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono font-semibold text-[#253158] text-sm">{oc.numero}</TableCell>
                  <TableCell className="font-medium text-gray-800">{oc.proveedor.nombre}</TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {new Date(oc.fecha_emision).toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLORS[oc.estado as EstadoOC]}`}>
                      {ESTADO_LABELS[oc.estado as EstadoOC]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium text-gray-800">
                    {formatCurrency(Number(oc.total), oc.moneda as Moneda)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/ordenes-compra/${oc.id}`}>
                      <Button variant="ghost" size="sm" className="text-[#253158]">Ver</Button>
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

