import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import InstantLink from "@/components/portal/InstantLink";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye, Pencil, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLES_FILTER = [
  { key: "", label: "Todas" },
  { key: "cliente", label: "Clientes" },
  { key: "proveedor", label: "Proveedores" },
  { key: "arrendataria", label: "Arrendatarias" },
  { key: "otro", label: "Otros" },
];

interface EmpresaRow {
  es_cliente: boolean;
  es_proveedor: boolean;
  es_arrendataria: boolean;
  es_otro: boolean;
}

function rolWhere(rol?: string) {
  switch (rol) {
    case "cliente":      return { es_cliente: true };
    case "proveedor":    return { es_proveedor: true };
    case "arrendataria": return { es_arrendataria: true };
    case "otro":         return { es_otro: true };
    default:             return {};
  }
}

function rolesDe(c: EmpresaRow): string[] {
  const arr: string[] = [];
  if (c.es_cliente) arr.push("Cliente");
  if (c.es_proveedor) arr.push("Proveedor");
  if (c.es_arrendataria) arr.push("Arrendataria");
  if (c.es_otro) arr.push("Otro");
  return arr;
}

interface Props {
  searchParams: Promise<{ q?: string; rol?: string }>;
}

export default async function EmpresasPage({ searchParams }: Props) {
  const { q, rol } = await searchParams;
  const query = q?.trim() ?? "";
  const validRol = ["cliente", "proveedor", "arrendataria", "otro"].includes(rol ?? "")
    ? rol
    : undefined;

  const [session, empresas] = await Promise.all([
    getPortalSessionFast(),
    prisma.company.findMany({
      where: {
        ...rolWhere(validRol),
        ...(query
          ? {
              OR: [
                { nombre_razon_social: { contains: query, mode: "insensitive" } },
                { rut: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { created_at: "desc" },
      take: 200,
      select: {
        id: true, nombre_razon_social: true, rut: true, email: true,
        telefono: true, ciudad: true, activo: true,
        es_cliente: true, es_proveedor: true, es_arrendataria: true, es_otro: true,
      },
    }),
  ]);
  if (!session) redirect("/login");

  const filtroQs = (rolKey: string) =>
    `/empresas?${[rolKey ? `rol=${rolKey}` : "", query ? `q=${encodeURIComponent(query)}` : ""].filter(Boolean).join("&")}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Empresas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {empresas.length} {empresas.length === 1 ? "empresa registrada" : "empresas registradas"}
          </p>
        </div>
        {session.rol !== "USUARIO" && (
          <InstantLink href="/empresas/nuevo" prefetchOnMount>
            <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              <Plus className="h-4 w-4" />
              Nueva Empresa
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
            placeholder="Buscar por nombre, RUT o email..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] w-full sm:w-72"
          />
          {validRol && <input type="hidden" name="rol" value={validRol} />}
        </form>
        <div className="flex gap-1.5 flex-wrap">
          {ROLES_FILTER.map((f) => {
            const active = (f.key === "" && !validRol) || f.key === validRol;
            return (
              <InstantLink key={f.key || "todas"} href={filtroQs(f.key)} prefetchOnMount>
                <span className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border ${active ? "bg-[#253158] text-white border-[#253158]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                  {f.label}
                </span>
              </InstantLink>
            );
          })}
        </div>
      </div>

      {/* Móvil: cards */}
      <div className="sm:hidden bg-white rounded-xl border border-gray-200 overflow-hidden">
        {empresas.length === 0 ? (
          <div className="text-center text-gray-400 py-12 px-4">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>{query || validRol ? "No se encontraron empresas." : "Todavía no hay empresas registradas."}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {empresas.map((c) => (
              <InstantLink key={c.id} href={`/empresas/${c.id}`} className="block px-4 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.nombre_razon_social}</p>
                  {!c.activo && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">Inactiva</span>}
                </div>
                <p className="text-xs text-gray-400">{c.rut ?? "Sin RUT"}{c.ciudad ? ` · ${c.ciudad}` : ""}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {rolesDe(c).map((r) => (
                    <span key={r} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#253158]/10 text-[#253158]">{r}</span>
                  ))}
                </div>
              </InstantLink>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre / Razón social</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">RUT</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Roles</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</TableHead>
              <TableHead className="hidden xl:table-cell px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Teléfono</TableHead>
              <TableHead className="hidden xl:table-cell px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ciudad</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-400 py-12">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{query || validRol ? "No se encontraron empresas." : "Todavía no hay empresas registradas."}</p>
                </TableCell>
              </TableRow>
            ) : (
              empresas.map((c) => (
                <TableRow key={c.id} className="relative cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <TableCell className="px-4 py-3 font-medium text-gray-800 text-sm">
                    <InstantLink href={`/empresas/${c.id}`} aria-label={`Ver ${c.nombre_razon_social}`} className="absolute inset-0">
                      <span className="sr-only">Ver detalle</span>
                    </InstantLink>
                    {c.nombre_razon_social}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-sm">{c.rut ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {rolesDe(c).map((r) => (
                        <span key={r} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#253158]/10 text-[#253158]">{r}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-sm">{c.email ?? "—"}</TableCell>
                  <TableCell className="hidden xl:table-cell px-4 py-3 text-gray-500 text-sm">{c.telefono ?? "—"}</TableCell>
                  <TableCell className="hidden xl:table-cell px-4 py-3 text-gray-500 text-sm">{c.ciudad ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${c.activo ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                      {c.activo ? "Activa" : "Inactiva"}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3 relative z-10">
                    <div className="flex items-center gap-1">
                      <InstantLink href={`/empresas/${c.id}`}>
                        <button type="button" className="p-1.5 rounded-md text-gray-400 hover:text-[#253158] hover:bg-gray-100 transition-colors" title="Ver empresa">
                          <Eye className="h-4 w-4" />
                        </button>
                      </InstantLink>
                      {session.rol !== "USUARIO" && (
                        <InstantLink href={`/empresas/${c.id}/editar`}>
                          <button type="button" className="p-1.5 rounded-md text-gray-400 hover:text-[#253158] hover:bg-gray-100 transition-colors" title="Editar empresa">
                            <Pencil className="h-4 w-4" />
                          </button>
                        </InstantLink>
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
