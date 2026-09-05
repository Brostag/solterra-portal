import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import InstantLink from "@/components/portal/InstantLink";
import EliminarUsuarioButton from "./EliminarUsuarioButton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type Rol = "ADMINISTRADOR" | "SUPERVISOR" | "USUARIO";

// Jerarquía = intensidad del azul corporativo (sin colores ajenos a la marca).
const ROL_COLORS: Record<Rol, string> = {
  ADMINISTRADOR: "bg-[#253158] text-white border border-[#253158]",
  SUPERVISOR:    "bg-[#253158]/10 text-[#253158] border border-transparent",
  USUARIO:       "bg-white text-[#253158] border border-[#253158]/35",
};

const ROL_LABELS: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  SUPERVISOR:    "Supervisor",
  USUARIO:       "Usuario",
};

const ROLES: Rol[] = ["ADMINISTRADOR", "SUPERVISOR", "USUARIO"];

interface Props {
  searchParams: Promise<{ q?: string; filtro?: string; rol?: string }>;
}

export default async function UsuariosPage({ searchParams }: Props) {
  const { q, filtro, rol } = await searchParams;
  const query = q?.trim() ?? "";
  const filtroActivo = filtro === "activos" || filtro === "inactivos" ? filtro : undefined;
  const rolFilter = ROLES.includes(rol as Rol) ? (rol as Rol) : undefined;

  const [session, users] = await Promise.all([
    getPortalSessionFast(),
    prisma.profile.findMany({
      where: {
        ...(filtroActivo === "activos" ? { activo: true } : filtroActivo === "inactivos" ? { activo: false } : {}),
        ...(rolFilter ? { rol: rolFilter } : {}),
        ...(query
          ? {
              OR: [
                { nombre: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { created_at: "asc" },
    }),
  ]);
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") redirect("/dashboard");

  function buildHref(params: { q?: string; filtro?: string; rol?: string }) {
    const p = new URLSearchParams();
    if (params.q)     p.set("q", params.q);
    if (params.filtro) p.set("filtro", params.filtro);
    if (params.rol)   p.set("rol", params.rol);
    const qs = p.toString();
    return `/usuarios${qs ? `?${qs}` : ""}`;
  }

  const chipBase = "px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border";
  const chipActive = "bg-[#253158] text-white border-[#253158]";
  const chipInactive = "bg-white text-gray-600 border-gray-200 hover:bg-gray-50";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">
            {users.length} {users.length === 1 ? "registro" : "registros"}
            {query && ` · búsqueda: "${query}"`}
          </p>
        </div>
        <InstantLink href="/usuarios/nuevo" prefetchOnMount>
          <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
            <Plus className="h-4 w-4" />
            Invitar Usuario
          </Button>
        </InstantLink>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form method="GET" className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre o email..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] w-full sm:w-72"
          />
          {filtroActivo && <input type="hidden" name="filtro" value={filtroActivo} />}
          {rolFilter && <input type="hidden" name="rol" value={rolFilter} />}
        </form>

        <div className="flex flex-wrap gap-1.5">
          {(["", "activos", "inactivos"] as const).map((f) => {
            const isActive = (f === "" && !filtroActivo) || filtroActivo === f;
            const label = f === "" ? "Todos" : f === "activos" ? "Activos" : "Inactivos";
            return (
              <InstantLink key={f} href={buildHref({ q: query || undefined, filtro: f || undefined, rol: rolFilter })} prefetchOnMount>
                <span className={`${chipBase} ${isActive ? chipActive : chipInactive}`}>{label}</span>
              </InstantLink>
            );
          })}
          <span className="border-l border-gray-200 mx-0.5" />
          {ROLES.map((r) => (
            <InstantLink key={r} href={buildHref({ q: query || undefined, filtro: filtroActivo, rol: rolFilter === r ? undefined : r })} prefetchOnMount>
              <span className={`${chipBase} ${rolFilter === r ? chipActive : chipInactive}`}>
                {ROL_LABELS[r]}
              </span>
            </InstantLink>
          ))}
        </div>
      </div>

      {/* Móvil: cards — sm:hidden */}
      <div className="sm:hidden bg-white rounded-xl border border-gray-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center text-gray-400 py-12 px-4">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>{query || filtroActivo || rolFilter ? "No se encontraron usuarios." : "No hay usuarios registrados."}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((u) => (
              <div key={u.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-semibold text-gray-800 truncate">{u.nombre}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${ROL_COLORS[u.rol as Rol]}`}>
                      {ROL_LABELS[u.rol as Rol]}
                    </span>
                  </div>
                  <p className="text-xs text-[#253158] truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${u.activo ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-500 border border-red-200"}`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                    <span className="text-xs text-gray-400">
                      Desde {new Date(u.created_at).toLocaleDateString("es-CL")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <InstantLink href={`/usuarios/${u.id}`}>
                    <button
                      type="button"
                      aria-label={`Ver usuario ${u.nombre}`}
                      className="p-1.5 rounded-md text-gray-400 hover:text-[#253158] hover:bg-gray-100 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </InstantLink>
                  {u.id !== session.id && (
                    <EliminarUsuarioButton userId={u.id} userLabel={u.nombre} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: tabla — hidden sm:block */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Desde</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{query || filtroActivo || rolFilter ? "No se encontraron usuarios." : "No hay usuarios registrados."}</p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="relative cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <TableCell className="px-4 py-3 font-semibold text-gray-800 text-sm">
                    <InstantLink href={`/usuarios/${u.id}`} aria-label={`Ver usuario ${u.nombre}`} className="absolute inset-0">
                      <span className="sr-only">Ver detalle</span>
                    </InstantLink>
                    {u.nombre}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-[#253158] text-sm">{u.email}</TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${ROL_COLORS[u.rol as Rol]}`}>
                      {ROL_LABELS[u.rol as Rol]}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${u.activo ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-500 border border-red-200"}`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-400 text-sm">
                    {new Date(u.created_at).toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell className="px-3 py-3 relative z-10">
                    <div className="flex items-center gap-1">
                      <InstantLink href={`/usuarios/${u.id}`}>
                        <button
                          type="button"
                          aria-label={`Ver usuario ${u.nombre}`}
                          className="p-1.5 rounded-md text-gray-400 hover:text-[#253158] hover:bg-gray-100 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </InstantLink>
                      {u.id !== session.id && (
                        <EliminarUsuarioButton userId={u.id} userLabel={u.nombre} />
                      )}
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
