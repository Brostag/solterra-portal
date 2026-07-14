import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { formatCurrency } from "@/lib/currency";
import { formatContractDisplayNumber } from "@/lib/contracts";
import Link from "next/link";
import KpiCard from "@/components/portal/KpiCard";
import { AppTourAutoStart } from "@/components/portal/AppTour";
import {
  FileText,
  Building2,
  ShoppingCart,
  FolderOpen,
  Plus,
  Calculator,
  Upload,
  Eye,
  BookOpen,
} from "lucide-react";

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

function fmtFecha(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const getDashboardStats = unstable_cache(
  async () => {
    // Todos los contadores en UNA sola query agregada (1 round-trip) para no
    // serializar varios count/groupBy en el pool de conexiones. Las 3 listas
    // "recientes" (take 5) van en paralelo. Total: 4 queries (antes 9).
    const [agg, ultimosContratos, ultimasOC, empresasRecientes] = await Promise.all([
      prisma.$queryRaw<Array<{
        contratos_total: bigint; contratos_borrador: bigint; contratos_vigentes: bigint; contratos_finalizados: bigint;
        empresas_total: bigint; empresas_clientes: bigint; empresas_prov: bigint;
        oc_total: bigint; oc_encurso: bigint; oc_aprobadas: bigint; documentos_total: bigint;
      }>>`
        SELECT
          (SELECT count(*) FROM contracts) AS contratos_total,
          (SELECT count(*) FROM contracts WHERE estado = 'BORRADOR') AS contratos_borrador,
          (SELECT count(*) FROM contracts WHERE estado = 'VIGENTE') AS contratos_vigentes,
          (SELECT count(*) FROM contracts WHERE estado = 'FINALIZADO') AS contratos_finalizados,
          (SELECT count(*) FROM companies) AS empresas_total,
          (SELECT count(*) FROM companies WHERE es_cliente OR es_arrendataria) AS empresas_clientes,
          (SELECT count(*) FROM companies WHERE es_proveedor) AS empresas_prov,
          (SELECT count(*) FROM purchase_orders WHERE activo) AS oc_total,
          (SELECT count(*) FROM purchase_orders WHERE activo AND estado IN ('BORRADOR','EMITIDA','ENVIADA')) AS oc_encurso,
          (SELECT count(*) FROM purchase_orders WHERE activo AND estado = 'APROBADA') AS oc_aprobadas,
          (SELECT count(*) FROM documents) AS documentos_total
      `,
      prisma.contract.findMany({
        take: 5,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          numero_contrato: true,
          estado: true,
          fecha_emision: true,
          cliente_nombre_snapshot: true,
          client: { select: { nombre: true } },
        },
      }),
      prisma.purchaseOrder.findMany({
        take: 5,
        orderBy: { created_at: "desc" },
        where: { activo: true },
        select: {
          id: true,
          numero: true,
          estado: true,
          total: true,
          moneda: true,
          proveedor: { select: { nombre: true } },
        },
      }),
      prisma.company.findMany({
        take: 5,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          nombre_razon_social: true,
          rut: true,
          es_cliente: true,
          es_proveedor: true,
          es_arrendataria: true,
          es_otro: true,
        },
      }),
    ]);

    const a = agg[0];
    const num = (v: bigint | number | null | undefined) => Number(v ?? 0);

    return {
      totalContratos: num(a?.contratos_total),
      contratosBorrador: num(a?.contratos_borrador),
      contratosVigentes: num(a?.contratos_vigentes),
      contratosFinalizados: num(a?.contratos_finalizados),
      totalEmpresas: num(a?.empresas_total),
      empresasClientes: num(a?.empresas_clientes),
      empresasProveedores: num(a?.empresas_prov),
      totalOC: num(a?.oc_total),
      ocEnCurso: num(a?.oc_encurso),
      ocAprobadas: num(a?.oc_aprobadas),
      totalDocumentos: num(a?.documentos_total),
      ultimosContratos: ultimosContratos.map((c) => ({
        id: c.id,
        numero: formatContractDisplayNumber(c.numero_contrato, c.fecha_emision),
        estado: c.estado,
        fecha: fmtFecha(c.fecha_emision),
        empresa: c.cliente_nombre_snapshot ?? c.client?.nombre ?? "—",
      })),
      ultimasOC: ultimasOC.map((o) => ({
        id: o.id,
        numero: o.numero,
        estado: o.estado,
        total: formatCurrency(Number(o.total), o.moneda),
        proveedor: o.proveedor?.nombre ?? "—",
      })),
      empresasRecientes: empresasRecientes.map((e) => ({
        id: e.id,
        nombre: e.nombre_razon_social,
        rut: e.rut ?? "—",
        roles: [
          e.es_cliente && "Cliente",
          e.es_arrendataria && "Arrendataria",
          e.es_proveedor && "Proveedor",
          e.es_otro && "Otro",
        ].filter(Boolean) as string[],
      })),
    };
  },
  [DASHBOARD_STATS_TAG],
  { revalidate: 60, tags: [DASHBOARD_STATS_TAG] },
);

