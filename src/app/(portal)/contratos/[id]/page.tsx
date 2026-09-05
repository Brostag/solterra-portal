import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { getSignedUrls } from "@/lib/supabase/storage";
import FotosEquipoSection, { type EquipoConFotos } from "./FotosEquipoSection";
import PdfShareActions from "@/components/portal/PdfShareActions";
import ContractStatusActions from "./ContractStatusActions";
import { formatContractDisplayNumber } from "@/lib/contracts";

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

  const canManage = session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR";

  // Datos para compartir el PDF. La lógica híbrida (Web Share API / descarga +
  // wa.me|mailto) vive en PdfShareActions; aquí solo armamos los textos.
  const pdfUrl = `/api/contratos/${contrato.id}/pdf`;
  const numeroVisible = formatContractDisplayNumber(contrato.numero_contrato, contrato.fecha_emision);
  const tituloContrato = `Contrato Marco ${numeroVisible}`;
  const empresaNombre = contrato.cliente_nombre_snapshot ?? contrato.client.nombre;
  const pdfFileName = `contrato-marco-${numeroVisible.replace(/\//g, "-")}.pdf`;
  const waMensaje = `Hola, te envío el ${tituloContrato} de Solterra SpA${empresaNombre ? ` para ${empresaNombre}` : ""}. El PDF se descargó en este dispositivo para adjuntarlo si WhatsApp no lo adjunta automáticamente.`;
  const emailAsunto = `${tituloContrato} — Solterra SpA`;
  const emailCuerpo = `Estimados,\n\nAdjunto el ${tituloContrato}${empresaNombre ? ` para ${empresaNombre}` : ""}. Si el archivo no se adjuntó automáticamente, fue descargado para adjuntarlo manualmente.\n\nSaludos,\nSolterra SpA`;
  const emailDestino = contrato.correo_notificaciones ?? contrato.cliente_email_snapshot ?? contrato.client.email ?? undefined;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/contratos">
          <Button variant="ghost" size="sm" className="flex-shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[#253158]">Contrato Marco {numeroVisible}</h1>
          <p className="text-gray-500 text-sm">
            Emitido el {fmtDate(contrato.fecha_emision)}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md flex-shrink-0 ${ESTADO_COLORS[contrato.estado as EstadoContrato]}`}>
          {ESTADO_LABELS[contrato.estado as EstadoContrato].toUpperCase()}
        </span>
      </div>

      {/* Acciones — en móvil al final del contenido (order-last); en desktop tras el título */}
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center order-last sm:order-none">
        <ContractStatusActions
          id={contrato.id}
          estado={contrato.estado as EstadoContrato}
          canManage={canManage}
        />
        <PdfShareActions
          pdfUrl={pdfUrl}
          fileName={pdfFileName}
          title={tituloContrato}
          whatsappMessage={waMensaje}
          emailSubject={emailAsunto}
          emailBody={emailCuerpo}
          emailTo={emailDestino}
          variant="iconos"
          incluirImprimir
        />
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

      {/* Respaldo fotográfico de los equipos (C2.2). Llega por streaming: la
          página no espera la consulta de fotos ni la firma de URLs de Storage. */}
      <Suspense fallback={<FotosEquipoSkeleton />}>
        <FotosEquipoStream contractId={contrato.id} canManage={canManage} />
      </Suspense>


      <div className="flex justify-start order-last sm:order-none">
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

// Carga diferida (streaming) del respaldo fotográfico: la consulta de fotos y
// la firma de URLs de Storage corren FUERA del critical path del detalle. La
// página renderiza de inmediato y esta sección llega cuando Supabase responde.
async function FotosEquipoStream({ contractId, canManage }: { contractId: string; canManage: boolean }) {
  const equipos = await prisma.contractEquipment.findMany({
    where: { contract_id: contractId },
    orderBy: { orden: "asc" },
    select: {
      id: true,
      descripcion: true,
      photos: { orderBy: { created_at: "asc" } },
    },
  });

  // Firmar en un solo batch las URLs de todas las fotos (bucket privado).
  const allPaths = equipos.flatMap((e) => e.photos.map((p) => p.storage_path));
  let signed: Record<string, string> = {};
  if (allPaths.length > 0) {
    try {
      signed = await getSignedUrls(allPaths);
    } catch {
      signed = {};
    }
  }

  const equiposConFotos: EquipoConFotos[] = equipos.map((e) => ({
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

  return <FotosEquipoSection equipos={equiposConFotos} canManage={canManage} />;
}

function FotosEquipoSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="h-5 w-64 max-w-full bg-gray-100 rounded animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-video bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
