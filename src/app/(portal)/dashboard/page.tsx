import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Users,
  Package,
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

async function getDashboardStats() {
  const [
    totalFacturas,
    facturasCreadas,
    facturasEnviadas,
    facturasPagadas,
    facturasAnuladas,
    totalClientes,
    totalProductos,
    totalDocumentos,
    ultimasFacturas,
    totalOC,
    ocPendientes,
    ocAprobadas,
  ] = await Promise.all([
    prisma.invoice.count(),
    prisma.invoice.count({ where: { estado: "CREADA" } }),
    prisma.invoice.count({ where: { estado: "ENVIADA" } }),
    prisma.invoice.count({ where: { estado: "PAGADA" } }),
    prisma.invoice.count({ where: { estado: "ANULADA" } }),
    prisma.client.count({ where: { activo: true } }),
    prisma.product.count({ where: { activo: true } }),
    prisma.document.count(),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { created_at: "desc" },
      include: { client: { select: { nombre: true } } },
    }),
    prisma.purchaseOrder.count({ where: { activo: true } }),
    prisma.purchaseOrder.count({
      where: { activo: true, estado: { in: ["BORRADOR", "EMITIDA", "ENVIADA"] } },
    }),
    prisma.purchaseOrder.count({ where: { activo: true, estado: "APROBADA" } }),
  ]);

  return {
    totalFacturas,
    facturasCreadas,
    facturasEnviadas,
    facturasPagadas,
    facturasAnuladas,
    totalClientes,
    totalProductos,
    totalDocumentos,
    ultimasFacturas,
    totalOC,
    ocPendientes,
    ocAprobadas,
  };
}

const estadoBadge: Record<string, string> = {
  CREADA: "bg-blue-100 text-blue-700",
  ENVIADA: "bg-yellow-100 text-yellow-700",
  PAGADA: "bg-green-100 text-green-700",
  ANULADA: "bg-red-100 text-red-600",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <p className="text-xs text-gray-400 mb-1">{getFechaHoy()}</p>
        <h1 className="text-2xl font-bold text-[#253158]">
          {getGreeting()}, {session.nombre}
        </h1>
      </div>

      {/* Accesos principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/facturas" className="group block">
          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#253158] hover:shadow-md transition-all duration-200 h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-[#253158]/10 rounded-lg">
                <FileText className="h-7 w-7 text-[#253158]" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#253158] group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-3xl font-bold text-[#253158]">{stats.totalFacturas}</p>
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
          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#253158] hover:shadow-md transition-all duration-200 h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-[#253158]/10 rounded-lg">
                <ShoppingCart className="h-7 w-7 text-[#253158]" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#253158] group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-3xl font-bold text-[#253158]">{stats.totalOC}</p>
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
          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#253158] hover:shadow-md transition-all duration-200 h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-[#253158]/10 rounded-lg">
                <FolderOpen className="h-7 w-7 text-[#253158]" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#253158] group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-3xl font-bold text-[#253158]">{stats.totalDocumentos}</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">Documentos</p>
            <p className="text-xs text-gray-400 mt-2">
              {stats.totalDocumentos === 1 ? "archivo registrado" : "archivos registrados"}
            </p>
          </div>
        </Link>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-[#253158] rounded-xl p-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-white/50 mb-4">
          Acciones rápidas
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/facturas/nueva"
            className="flex items-center gap-3 bg-white/20 hover:bg-white/30 rounded-lg px-4 py-3 transition-colors"
          >
            <div className="p-1.5 bg-white/20 rounded-md flex-shrink-0">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Crear factura</p>
              <p className="text-xs text-white/60 leading-tight mt-0.5">Asistente paso a paso</p>
            </div>
          </Link>

          <Link
            href="/ordenes-compra/nueva"
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-lg px-4 py-3 transition-colors"
          >
            <div className="p-1.5 bg-white/10 rounded-md flex-shrink-0">
              <ShoppingCart className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Nueva OC</p>
              <p className="text-xs text-white/60 leading-tight mt-0.5">Para tus proveedores</p>
            </div>
          </Link>

          <Link
            href="/documentos"
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-lg px-4 py-3 transition-colors"
          >
            <div className="p-1.5 bg-white/10 rounded-md flex-shrink-0">
              <Upload className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Subir documento</p>
              <p className="text-xs text-white/60 leading-tight mt-0.5">Contrato, guía…</p>
            </div>
          </Link>

          <Link
            href="/clientes/nuevo"
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-lg px-4 py-3 transition-colors"
          >
            <div className="p-1.5 bg-white/10 rounded-md flex-shrink-0">
              <UserPlus className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Nuevo cliente</p>
              <p className="text-xs text-white/60 leading-tight mt-0.5">Empresa o persona</p>
            </div>
          </Link>
        </div>
      </div>

      {/* KPIs compactos */}
      <div className="flex flex-wrap gap-2">
        {[
          {
            icon: Clock,
            label: "Pendientes de pago",
            value: stats.facturasCreadas + stats.facturasEnviadas,
            accent: (stats.facturasCreadas + stats.facturasEnviadas) > 0,
          },
          { icon: Users, label: "Clientes activos", value: stats.totalClientes, accent: false },
          { icon: Package, label: "Productos activos", value: stats.totalProductos, accent: false },
          {
            icon: ShoppingCart,
            label: "OC en curso",
            value: stats.ocPendientes,
            accent: stats.ocPendientes > 0,
          },
        ].map(({ icon: Icon, label, value, accent }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-lg px-4 py-2.5"
          >
            <Icon className={`h-4 w-4 flex-shrink-0 ${accent ? "text-amber-500" : "text-[#253158]"}`} />
            <span className="text-sm text-gray-500">{label}</span>
            <span className={`text-sm font-bold ${accent ? "text-amber-600" : "text-[#253158]"}`}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Estado de facturas */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-[#253158] mb-4">Estado de facturas</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Creadas", value: stats.facturasCreadas, color: "bg-blue-50 border-blue-200 text-blue-700" },
            { label: "Enviadas", value: stats.facturasEnviadas, color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
            { label: "Pagadas", value: stats.facturasPagadas, color: "bg-green-50 border-green-200 text-green-700" },
            { label: "Anuladas", value: stats.facturasAnuladas, color: "bg-red-50 border-red-200 text-[#c6352e]" },
          ].map((item) => (
            <div
              key={item.label}
              className={`border rounded-lg p-3 text-center ${item.color}`}
            >
              <p className="text-xl font-bold">{item.value}</p>
              <p className="text-xs font-medium mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Últimas facturas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#253158]">
            Últimas Facturas
          </CardTitle>
          <Link
            href="/facturas"
            className="text-sm text-[#253158] hover:underline font-medium"
          >
            Ver todas →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {stats.ultimasFacturas.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8 px-6">
              No hay facturas aún
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                      N° Factura
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      Cliente
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      Total
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      Estado
                    </th>
                    <th className="w-8 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.ultimasFacturas.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <Link
                          href={`/facturas/${inv.id}`}
                          className="font-mono text-xs font-medium text-gray-800 hover:text-[#253158]"
                        >
                          #{inv.numero_factura}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 max-w-[180px] truncate">
                        {inv.client.nombre}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-gray-800 font-mono text-xs">
                        {formatCurrency(Number(inv.total), inv.moneda as "CLP" | "USD" | "UF")}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoBadge[inv.estado] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {inv.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/facturas/${inv.id}`}>
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
