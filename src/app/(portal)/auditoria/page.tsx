import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";
import InstantLink from "@/components/portal/InstantLink";
import AuditoriaFeed, { type AuditLogItem } from "./AuditoriaFeed";

const MODULOS = ["facturas","clientes","productos","usuarios","configuracion","proveedores","ordenes-compra","documentos"];

interface Props {
  searchParams: Promise<{ q?: string; modulo?: string }>;
}

export default async function AuditoriaPage({ searchParams }: Props) {
  const { q, modulo } = await searchParams;
  const query = q?.trim() ?? "";
  const moduloFilter = MODULOS.includes(modulo ?? "") ? modulo : undefined;

  const [session, logs] = await Promise.all([
    getPortalSessionFast(),
    prisma.auditLog.findMany({
      where: {
        ...(moduloFilter ? { modulo: moduloFilter } : {}),
        ...(query
          ? {
              OR: [
                { accion: { contains: query, mode: "insensitive" } },
                { detalle: { contains: query, mode: "insensitive" } },
                { user: { nombre: { contains: query, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { created_at: "desc" },
      take: 200,
      include: { user: { select: { nombre: true } } },
    }),
  ]);
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") redirect("/dashboard");

  const chipBase = "px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border";
  const chipActive = "bg-[#253158] text-white border-[#253158]";
  const chipInactive = "bg-white text-gray-600 border-gray-200 hover:bg-gray-50";

  // Forma serializable para el feed cliente (agrupación por día + "Cargar más").
  const feedLogs: AuditLogItem[] = logs.map((log) => ({
    id: log.id,
    created_at: log.created_at.toISOString(),
    user_nombre: log.user.nombre,
    modulo: log.modulo,
    accion: log.accion,
    detalle: log.detalle,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#253158]">Auditoría</h1>
        <p className="text-gray-500 text-sm mt-1">
          {logs.length === 1 ? "Última acción del sistema" : `Últimas ${logs.length} acciones del sistema`}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <form method="GET" className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por usuario, acción o detalle..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] w-full sm:w-72"
          />
          {moduloFilter && <input type="hidden" name="modulo" value={moduloFilter} />}
        </form>

        <div className="flex flex-wrap gap-1.5">
          <InstantLink href={`/auditoria${query ? `?q=${encodeURIComponent(query)}` : ""}`} prefetchOnMount>
            <span className={`${chipBase} ${!moduloFilter ? chipActive : chipInactive}`}>Todos</span>
          </InstantLink>
          {MODULOS.map((m) => (
            <InstantLink key={m} href={`/auditoria?modulo=${m}${query ? `&q=${encodeURIComponent(query)}` : ""}`} prefetchOnMount>
              <span className={`${chipBase} ${moduloFilter === m ? chipActive : chipInactive}`}>
                {m.charAt(0).toUpperCase() + m.slice(1).replace("-", " ")}
              </span>
            </InstantLink>
          ))}
        </div>
      </div>

      {/* Feed agrupado por día (cliente: hora corta, iconos por acción, cargar más) */}
      {feedLogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center text-gray-400 py-12 px-4">
          <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>{query || moduloFilter ? "No se encontraron registros." : "Sin registros de auditoría."}</p>
        </div>
      ) : (
        <AuditoriaFeed logs={feedLogs} />
      )}
    </div>
  );
}
