import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import InstantLink from "@/components/portal/InstantLink";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type Rol = "ADMINISTRADOR" | "SUPERVISOR" | "USUARIO";

const ROL_COLORS: Record<Rol, string> = {
  ADMINISTRADOR: "bg-purple-50 text-purple-600 border border-purple-200",
  SUPERVISOR:    "bg-blue-50 text-blue-600 border border-blue-200",
  USUARIO:       "bg-gray-50 text-gray-500 border border-gray-200",
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
      <div className="flex items-center justify-between">
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
      <div className="flex flex-wrap gap-3 items-center">
        <form method="GET" className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre o email..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] w-72"
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

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Desde</TableHead>
              <TableHead className="w-12" />
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
                <TableRow key={u.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <TableCell className="px-5 py-4 font-semibold text-gray-800 text-sm">{u.nombre}</TableCell>
                  <TableCell className="px-5 py-4 text-[#253158] text-sm">{u.email}</TableCell>
                  <TableCell className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${ROL_COLORS[u.rol as Rol]}`}>
                      {ROL_LABELS[u.rol as Rol]}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${u.activo ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-500 border border-red-200"}`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-400 text-sm">
                    {new Date(u.created_at).toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell className="px-3 py-4">
                    <InstantLink href={`/usuarios/${u.id}`}>
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
