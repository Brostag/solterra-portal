import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";

type FiltroActivo = "activos" | "inactivos";

interface Props {
  searchParams: Promise<{ q?: string; filtro?: string }>;
}

export default async function ProductosPage({ searchParams }: Props) {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const { q, filtro } = await searchParams;
  const query = q?.trim() ?? "";
  const filtroActivo: FiltroActivo | undefined =
    filtro === "activos" || filtro === "inactivos" ? filtro : undefined;

  const [products, totalActivos, totalInactivos] = await Promise.all([
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
    prisma.product.count({ where: { activo: true } }),
    prisma.product.count({ where: { activo: false } }),
  ]);

  function buildHref(f?: FiltroActivo) {
    const params = new URLSearchParams();
    if (f) params.set("filtro", f);
    if (query) params.set("q", query);
    const qs = params.toString();
    return `/productos${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Productos y Servicios</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalActivos} activos
            {totalInactivos > 0 && ` · ${totalInactivos} inactivos`}
            {query && ` · búsqueda: "${query}"`}
          </p>
        </div>
        {session.rol !== "USUARIO" && (
          <Link href="/productos/nuevo">
            <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              <Plus className="h-4 w-4" />
              Nuevo
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
            placeholder="Buscar por nombre o código..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] w-72"
          />
          {filtroActivo && <input type="hidden" name="filtro" value={filtroActivo} />}
        </form>

        <div className="flex gap-1.5">
          {(["", "activos", "inactivos"] as const).map((f) => {
            const isActive = (f === "" && !filtroActivo) || filtroActivo === f;
            const label = f === "" ? "Todos" : f === "activos" ? "Activos" : "Inactivos";
            return (
              <Link key={f} href={buildHref(f as FiltroActivo | undefined)}>
                <span className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border ${isActive ? "bg-[#253158] text-white border-[#253158]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Precio Unit.</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</TableHead>
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
                <TableRow key={p.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <TableCell className="px-5 py-4 font-mono text-[#253158] font-semibold text-sm">{p.codigo_interno ?? "—"}</TableCell>
                  <TableCell className="px-5 py-4 font-semibold text-gray-800 text-sm">{p.nombre}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-400 text-sm">{p.descripcion ?? "—"}</TableCell>
                  <TableCell className="px-5 py-4 text-right font-semibold text-gray-800 text-sm">
                    {formatCurrency(Number(p.precio_unitario), "CLP")}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${p.activo ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-4">
                    <Link href={`/productos/${p.id}`}>
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
