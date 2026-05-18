import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { formatCurrency } from "@/lib/currency";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  FolderOpen,
  ShoppingCart,
  ArrowRight,
  Clock,
  Plus,
  Upload,
  UserPlus,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export const DASHBOARD_STATS_TAG = "dashboard-stats";

function getFechaHoy(): string {
  const fecha = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

function getGreeting(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

const getDashboardStats = unstable_cache(
  async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // 9 queries instead of 15: invoice/OC status counts use groupBy
  const [
    invoicesByEstado,
    totalClientes,
    totalClientesRegistrados,
    totalProductos,
    totalDocumentos,
    ultimasFacturas,
    ocByEstado,
    facturadoEsteMes,
    facturadoMesPasado,
  ] = await Promise.all([
    prisma.invoice.groupBy({ by: ["estado"], _count: { id: true } }),
    prisma.client.count({ where: { activo: true } }),
    prisma.client.count(),
    prisma.product.count({ where: { activo: true } }),
    prisma.document.count(),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { created_at: "desc" },
      include: { client: { select: { nombre: true } } },
    }),
    prisma.purchaseOrder.groupBy({ by: ["estado"], where: { activo: true }, _count: { id: true } }),
    prisma.invoice.aggregate({
      where: { created_at: { gte: startOfMonth }, estado: { not: "ANULADA" } },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { created_at: { gte: startOfLastMonth, lte: endOfLastMonth }, estado: { not: "ANULADA" } },
      _sum: { total: true },
    }),
  ]);

  // Derive invoice counts from groupBy
  const invCount: Record<string, number> = {};
  let totalFacturas = 0;
  for (const g of invoicesByEstado) {
    invCount[g.estado] = g._count.id;
    totalFacturas += g._count.id;
  }
  const facturasCreadas = invCount["CREADA"] ?? 0;
  const facturasEnviadas = invCount["ENVIADA"] ?? 0;
  const facturasPagadas = invCount["PAGADA"] ?? 0;
  const facturasAnuladas = invCount["ANULADA"] ?? 0;

  // Derive OC counts from groupBy
  const ocCount: Record<string, number> = {};
  let totalOC = 0;
  for (const g of ocByEstado) {
    ocCount[g.estado] = g._count.id;
    totalOC += g._count.id;
  }
  const ocPendientes = (ocCount["BORRADOR"] ?? 0) + (ocCount["EMITIDA"] ?? 0) + (ocCount["ENVIADA"] ?? 0);
  const ocAprobadas = ocCount["APROBADA"] ?? 0;

  const montoMes = Number(facturadoEsteMes._sum.total ?? 0);
  const montoMesPasado = Number(facturadoMesPasado._sum.total ?? 0);
  const pctCambioFacturado =
    montoMesPasado > 0 ? ((montoMes - montoMesPasado) / montoMesPasado) * 100 : null;

  return {
    totalFacturas,
    facturasCreadas,
    facturasEnviadas,
    facturasPagadas,
    facturasAnuladas,
    totalClientes,
    totalClientesRegistrados,
    totalProductos,
    totalDocumentos,
    ultimasFacturas,
    totalOC,
    ocPendientes,
    ocAprobadas,
    montoFacturadoEsteMes: montoMes,
    pctCambioFacturado,
  };
  },
  [DASHBOARD_STATS_TAG],
  { revalidate: 60, tags: [DASHBOARD_STATS_TAG] }
);

const estadoBadge: Record<string, string> = {
  CREADA:  "bg-blue-50  text-blue-700  border border-blue-200",
  ENVIADA: "bg-amber-50 text-amber-700 border border-amber-200",
  PAGADA:  "bg-green-50 text-green-700 border border-green-200",
  ANULADA: "bg-red-50   text-red-600   border border-red-200",
};

