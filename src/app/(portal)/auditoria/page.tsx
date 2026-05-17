import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

const MODULO_COLORS: Record<string, string> = {
  facturas:      "bg-blue-50 text-blue-600 border border-blue-200",
  clientes:      "bg-purple-50 text-purple-600 border border-purple-200",
  productos:     "bg-amber-50 text-amber-600 border border-amber-200",
  usuarios:      "bg-green-50 text-green-600 border border-green-200",
  configuracion: "bg-gray-50 text-gray-500 border border-gray-200",
  proveedores:   "bg-sky-50 text-sky-600 border border-sky-200",
  "ordenes-compra": "bg-indigo-50 text-indigo-600 border border-indigo-200",
  documentos:    "bg-rose-50 text-rose-600 border border-rose-200",
};

const MODULOS = ["facturas","clientes","productos","usuarios","configuracion","proveedores","ordenes-compra","documentos"];

interface Props {
  searchParams: Promise<{ q?: string; modulo?: string }>;
}

export default async function AuditoriaPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") redirect("/dashboard");

  const { q, modulo } = await searchParams;
  const query = q?.trim() ?? "";
  const moduloFilter = MODULOS.includes(modulo ?? "") ? modulo : undefined;

  const logs = await prisma.auditLog.findMany({
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
  });

  const chipBase = "px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border";
  const chipActive = "bg-[#253158] text-white border-[#253158]";
  const chipInactive = "bg-white text-gray-600 border-gray-200 hover:bg-gray-50";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#253158]">Auditoría</h1>
        <p className="text-gray-500 text-sm mt-1">Últimas {logs.length} acciones del sistema</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <form method="GET" className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por usuario, acción o detalle..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] w-80"
          />
          {moduloFilter && <input type="hidden" name="modulo" value={moduloFilter} />}
        </form>

        <div className="flex flex-wrap gap-1.5">
          <Link href={`/auditoria${query ? `?q=${encodeURIComponent(query)}` : ""}`}>
            <span className={`${chipBase} ${!moduloFilter ? chipActive : chipInactive}`}>Todos</span>
          </Link>
          {MODULOS.map((m) => (
            <Link key={m} href={`/auditoria?modulo=${m}${query ? `&q=${encodeURIComponent(query)}` : ""}`}>
              <span className={`${chipBase} ${moduloFilter === m ? chipActive : chipInactive}`}>
                {m.charAt(0).toUpperCase() + m.slice(1).replace("-", " ")}
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
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Módulo</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 py-12">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{query || moduloFilter ? "No se encontraron registros." : "Sin registros de auditoría."}</p>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <TableCell className="px-5 py-4 text-gray-400 text-sm whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("es-CL")}
                  </TableCell>
                  <TableCell className="px-5 py-4 font-medium text-gray-800 text-sm">{log.user.nombre}</TableCell>
                  <TableCell className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${MODULO_COLORS[log.modulo] ?? "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                      {log.modulo}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-700">{log.accion}</TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-400">{log.detalle ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