const CONTRATO_BADGE: Record<string, string> = {
  BORRADOR:   "bg-gray-100  text-gray-600  border border-gray-200",
  VIGENTE:    "bg-green-50  text-green-700 border border-green-200",
  FINALIZADO: "bg-blue-50   text-blue-700  border border-blue-200",
  ANULADO:    "bg-red-50    text-red-600   border border-red-200",
};

const OC_BADGE: Record<string, string> = {
  BORRADOR:  "bg-gray-100  text-gray-600  border border-gray-200",
  EMITIDA:   "bg-blue-50   text-blue-700  border border-blue-200",
  ENVIADA:   "bg-amber-50  text-amber-700 border border-amber-200",
  APROBADA:  "bg-green-50  text-green-700 border border-green-200",
  RECHAZADA: "bg-red-50    text-red-600   border border-red-200",
  ANULADA:   "bg-red-50    text-red-600   border border-red-200",
};

function Badge({ estado, map }: { estado: string; map: Record<string, string> }) {
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${map[estado] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
      {estado}
    </span>
  );
}

const CARDS = [
  { href: "/contratos",      icon: FileText,     label: "Contratos Marco", key: "contratos" },
  { href: "/empresas",       icon: Building2,    label: "Empresas",        key: "empresas" },
  { href: "/ordenes-compra", icon: ShoppingCart, label: "Órdenes de Compra", short: "OC", key: "oc" },
  { href: "/documentos",     icon: FolderOpen,   label: "Documentos",      key: "documentos" },
] as const;

const ACTIONS = [
  { href: "/contratos/nuevo",      icon: Plus,         label: "Nuevo Contrato Marco", primary: true },
  { href: "/empresas/nuevo",       icon: Building2,    label: "Nueva Empresa" },
  { href: "/ordenes-compra/nueva", icon: ShoppingCart, label: "Nueva OC" },
  { href: "/documentos",           icon: Upload,       label: "Subir documento" },
  { href: "/cotizador",            icon: Calculator,   label: "Cotizador" },
] as const;

