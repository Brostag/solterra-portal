import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import InstantLink from "@/components/portal/InstantLink";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

type EstadoContrato = "BORRADOR" | "VIGENTE" | "FINALIZADO" | "ANULADO";

const ESTADO_LABELS: Record<EstadoContrato, string> = {
  BORRADOR:   "Borrador",
  VIGENTE:    "Vigente",
  FINALIZADO: "Finalizado",
  ANULADO:    "Anulado",
};

const ESTADO_COLORS: Record<EstadoContrato, string> = {
  BORRADOR:   "bg-gray-50 text-gray-600 border border-gray-200",
  VIGENTE:    "bg-green-50 text-green-600 border border-green-200",
  FINALIZADO: "bg-blue-50 text-blue-600 border border-blue-200",
  ANULADO:    "bg-red-50 text-red-500 border border-red-200",
};

export default async function ContratosPage() {
  const [session, contratos] = await Promise.all([
    getPortalSessionFast(),
    prisma.contract.findMany({
      orderBy: { created_at: "desc" },
      take: 200,
      include: {
        client: { select: { nombre: true } },
        _count: { select: { equipos: true } },
      },
    }),
  ]);
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Contratos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestión de contratos de arriendo de maquinaria y respaldo documental.
          </p>
        </div>
        {session.rol !== "USUARIO" && (
          <InstantLink href="/contratos/nuevo" prefetchOnMount>
            <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Contrato
            </Button>
          </InstantLink>
        )}
      </div>

      {/* Móvil: cards — sm:hidden */}
      <div className="sm:hidden bg-white rounded-xl border border-gray-200 overflow-hidden">
        {contratos.length === 0 ? (
          <div className="text-center text-gray-400 py-12 px-4">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No hay contratos registrados todavía.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {contratos.map((c) => (
              <InstantLink key={c.id} href={`/contratos/${c.id}`} className="block px-4 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs font-bold text-[#253158]">#{c.numero_contrato}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${ESTADO_COLORS[c.estado as EstadoContrato]}`}>
                    {ESTADO_LABELS[c.estado as EstadoContrato].toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">{c.client.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">
                    {new Date(c.fecha_emision).toLocaleDateString("es-CL")}
                  </span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-500">
                    {c._count.equipos} {c._count.equipos === 1 ? "equipo" : "equipos"}
                  </span>
                </div>
              </InstantLink>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: tabla — hidden sm:block */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">N° Contrato</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha emisión</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Equipos</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contratos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No hay contratos registrados todavía.</p>
                </TableCell>
              </TableRow>
            ) : (
              contratos.map((c) => (
                <TableRow key={c.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <TableCell className="px-5 py-4 font-mono font-bold text-[#253158] text-sm">#{c.numero_contrato}</TableCell>
                  <TableCell className="px-5 py-4 font-medium text-gray-800 text-sm">{c.client.nombre}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-400 text-sm">
                    {new Date(c.fecha_emision).toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${ESTADO_COLORS[c.estado as EstadoContrato]}`}>
                      {ESTADO_LABELS[c.estado as EstadoContrato].toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-center text-gray-600 text-sm tabular-nums">{c._count.equipos}</TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <InstantLink href={`/contratos/${c.id}`}>
                        <button type="button" className="p-1.5 rounded-md text-gray-400 hover:text-[#253158] hover:bg-gray-100 transition-colors" title="Ver contrato">
                          <Eye className="h-4 w-4" />
                        </button>
                      </InstantLink>
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
