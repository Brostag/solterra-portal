import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileDown, MessageCircle, Mail } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { getSignedUrls } from "@/lib/supabase/storage";
import FotosEquipoSection, { type EquipoConFotos } from "./FotosEquipoSection";

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

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("es-CL") : "—";
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ContratoDetallePage({ params }: Props) {
  const { id } = await params;
  const [session, contrato] = await Promise.all([
    getPortalSessionFast(),
    prisma.contract.findUnique({
      where: { id },
      include: {
        client: true,
        equipos: {
          orderBy: { orden: "asc" },
          include: { photos: { orderBy: { created_at: "asc" } } },
        },
        _count: { select: { documents: true } },
      },
    }),
  ]);
  if (!session) redirect("/login");
  if (!contrato) notFound();

  // Datos del cliente: snapshot congelado si existe, si no la relación en vivo.
  const cli = {
    nombre:    contrato.cliente_nombre_snapshot    ?? contrato.client.nombre,
    rut:       contrato.cliente_rut_snapshot       ?? contrato.client.rut,
    email:     contrato.cliente_email_snapshot     ?? contrato.client.email,
    telefono:  contrato.cliente_telefono_snapshot  ?? contrato.client.telefono,
    direccion: contrato.cliente_direccion_snapshot ?? contrato.client.direccion,
  };

  // Firmar en un solo batch las URLs de todas las fotos (bucket privado).
  const allPaths = contrato.equipos.flatMap((e) => e.photos.map((p) => p.storage_path));
  let signed: Record<string, string> = {};
  if (allPaths.length > 0) {
    try {
      signed = await getSignedUrls(allPaths);
    } catch {
      signed = {};
    }
  }
  const equiposConFotos: EquipoConFotos[] = contrato.equipos.map((e) => ({
    id: e.id,
    descripcion: e.descripcion,
    photos: e.photos.map((p) => ({
      id: p.id,
      tipo: p.tipo,
      nombre_original: p.nombre_original,
      observacion: p.observacion,
      created_at: p.created_at.toISOString(),
      signedUrl: signed[p.storage_path] ?? null,
    })),
  }));
  const canManage = session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR";

  // Compartir: wa.me y mailto no pueden adjuntar el PDF automáticamente,
  // por eso abren un mensaje/correo preparado y el PDF se adjunta a mano.
  const pdfUrl = `/api/contratos/${contrato.id}/pdf`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(
    `Hola, comparto contrato de arriendo ${contrato.numero_contrato} de Solterra SpA para revisión. Descarga el PDF desde el sistema y adjúntalo si corresponde.`
  )}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(
    `Contrato de arriendo ${contrato.numero_contrato} - Solterra SpA`
  )}&body=${encodeURIComponent(
    `Estimados,\nComparto para revisión el contrato de arriendo ${contrato.numero_contrato}.\nSaludos,\nSolterra SpA`
  )}`;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/contratos">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">Contrato #{contrato.numero_contrato}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Emitido el {fmtDate(contrato.fecha_emision)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${ESTADO_COLORS[contrato.estado as EstadoContrato]}`}>
            {ESTADO_LABELS[contrato.estado as EstadoContrato].toUpperCase()}
          </span>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Descargar contrato</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cliente / Arrendataria */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-[#253158]">Arrendataria (cliente)</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Nombre / Razón social</dt>
              <dd className="text-gray-800 font-medium">{cli.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">RUT</dt>
              <dd className="text-gray-800">{cli.rut ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Representante legal</dt>
              <dd className="text-gray-800">{contrato.representante_cliente ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Cédula representante</dt>
              <dd className="text-gray-800">{contrato.rut_representante ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Email</dt>
              <dd className="text-gray-800 break-words">{cli.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Teléfono</dt>
              <dd className="text-gray-800">{cli.telefono ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Dirección</dt>
              <dd className="text-gray-800">{cli.direccion ?? "—"}</dd>
            </div>
          </dl>
        </div>

        {/* Condiciones del contrato */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 lg:col-span-2">
          <h2 className="font-semibold text-[#253158]">Condiciones del contrato</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Fecha de inicio</dt>
              <dd className="text-gray-800">{fmtDate(contrato.fecha_inicio)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Fecha de término</dt>
              <dd className="text-gray-800">{fmtDate(contrato.fecha_termino)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Duración</dt>
              <dd className="text-gray-800">{contrato.duracion_meses ? `${contrato.duracion_meses} meses` : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Vigencia</dt>
              <dd className="text-gray-800">{contrato.vigencia_contrato ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Lugar de operación</dt>
              <dd className="text-gray-800">{contrato.lugar_operacion ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Ciudad de celebración</dt>
              <dd className="text-gray-800">{contrato.ciudad_celebracion ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Condición de pago</dt>
              <dd className="text-gray-800">{contrato.forma_pago ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Moneda</dt>
              <dd className="text-gray-800">{contrato.moneda}</dd>
            </div>
          </dl>
          {contrato.observaciones && (
            <div className="pt-2 border-t border-gray-100">
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Observaciones</dt>
              <dd className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{contrato.observaciones}</dd>
            </div>
          )}
        </div>
      </div>

      {/* Condiciones particulares / Anexo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-[#253158]">Condiciones particulares (Anexo)</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide">N° de anexo</dt>
            <dd className="text-gray-800">{contrato.numero_anexo ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide">Fecha del anexo</dt>
            <dd className="text-gray-800">{fmtDate(contrato.fecha_anexo)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide">N° cotización Solterra</dt>
            <dd className="text-gray-800">{contrato.numero_cotizacion ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide">Correo notificaciones</dt>
            <dd className="text-gray-800 break-words">{contrato.correo_notificaciones ?? "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Equipos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-[#253158]">Equipos arrendados ({contrato.equipos.length})</h2>
        </div>

        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipo</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Marca / Modelo</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patente</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Valor hora</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Hrs. mín.</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Tarifa h. extra</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Valor mensual est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contrato.equipos.map((eq) => (
                <TableRow key={eq.id} className="border-b border-gray-100 last:border-0">
                  <TableCell className="px-5 py-4 font-medium text-gray-800 text-sm">
                    {eq.descripcion}
                    {(eq.horometro_inicial || eq.mantenimiento_horas) && (
                      <span className="block text-[11px] text-gray-400 font-normal mt-0.5">
                        {eq.horometro_inicial && `Horómetro: ${eq.horometro_inicial}`}
                        {eq.horometro_inicial && eq.mantenimiento_horas && " · "}
                        {eq.mantenimiento_horas && `Mantención: ${eq.mantenimiento_horas}`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-600 text-sm">
                    {[eq.marca, eq.modelo].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-600 text-sm">{eq.patente ?? "—"}</TableCell>
                  <TableCell className="px-5 py-4 text-right text-gray-800 text-sm tabular-nums">{formatCurrency(Number(eq.valor_hora), "CLP")}</TableCell>
                  <TableCell className="px-5 py-4 text-right text-gray-600 text-sm tabular-nums">{eq.horas_minimas_mensuales ?? "—"}</TableCell>
                  <TableCell className="px-5 py-4 text-right text-gray-600 text-sm tabular-nums">{eq.tarifa_hora_extra != null ? formatCurrency(Number(eq.tarifa_hora_extra), "CLP") : "—"}</TableCell>
                  <TableCell className="px-5 py-4 text-right font-semibold text-[#253158] text-sm tabular-nums">
                    {eq.valor_mensual_estimado != null ? formatCurrency(Number(eq.valor_mensual_estimado), "CLP") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Móvil */}
        <div className="sm:hidden divide-y divide-gray-100">
          {contrato.equipos.map((eq) => (
            <div key={eq.id} className="px-4 py-3.5 space-y-1">
              <p className="text-sm font-semibold text-gray-800">{eq.descripcion}</p>
              <p className="text-xs text-gray-500">{[eq.marca, eq.modelo, eq.patente].filter(Boolean).join(" · ") || "Sin datos adicionales"}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-600 pt-1">
                <span>Valor hora: <span className="font-medium tabular-nums">{formatCurrency(Number(eq.valor_hora), "CLP")}</span></span>
                {eq.tarifa_hora_extra != null && (
                  <span>· H. extra: <span className="font-medium tabular-nums">{formatCurrency(Number(eq.tarifa_hora_extra), "CLP")}</span></span>
                )}
                {eq.valor_mensual_estimado != null && (
                  <span>· Mensual est.: <span className="font-semibold text-[#253158] tabular-nums">{formatCurrency(Number(eq.valor_mensual_estimado), "CLP")}</span></span>
                )}
              </div>
              {(eq.horometro_inicial || eq.mantenimiento_horas) && (
                <p className="text-[11px] text-gray-400">
                  {eq.horometro_inicial && `Horómetro: ${eq.horometro_inicial}`}
                  {eq.horometro_inicial && eq.mantenimiento_horas && " · "}
                  {eq.mantenimiento_horas && `Mantención: ${eq.mantenimiento_horas}`}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Respaldo fotográfico de los equipos (C2.2) */}
      <FotosEquipoSection equipos={equiposConFotos} canManage={canManage} />

      {/* Compartir contrato */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-[#253158] mb-1">Compartir contrato</h2>
        <p className="text-sm text-gray-500 mb-3">
          Descarga el PDF y adjúntalo al enviarlo por WhatsApp o correo (no se adjunta automáticamente).
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              <FileDown className="h-4 w-4" /> Descargar PDF
            </Button>
          </a>
          <a href={waUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-white border border-green-600 text-green-700 hover:bg-green-50 gap-2">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
          </a>
          <a href={mailUrl}>
            <Button className="bg-white border border-gray-300 text-[#253158] hover:bg-gray-50 gap-2">
              <Mail className="h-4 w-4" /> Correo
            </Button>
          </a>
        </div>
      </div>

      <div className="flex justify-start">
        <Link href="/contratos">
          <Button className="bg-white border border-gray-300 text-[#253158] hover:bg-gray-50 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Contratos
          </Button>
        </Link>
      </div>
    </div>
  );
}
