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
import { FileText, Users, Package, TrendingUp, FolderOpen, ShoppingCart, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

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
      <div>
        <h1 className="text-2xl font-bold text-[#253158]">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Bienvenido, {session.nombre}
        </p>
      </div>

      {/* Accesos principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Facturas */}
        <Link href="/facturas" className="group block">
          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#253158] hover:shadow-md transition-all duration-200 h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-[#253158]/10 rounded-lg">
                <FileText className="h-6 w-6 text-[#253158]" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#253158] group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-2xl font-bold text-[#253158]">{stats.totalFacturas}</p>
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

        {/* Órdenes de Compra */}
        <Link href="/ordenes-compra" className="group block">
          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#253158] hover:shadow-md transition-all duration-200 h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-[#253158]/10 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-[#253158]" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#253158] group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-2xl font-bold text-[#253158]">{stats.totalOC}</p>
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

        {/* Documentos */}
        <Link href="/documentos" className="group block">
          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#253158] hover:shadow-md transition-all duration-200 h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-[#253158]/10 rounded-lg">
                <FolderOpen className="h-6 w-6 text-[#253158]" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#253158] group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-2xl font-bold text-[#253158]">{stats.totalDocumentos}</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">Documentos</p>
            <p className="text-xs text-gray-400 mt-2">
              {stats.totalDocumentos === 1 ? "archivo registrado" : "archivos registrados"}
            </p>
          </div>
        </Link>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Facturas
            </CardTitle>
            <FileText className="h-4 w-4 text-[#253158]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#253158]">
              {stats.totalFacturas}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pendientes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.facturasCreadas + stats.facturasEnviadas}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.facturasCreadas} creadas · {stats.facturasEnviadas} enviadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Clientes Activos
            </CardTitle>
            <Users className="h-4 w-4 text-[#253158]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#253158]">
              {stats.totalClientes}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Productos Activos
            </CardTitle>
            <Package className="h-4 w-4 text-[#253158]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#253158]">
              {stats.totalProductos}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estados de factura */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Creadas", value: stats.facturasCreadas, color: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Enviadas", value: stats.facturasEnviadas, color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
          { label: "Pagadas", value: stats.facturasPagadas, color: "bg-green-50 border-green-200 text-green-700" },
          { label: "Anuladas", value: stats.facturasAnuladas, color: "bg-red-50 border-red-200 text-red-600" },
        ].map((item) => (
          <div
            key={item.label}
            className={`border rounded-lg p-4 text-center ${item.color}`}
          >
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-sm font-medium mt-1">{item.label}</p>
          </div>
        ))}
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
        <CardContent>
          {stats.ultimasFacturas.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              No hay facturas aún
            </p>
          ) : (
            <div className="space-y-3">
              {stats.ultimasFacturas.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/facturas/${inv.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      #{inv.numero_factura}
                    </p>
                    <p className="text-xs text-gray-500">
                      {inv.client.nombre}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">
                      {formatCurrency(Number(inv.total), inv.moneda as "CLP" | "USD" | "UF")}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoBadge[inv.estado]}`}
                    >
                      {inv.estado}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
