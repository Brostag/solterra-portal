import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Search, Eye } from "lucide-react";
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
  BORRADOR:  "bg-gray-50 text-gray-500 border border-gray-200",
  EMITIDA:   "bg-blue-50 text-blue-600 border border-blue-200",
  ENVIADA:   "bg-sky-50 text-sky-700 border border-sky-200",
  APROBADA:  "bg-green-50 text-green-600 border border-green-200",
  RECHAZADA: "bg-red-50 text-red-500 border border-red-200",
  ANULADA:   "bg-rose-50 text-rose-500 border border-rose-200",
};

const ESTADOS_FILTER: EstadoOC[] = ["BORRADOR","EMITIDA","ENVIADA","APROBADA","RECHAZADA","ANULADA"];

interface Props {
  searchParams: Promise<{ q?: string; estado?: string }>;
}

export default async function OrdenesCompraPage({ searchParams }: Props) {
  const session = await getPortalSessionFast();
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
      {/* Header */}
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
      <div className="flex flex-wrap gap-3 items-center">
        <form method="GET" className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por N° de OC o proveedor..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] w-72"
          />
          {estadoFilter && <input type="hidden" name="estado" value={estadoFilter} />}
        </form>

        <div className="flex gap-1.5 flex-wrap">
          <Link href={`/ordenes-compra${query ? `?q=${encodeURIComponent(query)}` : ""}`}>
            <span className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border ${!estadoFilter ? "bg-[#253158] text-white border-[#253158]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
              Todos
            </span>
          </Link>
          {ESTADOS_FILTER.map((e) => (
            <Link key={e} href={`/ordenes-compra?estado=${e}${query ? `&q=${encodeURIComponent(query)}` : ""}`}>
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border ${estadoFilter === e ? "bg-[#253158] text-white border-[#253158]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                {ESTADO_LABELS[e]}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">N° OC</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proveedor</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha Emisión</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Total</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</TableHead>
              <TableHead className="w-12" />
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
                <TableRow key={oc.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <TableCell className="px-5 py-4 font-mono font-bold text-[#253158] text-sm">{oc.numero}</TableCell>
                  <TableCell className="px-5 py-4 font-medium text-[#253158] text-sm">{oc.proveedor.nombre}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-400 text-sm">
                    {new Date(oc.fecha_emision).toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right font-semibold text-gray-800 text-sm">
                    {formatCurrency(Number(oc.total), oc.moneda as Moneda)}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${ESTADO_COLORS[oc.estado as EstadoOC]}`}>
                      {ESTADO_LABELS[oc.estado as EstadoOC].toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-4">
                    <Link href={`/ordenes-compra/${oc.id}`}>
                      <button type="button" className="p-1.5 rounded-md text-gray-400 hover:text-[#253158] hover:bg-gray-100 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
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
