import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { getProductCounts } from "@/lib/cache/master-lists";
import { redirect } from "next/navigation";
import InstantLink from "@/components/portal/InstantLink";
import VolverAlDashboard from "@/components/portal/VolverAlDashboard";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Eye, Package } from "lucide-react";
import NuevoServicioDialog from "./NuevoServicioDialog";
import { formatCurrency } from "@/lib/currency";

type FiltroActivo = "activos" | "inactivos";

interface Props {
  searchParams: Promise<{ q?: string; filtro?: string }>;
}

export default async function ProductosPage({ searchParams }: Props) {
  const { q, filtro } = await searchParams;
  const query = q?.trim() ?? "";
  const filtroActivo: FiltroActivo | undefined =
    filtro === "activos" || filtro === "inactivos" ? filtro : undefined;

  const [session, products, counts] = await Promise.all([
    getPortalSessionFast(),
    prisma.product.findMany({
      where: {
        ...(filtroActivo === "activos" ? { activo: true } : filtroActivo === "inactivos" ? { activo: false } : {}),
        ...(query
          ? {
              OR: [
                { nombre: { contains: query, mode: "insensitive" } },
                { codigo_interno: { contains: query, mode: "insensitive" } },
                { descripcion: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { created_at: "desc" },
      take: 200,
    }),
    getProductCounts(),
  ]);
  if (!session) redirect("/login");

  function buildHref(f?: FiltroActivo) {
    const params = new URLSearchParams();
    if (f) params.set("filtro", f);
    if (query) params.set("q", query);
    const qs = params.toString();
    return `/productos${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <VolverAlDashboard />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Servicios</h1>
          <p className="text-gray-500 text-sm mt-1">
            {counts.activos} {counts.activos === 1 ? "activo" : "activos"}
            {counts.inactivos > 0 && ` · ${counts.inactivos} ${counts.inactivos === 1 ? "inactivo" : "inactivos"}`}
            {query && ` · búsqueda: "${query}"`}
          </p>
        </div>
        {session.rol !== "USUARIO" && <NuevoServicioDialog />}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <form method="GET" className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre o código..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] w-full sm:w-72"
          />
          {filtroActivo && <input type="hidden" name="filtro" value={filtroActivo} />}
        </form>

        <div className="flex gap-1.5">
          {(["", "activos", "inactivos"] as const).map((f) => {
            const isActive = (f === "" && !filtroActivo) || filtroActivo === f;
            const label = f === "" ? "Todos" : f === "activos" ? "Activos" : "Inactivos";
            return (
              <InstantLink key={f} href={buildHref(f as FiltroActivo | undefined)} prefetchOnMount>
                <span className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border ${isActive ? "bg-[#253158] text-white border-[#253158]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                  {label}
                </span>
              </InstantLink>
            );
          })}
        </div>
      </div>

      {/* Móvil: cards — sm:hidden */}
      <div className="sm:hidden bg-white rounded-xl border border-gray-200 overflow-hidden">
        {products.length === 0 ? (
          <div className="text-center text-gray-400 py-12 px-4">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>{query || filtroActivo ? "No se encontraron productos." : "No hay productos registrados."}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {products.map((p) => (
              <InstantLink key={p.id} href={`/productos/${p.id}`} className="block px-4 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.nombre}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${p.activo ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                {p.codigo_interno && <p className="text-xs text-gray-400 font-mono mt-0.5">{p.codigo_interno}</p>}
                <p className="text-sm font-semibold text-gray-800 tabular-nums mt-0.5">
                  {formatCurrency(Number(p.precio_unitario), "CLP")}
                </p>
              </InstantLink>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: tabla — hidden sm:block */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Precio Unit.</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{query || filtroActivo ? "No se encontraron productos." : "No hay productos registrados."}</p>
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id} className="relative cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <TableCell className="px-4 py-3 font-mono text-[#253158] font-semibold text-sm">
                    <InstantLink href={`/productos/${p.id}`} aria-label={`Ver ${p.nombre}`} className="absolute inset-0">
                      <span className="sr-only">Ver detalle</span>
                    </InstantLink>
                    {p.codigo_interno ?? "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-semibold text-gray-800 text-sm">{p.nombre}</TableCell>
                  <TableCell className="px-4 py-3 text-gray-400 text-sm">{p.descripcion ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-right font-semibold text-gray-800 text-sm">
                    {formatCurrency(Number(p.precio_unitario), "CLP")}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${p.activo ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3 relative z-10">
                    <InstantLink href={`/productos/${p.id}`}>
                      <button type="button" className="p-1.5 rounded-md text-gray-400 hover:text-[#253158] hover:bg-gray-100 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                    </InstantLink>
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
