import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import InstantLink from "@/components/portal/InstantLink";
import VolverAlDashboard from "@/components/portal/VolverAlDashboard";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye, Calculator, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";

type EstadoCotizacion = "BORRADOR" | "EMITIDA" | "ANULADA";

const ESTADO_LABELS: Record<EstadoCotizacion, string> = {
  BORRADOR: "Borrador",
  EMITIDA:  "Emitida",
  ANULADA:  "Anulada",
};

const ESTADO_COLORS: Record<EstadoCotizacion, string> = {
  BORRADOR: "bg-gray-50 text-gray-600 border border-gray-200",
  EMITIDA:  "bg-green-50 text-green-600 border border-green-200",
  ANULADA:  "bg-red-50 text-red-500 border border-red-200",
};

const FILTROS: { key: string; label: string }[] = [
  { key: "",         label: "Todas" },
  { key: "BORRADOR", label: "Borrador" },
  { key: "EMITIDA",  label: "Emitida" },
  { key: "ANULADA",  label: "Anulada" },
];

// Mismo nombre de archivo que usa la página de detalle.
function pdfFileName(numero: string): string {
  const safe = numero.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `cotizacion-solterra-${safe || "s-n"}.pdf`;
}

interface Props {
  searchParams: Promise<{ q?: string; estado?: string }>;
}

export default async function CotizacionesPage({ searchParams }: Props) {
  const { q, estado } = await searchParams;
  const query = q?.trim() ?? "";
  const estadoFilter = (["BORRADOR", "EMITIDA", "ANULADA"] as const).includes(estado as EstadoCotizacion)
    ? (estado as EstadoCotizacion)
    : undefined;

  const [session, cotizaciones] = await Promise.all([
    getPortalSessionFast(),
    prisma.quotation.findMany({
      where: {
        ...(estadoFilter ? { estado: estadoFilter } : {}),
        ...(query
          ? {
              OR: [
                { numero: { contains: query, mode: "insensitive" } },
                { cliente_nombre_snapshot: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { created_at: "desc" },
      take: 200,
      select: {
        id: true, numero: true, cliente_nombre_snapshot: true,
        fecha_emision: true, total: true, estado: true,
      },
    }),
  ]);
  if (!session) redirect("/login");

  const filtroQs = (key: string) =>
    `/cotizaciones?${[key ? `estado=${key}` : "", query ? `q=${encodeURIComponent(query)}` : ""].filter(Boolean).join("&")}`;

  return (
    <div className="space-y-6">
      <VolverAlDashboard />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Cotizaciones</h1>
          <p className="text-gray-500 text-sm mt-1">
            {cotizaciones.length} {cotizaciones.length === 1 ? "cotización" : "cotizaciones"}
          </p>
        </div>
        <InstantLink href="/cotizador" prefetchOnMount>
          <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
            <Plus className="h-4 w-4" />
            Nueva Cotización
          </Button>
        </InstantLink>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <form method="GET" className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por número o cliente..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] w-full sm:w-72"
          />
          {estadoFilter && <input type="hidden" name="estado" value={estadoFilter} />}
        </form>
        <div className="flex gap-1.5 flex-wrap">
          {FILTROS.map((f) => {
            const active = (f.key === "" && !estadoFilter) || f.key === estadoFilter;
            return (
              <InstantLink key={f.key || "todas"} href={filtroQs(f.key)} prefetchOnMount>
                <span className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border ${active ? "bg-[#253158] text-white border-[#253158]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                  {f.label}
                </span>
              </InstantLink>
            );
          })}
        </div>
      </div>

      {/* Móvil: cards */}
      <div className="sm:hidden bg-white rounded-xl border border-gray-200 overflow-hidden">
        {cotizaciones.length === 0 ? (
          <div className="text-center text-gray-400 py-12 px-4">
            <Calculator className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>{query || estadoFilter ? "No se encontraron cotizaciones." : "Todavía no hay cotizaciones."}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {cotizaciones.map((c) => (
              <div key={c.id} className="px-4 py-3.5">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs font-bold text-[#253158]">{c.numero}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${ESTADO_COLORS[c.estado as EstadoCotizacion]}`}>
                    {ESTADO_LABELS[c.estado as EstadoCotizacion].toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">{c.cliente_nombre_snapshot ?? "Sin cliente"}</p>
                <div className="flex items-center gap-2 mt-0.5 mb-2">
                  <span className="text-xs text-gray-400">{new Date(c.fecha_emision).toLocaleDateString("es-CL")}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-sm font-semibold text-gray-800 tabular-nums">{formatCurrency(Number(c.total), "CLP")}</span>
                </div>
                <div className="flex gap-2">
                  <InstantLink href={`/cotizaciones/${c.id}`} className="flex-1">
                    <button type="button" className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#253158] border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </button>
                  </InstantLink>
                  <a
                    href={`/api/cotizaciones/${c.id}/pdf`}
                    download={pdfFileName(c.numero)}
                    className="flex-1"
                  >
                    <button type="button" className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                      <Download className="h-3.5 w-3.5" />
                      Descargar
                    </button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">N° Cotización</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Total</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cotizaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                  <Calculator className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{query || estadoFilter ? "No se encontraron cotizaciones." : "Todavía no hay cotizaciones."}</p>
                </TableCell>
              </TableRow>
            ) : (
              cotizaciones.map((c) => (
                <TableRow key={c.id} className="relative cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <TableCell className="px-4 py-3 font-mono font-bold text-[#253158] text-sm">
                    <InstantLink href={`/cotizaciones/${c.id}`} aria-label={`Ver cotización ${c.numero}`} className="absolute inset-0">
                      <span className="sr-only">Ver detalle</span>
                    </InstantLink>
                    {c.numero}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-medium text-gray-800 text-sm">{c.cliente_nombre_snapshot ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-gray-400 text-sm">{new Date(c.fecha_emision).toLocaleDateString("es-CL")}</TableCell>
                  <TableCell className="px-4 py-3 text-right font-semibold text-gray-800 text-sm tabular-nums">{formatCurrency(Number(c.total), "CLP")}</TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${ESTADO_COLORS[c.estado as EstadoCotizacion]}`}>
                      {ESTADO_LABELS[c.estado as EstadoCotizacion].toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3 relative z-10">
                    <div className="flex items-center gap-1">
                      <InstantLink href={`/cotizaciones/${c.id}`}>
                        <button type="button" className="p-1.5 rounded-md text-gray-400 hover:text-[#253158] hover:bg-gray-100 transition-colors" title="Ver cotización">
                          <Eye className="h-4 w-4" />
                        </button>
                      </InstantLink>
                      <a href={`/api/cotizaciones/${c.id}/pdf`} download={pdfFileName(c.numero)}>
                        <button type="button" className="p-1.5 rounded-md text-gray-400 hover:text-[#253158] hover:bg-gray-100 transition-colors" title="Descargar PDF">
                          <Download className="h-4 w-4" />
                        </button>
                      </a>
                    </div>
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
