import { prisma } from "@/lib/prisma";
import InstantLink from "@/components/portal/InstantLink";
import VolverAlDashboard from "@/components/portal/VolverAlDashboard";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Inbox, Paperclip } from "lucide-react";
import { requireSoporte } from "./guard";
import {
  ESTADOS, ESTADO_COLORS, ESTADO_SLUG, TIPO_COLORS, TIPO_COLOR_FALLBACK,
  MODULO_LABELS, estadoDesdeSlug, fmtFechaHora,
  type EstadoReporte,
} from "./vocabulario";

const LIMITE = 200;

interface Props {
  searchParams: Promise<{ estado?: string }>;
}

export default async function SoportePage({ searchParams }: Props) {
  // Auth antes que datos: la bandeja es solo para la cuenta técnica.
  await requireSoporte();

  const { estado } = await searchParams;
  const estadoFiltro = estadoDesdeSlug(estado);

  const [reportes, conteos] = await Promise.all([
    prisma.feedbackReport.findMany({
      where: estadoFiltro ? { estado: estadoFiltro } : {},
      orderBy: { created_at: "desc" },
      take: LIMITE,
      select: {
        id: true,
        correlativo: true,
        anio: true,
        tipo: true,
        mensaje: true,
        ruta: true,
        modulo: true,
        estado: true,
        created_at: true,
        autor: { select: { nombre: true } },
        _count: { select: { adjuntos: true } },
      },
    }),
    prisma.feedbackReport.groupBy({
      by: ["estado"],
      _count: { _all: true },
    }),
  ]);

  const porEstado = new Map<string, number>(
    conteos.map((c): [string, number] => [c.estado, c._count._all]),
  );
  const total = conteos.reduce((acc, c) => acc + c._count._all, 0);
  const nuevos = porEstado.get("Nuevo") ?? 0;
  // Cuántos calzan con el filtro activo (la lista está topada en LIMITE).
  const totalVisible = estadoFiltro ? (porEstado.get(estadoFiltro) ?? 0) : total;

  const filtroHref = (slug: string) => (slug ? `/soporte?estado=${slug}` : "/soporte");
  const chipBase = "px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border";
  const chipActive = "bg-[#253158] text-white border-[#253158]";
  const chipInactive = "bg-white text-gray-600 border-gray-200 hover:bg-gray-50";

  return (
    <div className="space-y-6">
      <VolverAlDashboard />

      {/* Encabezado + contador de nuevos */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Reportes de soporte</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalVisible === 0
              ? estadoFiltro
                ? "Sin reportes en este estado"
                : "Sin reportes recibidos"
              : reportes.length < totalVisible
                ? `Mostrando los ${reportes.length} más recientes de ${totalVisible}`
                : `${totalVisible} reporte${totalVisible !== 1 ? "s" : ""}${estadoFiltro ? "" : " en total"}`}
          </p>
        </div>

        <InstantLink href={filtroHref(ESTADO_SLUG.Nuevo)} prefetchOnMount>
          <div
            className={`rounded-xl border px-5 py-3 transition-colors ${
              nuevos > 0
                ? "bg-white border-[#c6352e]/30 hover:border-[#c6352e]/60"
                : "bg-white border-gray-200 hover:bg-gray-50"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Sin revisar
            </p>
            <p
              className={`text-3xl font-bold leading-tight tabular-nums ${
                nuevos > 0 ? "text-[#c6352e]" : "text-gray-300"
              }`}
            >
              {nuevos}
            </p>
          </div>
        </InstantLink>
      </div>

      {/* Filtros por estado */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <InstantLink href={filtroHref("")} prefetchOnMount>
          <span className={`${chipBase} ${!estadoFiltro ? chipActive : chipInactive}`}>
            Todos ({total})
          </span>
        </InstantLink>
        {ESTADOS.map((e) => (
          <InstantLink key={e} href={filtroHref(ESTADO_SLUG[e])} prefetchOnMount>
            <span className={`${chipBase} ${estadoFiltro === e ? chipActive : chipInactive}`}>
              {e} ({porEstado.get(e) ?? 0})
            </span>
          </InstantLink>
        ))}
      </div>

      {/* Móvil: tarjetas */}
      <div className="sm:hidden bg-white rounded-xl border border-gray-200 overflow-hidden">
        {reportes.length === 0 ? (
          <div className="text-center text-gray-400 py-12 px-4">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>{estadoFiltro ? "No hay reportes con ese estado." : "Todavía no hay reportes."}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reportes.map((r) => (
              <InstantLink key={r.id} href={`/soporte/${r.id}`} className="block px-4 py-3.5">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs font-bold text-[#253158]">
                    N° {r.correlativo}/{r.anio}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      ESTADO_COLORS[r.estado as EstadoReporte] ?? TIPO_COLOR_FALLBACK
                    }`}
                  >
                    {r.estado.toUpperCase()}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      TIPO_COLORS[r.tipo] ?? TIPO_COLOR_FALLBACK
                    }`}
                  >
                    {r.tipo}
                  </span>
                  {r._count.adjuntos > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                      <Paperclip className="h-3 w-3" />
                      {r._count.adjuntos}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 line-clamp-2">{r.mensaje}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {r.autor.nombre} · {fmtFechaHora(r.created_at)}
                </p>
                {r.ruta && (
                  <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">{r.ruta}</p>
                )}
              </InstantLink>
            ))}
          </div>
        )}
      </div>

      {/* Escritorio: tabla */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">N°</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Autor</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pantalla</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</TableHead>
              <TableHead className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Adjuntos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-12">
                  <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{estadoFiltro ? "No hay reportes con ese estado." : "Todavía no hay reportes."}</p>
                </TableCell>
              </TableRow>
            ) : (
              reportes.map((r) => (
                <TableRow
                  key={r.id}
                  className="relative cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <TableCell className="px-4 py-3 font-mono font-bold text-[#253158] text-sm whitespace-nowrap">
                    <InstantLink
                      href={`/soporte/${r.id}`}
                      aria-label={`Ver reporte ${r.correlativo} de ${r.anio}`}
                      className="absolute inset-0"
                    >
                      <span className="sr-only">Ver detalle</span>
                    </InstantLink>
                    {r.correlativo}/{r.anio}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                    {fmtFechaHora(r.created_at)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md whitespace-nowrap ${
                        TIPO_COLORS[r.tipo] ?? TIPO_COLOR_FALLBACK
                      }`}
                    >
                      {r.tipo}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-700 text-sm">{r.autor.nombre}</TableCell>
                  <TableCell className="px-4 py-3 text-sm max-w-[240px]">
                    {r.ruta ? (
                      <span className="block truncate font-mono text-xs text-gray-500" title={r.ruta}>
                        {r.ruta}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                    {r.modulo && (
                      <span className="text-[11px] text-gray-400">
                        {MODULO_LABELS[r.modulo] ?? r.modulo}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md whitespace-nowrap ${
                        ESTADO_COLORS[r.estado as EstadoReporte] ?? TIPO_COLOR_FALLBACK
                      }`}
                    >
                      {r.estado.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    {r._count.adjuntos > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Paperclip className="h-3.5 w-3.5" />
                        {r._count.adjuntos}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
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
