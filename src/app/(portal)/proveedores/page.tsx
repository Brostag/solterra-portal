import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { getSupplierCounts } from "@/lib/cache/master-lists";
import { redirect } from "next/navigation";
import InstantLink from "@/components/portal/InstantLink";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type FiltroActivo = "activos" | "inactivos";

interface Props {
  searchParams: Promise<{ q?: string; filtro?: string }>;
}

export default async function ProveedoresPage({ searchParams }: Props) {
  const { q, filtro } = await searchParams;
  const query = q?.trim() ?? "";
  const filtroActivo: FiltroActivo | undefined =
    filtro === "activos" || filtro === "inactivos" ? filtro : undefined;

  const [session, suppliers, counts] = await Promise.all([
    getPortalSessionFast(),
    prisma.supplier.findMany({
      where: {
        ...(filtroActivo === "activos" ? { activo: true } : filtroActivo === "inactivos" ? { activo: false } : {}),
        ...(query
          ? {
              OR: [
                { nombre: { contains: query, mode: "insensitive" } },
                { rut: { contains: query, mode: "insensitive" } },
                { contacto: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { nombre: "asc" },
      take: 200,
      include: { _count: { select: { purchaseOrders: true } } },
    }),
    getSupplierCounts(),
  ]);
  if (!session) redirect("/login");

  function buildHref(f?: FiltroActivo) {
    const params = new URLSearchParams();
    if (f) params.set("filtro", f);
    if (query) params.set("q", query);
    const qs = params.toString();
    return `/proveedores${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Proveedores</h1>
          <p className="text-gray-500 text-sm mt-1">
            {counts.activos} {counts.activos === 1 ? "proveedor activo" : "proveedores activos"}
            {counts.inactivos > 0 && ` · ${counts.inactivos} ${counts.inactivos === 1 ? "inactivo" : "inactivos"}`}
            {query && ` · búsqueda: "${query}"`}
          </p>
        </div>
        {session.rol !== "USUARIO" && (
          <InstantLink href="/proveedores/nuevo" prefetchOnMount>
            <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </InstantLink>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <form method="GET" className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre, RUT o contacto..."
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
        {suppliers.length === 0 ? (
          <div className="text-center text-gray-400 py-12 px-4">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>{query || filtroActivo ? "No se encontraron proveedores." : "No hay proveedores registrados."}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {suppliers.map((s) => (
              <InstantLink key={s.id} href={`/proveedores/${s.id}`} className="block px-4 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.nombre}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${s.activo ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                    {s.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{s.rut ?? "Sin RUT"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {s.contacto && <span className="text-xs text-gray-500 truncate">{s.contacto}</span>}
                  {s.contacto && <span className="text-xs text-gray-300">·</span>}
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {s._count.purchaseOrders} OC
                  </span>
                </div>
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
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proveedor</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">RUT</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacto</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Teléfono</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">OC</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-12">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{query || filtroActivo ? "No se encontraron proveedores." : "No hay proveedores registrados."}</p>
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((s) => (
                <TableRow key={s.id} className="relative cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <TableCell className="px-4 py-3 font-semibold text-gray-800 text-sm">
                    <InstantLink href={`/proveedores/${s.id}`} aria-label={`Ver proveedor ${s.nombre}`} className="absolute inset-0">
                      <span className="sr-only">Ver detalle</span>
                    </InstantLink>
                    {s.nombre}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-400 text-sm font-mono">{s.rut ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-gray-600 text-sm">{s.contacto ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-gray-400 text-sm">{s.telefono ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-right font-semibold text-gray-700 text-sm">{s._count.purchaseOrders}</TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${s.activo ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                      {s.activo ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3 relative z-10">
                    <InstantLink href={`/proveedores/${s.id}`}>
                      <button type="button" className="p-1.5 rounded-md text-gray-400 hover:text-[#253158] hover:bg-gray-100 transition-colors" title="Ver proveedor">
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