export default async function DashboardPage() {
  const [session, stats] = await Promise.all([
    getPortalSessionFast(),
    getDashboardStats(),
  ]);
  if (!session) redirect("/login");

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Saludo */}
      <div>
        <p className="text-xs text-gray-400 mb-1">{getFechaHoy()}</p>
        <h1 className="text-xl sm:text-2xl font-bold text-[#253158]">
          {getGreeting()}, {session.nombre}
        </h1>
      </div>

      {/* Accesos principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Link href="/facturas" className="group block">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-[#253158] hover:shadow-md transition-all duration-200 h-full">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-2.5 bg-[#253158]/10 rounded-lg">
                <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-[#253158]" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#253158] group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[#253158]">{stats.totalFacturas}</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">Facturas</p>
            {(stats.facturasCreadas + stats.facturasEnviadas) > 0 ? (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {stats.facturasCreadas + stats.facturasEnviadas} pendientes
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-2">Sin pendientes</p>
            )}
          </div>
        </Link>

        <Link href="/ordenes-compra" className="group block">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-[#253158] hover:shadow-md transition-all duration-200 h-full">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-2.5 bg-[#253158]/10 rounded-lg">
                <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 text-[#253158]" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#253158] group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[#253158]">{stats.totalOC}</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">Órdenes de Compra</p>
            {stats.ocPendientes > 0 ? (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {stats.ocPendientes} en curso
              </p>
            ) : stats.ocAprobadas > 0 ? (
              <p className="text-xs text-green-600 mt-2">{stats.ocAprobadas} aprobadas</p>
            ) : (
              <p className="text-xs text-gray-400 mt-2">Sin órdenes activas</p>
            )}
          </div>
        </Link>

        <Link href="/documentos" className="group block">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-[#253158] hover:shadow-md transition-all duration-200 h-full">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-2.5 bg-[#253158]/10 rounded-lg">
                <FolderOpen className="h-6 w-6 sm:h-7 sm:w-7 text-[#253158]" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#253158] group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[#253158]">{stats.totalDocumentos}</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">Documentos</p>
            <p className="text-xs text-gray-400 mt-2">
              {stats.totalDocumentos === 1 ? "archivo registrado" : "archivos registrados"}
            </p>
          </div>
        </Link>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3 sm:mb-4">
          Acciones rápidas
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {/* CTA primario */}
          <Link
            href="/facturas/nueva"
            className="flex items-center gap-2 sm:gap-3 bg-[#253158] hover:bg-[#1d2a4f] rounded-lg px-3 sm:px-4 py-3 transition-colors"
          >
            <div className="p-1.5 bg-white/20 rounded-md flex-shrink-0">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Crear factura</p>
              <p className="text-xs text-white/70 leading-tight mt-0.5 hidden xs:block sm:block">Asistente paso a paso</p>
            </div>
          </Link>

          {/* Acciones secundarias */}
          <Link
            href="/ordenes-compra/nueva"
            className="group flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 hover:bg-[#253158] hover:border-[#253158] rounded-lg px-3 sm:px-4 py-3 transition-colors"
          >
            <div className="p-1.5 bg-gray-100 group-hover:bg-white/20 rounded-md flex-shrink-0 transition-colors">
              <ShoppingCart className="h-4 w-4 text-[#253158] group-hover:text-white transition-colors" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-700 group-hover:text-white leading-tight transition-colors">Nueva OC</p>
              <p className="text-xs text-gray-400 group-hover:text-white/70 leading-tight mt-0.5 hidden sm:block transition-colors">Para tus proveedores</p>
            </div>
          </Link>

          <Link
            href="/documentos"
            className="group flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 hover:bg-[#253158] hover:border-[#253158] rounded-lg px-3 sm:px-4 py-3 transition-colors"
          >
            <div className="p-1.5 bg-gray-100 group-hover:bg-white/20 rounded-md flex-shrink-0 transition-colors">
              <Upload className="h-4 w-4 text-[#253158] group-hover:text-white transition-colors" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-700 group-hover:text-white leading-tight transition-colors">Subir documento</p>
              <p className="text-xs text-gray-400 group-hover:text-white/70 leading-tight mt-0.5 hidden sm:block transition-colors">Contrato, guía…</p>
            </div>
          </Link>

          <Link
            href="/clientes/nuevo"
            className="group flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 hover:bg-[#253158] hover:border-[#253158] rounded-lg px-3 sm:px-4 py-3 transition-colors"
          >
            <div className="p-1.5 bg-gray-100 group-hover:bg-white/20 rounded-md flex-shrink-0 transition-colors">
              <UserPlus className="h-4 w-4 text-[#253158] group-hover:text-white transition-colors" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-700 group-hover:text-white leading-tight transition-colors">Nuevo cliente</p>
              <p className="text-xs text-gray-400 group-hover:text-white/70 leading-tight mt-0.5 hidden sm:block transition-colors">Empresa o persona</p>
            </div>
          </Link>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
            Facturado este mes
          </p>
          <p className="text-xl sm:text-2xl font-bold text-[#253158] break-all">
            {formatCurrency(stats.montoFacturadoEsteMes, "CLP")}
          </p>
          {stats.pctCambioFacturado !== null && (
            <p
              className={`text-xs mt-1.5 ${
                stats.pctCambioFacturado >= 0 ? "text-green-600" : "text-red-500"
              }`}
            >
              {stats.pctCambioFacturado >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(stats.pctCambioFacturado).toFixed(1)}% vs mes anterior
            </p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
            Pendientes de pago
          </p>
          <p className={`text-2xl sm:text-3xl font-bold ${(stats.facturasCreadas + stats.facturasEnviadas) > 0 ? "text-amber-600" : "text-[#253158]"}`}>
            {stats.facturasCreadas + stats.facturasEnviadas}
          </p>
          <p className="text-xs text-gray-400 mt-1.5">
            {stats.facturasCreadas} creadas · {stats.facturasEnviadas} enviadas
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
            Clientes activos
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[#253158]">{stats.totalClientes}</p>
          <p className="text-xs text-gray-400 mt-1.5">
            de {stats.totalClientesRegistrados} registrados
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
            Productos activos
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[#253158]">{stats.totalProductos}</p>
          <p className="text-xs text-gray-400 mt-1.5">en catálogo</p>
        </div>
      </div>

      {/* Estado de facturas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Creadas",  value: stats.facturasCreadas,  bg: "bg-blue-50",   text: "text-blue-700"   },
          { label: "Enviadas", value: stats.facturasEnviadas, bg: "bg-amber-50",  text: "text-amber-600"  },
          { label: "Pagadas",  value: stats.facturasPagadas,  bg: "bg-green-50",  text: "text-green-700"  },
          { label: "Anuladas", value: stats.facturasAnuladas, bg: "bg-red-50",    text: "text-red-600"    },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-xl p-4 sm:p-5 ${item.bg}`}
          >
            <p className={`text-2xl sm:text-3xl font-bold ${item.text}`}>{item.value}</p>
            <p className={`text-sm font-semibold mt-1.5 ${item.text}`}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Últimas facturas */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-[#253158]">Últimas facturas</h3>
          <Link
            href="/facturas"
            className="text-sm text-[#253158]/70 hover:text-[#253158] font-medium transition-colors"
          >
            Ver todas →
          </Link>
        </div>

        {stats.ultimasFacturas.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No hay facturas aún</p>
        ) : (
          <>
            {/* Móvil: lista de cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {stats.ultimasFacturas.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/facturas/${inv.id}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-gray-500">
                        #{inv.numero_factura}
                      </span>
                      <span
                        className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold ${estadoBadge[inv.estado] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}
                      >
                        {inv.estado}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[#253158] truncate">
                      {inv.client.nombre}
                    </p>
                    <p className="text-xs font-semibold text-gray-700 font-mono tabular-nums mt-0.5">
                      {formatCurrency(Number(inv.total), inv.moneda as "CLP" | "USD" | "UF")}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 ml-3" />
                </Link>
              ))}
            </div>

            {/* Desktop: tabla */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">
                      Nº Factura
                    </th>
                    <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 py-3">
                      Cliente
                    </th>
                    <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 py-3">
                      Total
                    </th>
                    <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 py-3">
                      Estado
                    </th>
                    <th className="w-8 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {stats.ultimasFacturas.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-gray-200 hover:bg-gray-50/60 transition-colors last:border-0"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/facturas/${inv.id}`}
                          className="font-mono text-xs font-bold text-gray-800 hover:text-[#253158] transition-colors"
                        >
                          #{inv.numero_factura}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#253158] font-medium max-w-[200px] truncate">
                        {inv.client.nombre}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-sm text-gray-800 font-mono tabular-nums">
                        {formatCurrency(Number(inv.total), inv.moneda as "CLP" | "USD" | "UF")}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center text-[11px] px-2.5 py-1 rounded-full font-semibold ${estadoBadge[inv.estado] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}
                        >
                          {inv.estado}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link href={`/facturas/${inv.id}`}>
                          <ChevronRight className="h-4 w-4 text-gray-300 hover:text-gray-500 transition-colors" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