export default async function DashboardPage() {
  const [session, stats] = await Promise.all([
    getPortalSessionFast(),
    getDashboardStats(),
  ]);
  if (!session) redirect("/login");

  const cardData: Record<string, { value: number; sub: string }> = {
    contratos:  { value: stats.totalContratos, sub: `${stats.contratosBorrador} borrador · ${stats.contratosVigentes} vigentes` },
    empresas:   { value: stats.totalEmpresas,  sub: `${stats.empresasClientes} clientes · ${stats.empresasProveedores} prov.` },
    oc:         { value: stats.totalOC,        sub: `${stats.ocEnCurso} en curso · ${stats.ocAprobadas} aprob.` },
    documentos: { value: stats.totalDocumentos, sub: stats.totalDocumentos === 1 ? "archivo registrado" : "archivos registrados" },
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Encabezado */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Módulo Comercial
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158] leading-tight">
          {getGreeting()}, {session.nombre}
        </h1>
        <p className="mt-1 text-sm text-gray-400">{getFechaHoy()}</p>
        <Link
          href="/ayuda"
          className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-[#253158]"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Guía de uso
        </Link>
      </header>

      {/* KPIs */}
      <div data-tour="kpis" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CARDS.map((c) => {
          const d = cardData[c.key];
          return (
            <KpiCard
              key={c.key}
              icon={c.icon}
              value={d.value}
              label={
                "short" in c && c.short ? (
                  <>
                    <span className="sm:hidden">{c.short}</span>
                    <span className="hidden sm:inline">{c.label}</span>
                  </>
                ) : (
                  c.label
                )
              }
              sub={d.sub}
              href={c.href}
              showArrow
            />
          );
        })}
      </div>

      {/* Acciones rápidas */}
      <div data-tour="acciones" className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
          Acciones rápidas
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            const primary = "primary" in a && a.primary;
            return (
              <Link
                key={a.href + a.label}
                href={a.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 min-h-[48px] transition-colors duration-150 ${
                  primary
                    ? "bg-[#253158] hover:bg-[#1e305e] active:bg-[#1e305e]"
                    : "bg-white border border-gray-200 hover:border-[#253158] hover:bg-[#253158]/5 active:bg-[#253158]/5"
                }`}
              >
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md flex-shrink-0 ${primary ? "bg-white/20" : "bg-gray-100"}`}>
                  <Icon className={`h-4 w-4 ${primary ? "text-white" : "text-[#253158]"}`} />
                </span>
                <span className={`text-[13px] font-semibold leading-tight ${primary ? "text-white" : "text-[#253158]"}`}>
                  {a.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Últimos contratos + Últimas OC */}
      <div data-tour="listas" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Últimos contratos marco */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-[#253158]">Últimos contratos marco</h2>
            <Link href="/contratos" className="text-xs text-[#253158] hover:underline">Ver todos</Link>
          </div>
          {stats.ultimosContratos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-7">
              <FileText className="h-7 w-7 text-gray-400 opacity-35" />
              <p className="text-[13px] text-gray-400">Aún no hay contratos.</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <table className="hidden sm:table w-full">
                <tbody>
                  {stats.ultimosContratos.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{c.numero}</td>
                      <td className="px-2 py-3 text-sm text-gray-500 max-w-[160px] truncate">{c.empresa}</td>
                      <td className="px-2 py-3 text-xs text-gray-400 whitespace-nowrap">{c.fecha}</td>
                      <td className="px-2 py-3"><Badge estado={c.estado} map={CONTRATO_BADGE} /></td>
                      <td className="px-3 py-3 text-right">
                        <Link href={`/contratos/${c.id}`} className="inline-flex p-1.5 rounded-md text-gray-400 hover:text-[#253158] hover:bg-gray-100" title="Ver contrato">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Móvil */}
              <div className="sm:hidden divide-y divide-gray-100">
                {stats.ultimosContratos.map((c) => (
                  <Link key={c.id} href={`/contratos/${c.id}`} className="flex items-center justify-between gap-2 px-4 py-3 active:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{c.numero}</p>
                      <p className="text-xs text-gray-400 truncate">{c.empresa} · {c.fecha}</p>
                    </div>
                    <Badge estado={c.estado} map={CONTRATO_BADGE} />
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Últimas OC */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-[#253158]">Últimas órdenes de compra</h2>
            <Link href="/ordenes-compra" className="text-xs text-[#253158] hover:underline">Ver todas</Link>
          </div>
          {stats.ultimasOC.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-7">
              <ShoppingCart className="h-7 w-7 text-gray-400 opacity-35" />
              <p className="text-[13px] text-gray-400">Aún no hay órdenes de compra.</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <table className="hidden sm:table w-full">
                <tbody>
                  {stats.ultimasOC.map((o) => (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{o.numero}</td>
                      <td className="px-2 py-3 text-sm text-gray-500 max-w-[140px] truncate">{o.proveedor}</td>
                      <td className="px-2 py-3 text-sm text-gray-700 tabular-nums whitespace-nowrap">{o.total}</td>
                      <td className="px-2 py-3"><Badge estado={o.estado} map={OC_BADGE} /></td>
                      <td className="px-3 py-3 text-right">
                        <Link href={`/ordenes-compra/${o.id}`} className="inline-flex p-1.5 rounded-md text-gray-400 hover:text-[#253158] hover:bg-gray-100" title="Ver OC">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Móvil */}
              <div className="sm:hidden divide-y divide-gray-100">
                {stats.ultimasOC.map((o) => (
                  <Link key={o.id} href={`/ordenes-compra/${o.id}`} className="flex items-center justify-between gap-2 px-4 py-3 active:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{o.numero}</p>
                      <p className="text-xs text-gray-400 truncate">{o.proveedor}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-700 tabular-nums">{o.total}</span>
                      <Badge estado={o.estado} map={OC_BADGE} />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Empresas recientes */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-[#253158]">Empresas recientes</h2>
          <Link href="/empresas" className="text-xs text-[#253158] hover:underline">Ver todas</Link>
        </div>
        {stats.empresasRecientes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-7">
            <Building2 className="h-7 w-7 text-gray-400 opacity-35" />
            <p className="text-[13px] text-gray-400">Aún no hay empresas.</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <table className="hidden sm:table w-full">
              <tbody>
                {stats.empresasRecientes.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800 max-w-[260px] truncate">{e.nombre}</td>
                    <td className="px-2 py-3 text-sm text-gray-500 whitespace-nowrap">{e.rut}</td>
                    <td className="px-2 py-3 text-xs text-gray-400">{e.roles.length ? e.roles.join(" · ") : "—"}</td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/empresas/${e.id}`} className="inline-flex p-1.5 rounded-md text-gray-400 hover:text-[#253158] hover:bg-gray-100" title="Ver empresa">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Móvil */}
            <div className="sm:hidden divide-y divide-gray-100">
              {stats.empresasRecientes.map((e) => (
                <Link key={e.id} href={`/empresas/${e.id}`} className="block px-4 py-3 active:bg-gray-50">
                  <p className="text-sm font-medium text-gray-800 truncate">{e.nombre}</p>
                  <p className="text-xs text-gray-400">{e.rut}{e.roles.length ? ` · ${e.roles.join(" · ")}` : ""}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Tour guiado (isla cliente, render null). Auto-inicio solo en 1ª visita de escritorio. */}
      <AppTourAutoStart module="COMERCIAL" />
    </div>
  );
}
