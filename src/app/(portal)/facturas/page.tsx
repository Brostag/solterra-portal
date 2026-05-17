import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import type { Moneda } from "@/types";

type EstadoFactura = "CREADA" | "ENVIADA" | "PAGADA" | "ANULADA";

const ESTADO_LABELS: Record<EstadoFactura, string> = {
  CREADA:  "Creada",
  ENVIADA: "Enviada",
  PAGADA:  "Pagada",
  ANULADA: "Anulada",
};

const ESTADO_COLORS: Record<EstadoFactura, string> = {
  CREADA:  "bg-blue-50 text-blue-600 border border-blue-200",
  ENVIADA: "bg-amber-50 text-amber-600 border border-amber-200",
  PAGADA:  "bg-green-50 text-green-600 border border-green-200",
  ANULADA: "bg-red-50 text-red-500 border border-red-200",
};

const ESTADOS_FILTER: EstadoFactura[] = ["CREADA", "ENVIADA", "PAGADA", "ANULADA"];

function abbreviateName(nombre: string): string {
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

interface Props {
  searchParams: Promise<{ q?: string; estado?: string }>;
}

export default async function FacturasPage({ searchParams }: Props) {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const { q, estado } = await searchParams;
  const query = q?.trim() ?? "";
  const estadoFilter = ESTADOS_FILTER.includes(estado as EstadoFactura) ? (estado as EstadoFactura) : undefined;

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(estadoFilter ? { estado: estadoFilter } : {}),
      ...(query
        ? {
            OR: [
              { numero_factura: { contains: query, mode: "insensitive" } },
              { client: { nombre: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { created_at: "desc" },
    take: 200,
    include: {
      client: { select: { nombre: true } },
      user:   { select: { nombre: true } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Facturas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {invoices.length} de {invoices.length} registros
            {estadoFilter && ` · estado: ${ESTADO_LABELS[estadoFilter]}`}
            {query && ` · búsqueda: "${query}"`}
          </p>
        </div>
        {session.rol !== "USUARIO" && (
          <Link href="/facturas/nueva">
            <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              <Plus className="h-4 w-4" />
              Nueva Factura
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
            placeholder="Buscar por N° o cliente..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] w-72"
          />
          {estadoFilter && <input type="hidden" name="estado" value={estadoFilter} />}
        </form>

        <div className="flex gap-1.5 flex-wrap">
          <Link href={`/facturas${query ? `?q=${encodeURIComponent(query)}` : ""}`}>
            <span className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border ${!estadoFilter ? "bg-[#253158] text-white border-[#253158]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
              Todos
            </span>
          </Link>
          {ESTADOS_FILTER.map((e) => (
            <Link key={e} href={`/facturas?estado=${e}${query ? `&q=${encodeURIComponent(query)}` : ""}`}>
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
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">N° Factura</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Total</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Creada por</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-12">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{query || estadoFilter ? "No se encontraron facturas." : "No hay facturas registradas."}</p>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <TableCell className="px-5 py-4 font-mono font-bold text-[#253158] text-sm">#{inv.numero_factura}</TableCell>
                  <TableCell className="px-5 py-4 font-medium text-gray-800 text-sm">{inv.client.nombre}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-400 text-sm">
                    {new Date(inv.fecha_emision).toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right font-semibold text-gray-800 text-sm">
                    {formatCurrency(Number(inv.total), inv.moneda as Moneda)}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${ESTADO_COLORS[inv.estado as EstadoFactura]}`}>
                      {ESTADO_LABELS[inv.estado as EstadoFactura].toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-400 text-sm">{abbreviateName(inv.user.nombre)}</TableCell>
                  <TableCell className="px-3 py-4">
                    <Link href={`/facturas/${inv.id}`}>
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
