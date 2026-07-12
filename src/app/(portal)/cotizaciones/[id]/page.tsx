import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileDown } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { normalizarGastos } from "@/lib/cotizador";
import PdfShareActions from "@/components/portal/PdfShareActions";
import PrintPdfButton from "@/components/portal/PrintPdfButton";
import QuotationStatusActions from "./QuotationStatusActions";

type EstadoCotizacion = "BORRADOR" | "EMITIDA" | "ANULADA";

const ESTADO_LABELS: Record<EstadoCotizacion, string> = {
  BORRADOR: "Borrador",
  EMITIDA:  "Emitida",
  ANULADA:  "Anulada",
};

const ESTADO_COLORS: Record<EstadoCotizacion, string> = {
  BORRADOR: "bg-gray-50 text-gray-600 border border-gray-200",
  EMITIDA:  "bg-green-50 text-green-600 border border-green-200",
  ANULADA:  "bg-red-50 text-red-500 border border-red-200",
};

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("es-CL") : "—";
}

// Soporta AMBOS shapes vía normalizarGastos: cotizaciones antiguas guardadas
// con el record fijo { combustible, operador, ... } y las nuevas con lista
// dinámica de { id, label, monto }. Filtra los de monto > 0.
function gastosNoCero(raw: unknown): { id: string; label: string; value: number }[] {
  return normalizarGastos(raw)
    .map((g) => ({ id: g.id, label: g.label, value: g.monto }))
    .filter((x) => x.value > 0);
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CotizacionDetallePage({ params }: Props) {
  const { id } = await params;
  const [session, cotizacion] = await Promise.all([
    getPortalSessionFast(),
    prisma.quotation.findUnique({
      where: { id },
      include: { items: { orderBy: { orden: "asc" } } },
    }),
  ]);
  if (!session) redirect("/login");
  if (!cotizacion) notFound();

  const canManage = session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR";
  const gastos = gastosNoCero(cotizacion.gastos);
  const descuentoPct = Number(cotizacion.descuento_porcentaje);
  const ivaPct = Number(cotizacion.iva_porcentaje);

  const pdfUrl = `/api/cotizaciones/${cotizacion.id}/pdf`;
  const numero = cotizacion.numero;
  const titulo = `Cotización Solterra N° ${numero}`;
  const empresaNombre = cotizacion.cliente_nombre_snapshot ?? "";
  const safeNum = numero.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const pdfFileName = `cotizacion-solterra-${safeNum || "s-n"}.pdf`;
  const waMensaje = `Hola, te envío la ${titulo} de Solterra SpA${empresaNombre ? ` para ${empresaNombre}` : ""}. El PDF se descargó en este dispositivo para adjuntarlo si no se adjunta automáticamente.`;
  const emailAsunto = `${titulo} — Solterra SpA`;
  const emailCuerpo = `Estimados,\n\nAdjunto la ${titulo}${empresaNombre ? ` para ${empresaNombre}` : ""}. Si el archivo no se adjuntó automáticamente, fue descargado para adjuntarlo manualmente.\n\nSaludos,\nSolterra SpA`;
  const emailDestino = cotizacion.cliente_email_snapshot ?? undefined;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/cotizaciones">
            <Button variant="ghost" size="sm" className="flex-shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[#253158]">Cotización N° {numero}</h1>
            <p className="text-gray-500 text-sm">Emitida el {fmtDate(cotizacion.fecha_emision)}</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md flex-shrink-0 ${ESTADO_COLORS[cotizacion.estado as EstadoCotizacion]}`}>
            {ESTADO_LABELS[cotizacion.estado as EstadoCotizacion].toUpperCase()}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-10 sm:pl-0">
          <QuotationStatusActions id={cotizacion.id} numero={cotizacion.numero} estado={cotizacion.estado as EstadoCotizacion} canManage={canManage} />
          <a href={pdfUrl} download={pdfFileName}>
            <Button size="sm" className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              <FileDown className="h-4 w-4" />
              Descargar PDF
            </Button>
          </a>
          <PrintPdfButton pdfUrl={pdfUrl} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cliente */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-[#253158]">Cliente</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Nombre / Razón social</dt>
              <dd className="text-gray-800 font-medium">{cotizacion.cliente_nombre_snapshot ?? "Sin cliente asociado"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">RUT</dt>
              <dd className="text-gray-800">{cotizacion.cliente_rut_snapshot ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Giro</dt>
              <dd className="text-gray-800">{cotizacion.cliente_giro_snapshot ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Email</dt>
              <dd className="text-gray-800 break-words">{cotizacion.cliente_email_snapshot ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Teléfono</dt>
              <dd className="text-gray-800">{cotizacion.cliente_telefono_snapshot ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Dirección</dt>
              <dd className="text-gray-800">{cotizacion.cliente_direccion_snapshot ?? "—"}</dd>
            </div>
          </dl>
        </div>

        {/* Resumen de totales */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 lg:col-span-2">
          <h2 className="font-semibold text-[#253158]">Resumen</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Subtotal (equipos + gastos)</dt><dd className="text-gray-800 tabular-nums">{formatCurrency(Number(cotizacion.subtotal), "CLP")}</dd></div>
            {descuentoPct > 0 && (
              <div className="flex justify-between"><dt className="text-gray-500">Descuento ({descuentoPct}%)</dt><dd className="text-gray-800 tabular-nums">- {formatCurrency(Number(cotizacion.descuento_monto), "CLP")}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-gray-500">Neto</dt><dd className="text-gray-800 tabular-nums">{formatCurrency(Number(cotizacion.neto), "CLP")}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">IVA ({ivaPct}%)</dt><dd className="text-gray-800 tabular-nums">{formatCurrency(Number(cotizacion.iva_monto), "CLP")}</dd></div>
            {cotizacion.validez_dias != null && (
              <div className="flex justify-between"><dt className="text-gray-500">Validez</dt><dd className="text-gray-800 tabular-nums">{cotizacion.validez_dias} días</dd></div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-100"><dt className="font-semibold text-[#253158]">Total</dt><dd className="font-bold text-[#253158] tabular-nums">{formatCurrency(Number(cotizacion.total), "CLP")}</dd></div>
          </dl>
          {gastos.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Gastos generales</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {gastos.map((g) => (
                  <span key={g.id} className="text-gray-600">{g.label}: <span className="tabular-nums text-gray-800">{formatCurrency(g.value, "CLP")}</span></span>
                ))}
              </div>
            </div>
          )}
          {(cotizacion.observaciones || cotizacion.condiciones) && (
            <div className="pt-3 border-t border-gray-100 space-y-2">
              {cotizacion.observaciones && (
                <div><dt className="text-xs text-gray-400 uppercase tracking-wide">Observaciones</dt><dd className="text-gray-700 text-sm mt-0.5 whitespace-pre-wrap">{cotizacion.observaciones}</dd></div>
              )}
              {cotizacion.condiciones && (
                <div><dt className="text-xs text-gray-400 uppercase tracking-wide">Condiciones</dt><dd className="text-gray-700 text-sm mt-0.5 whitespace-pre-wrap">{cotizacion.condiciones}</dd></div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Equipos / servicios */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-[#253158]">Equipos y servicios ({cotizacion.items.length})</h2>
        </div>
        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipo / Servicio</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Valor hora</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Cantidad</TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cotizacion.items.map((it) => {
                const esHoras = it.tipo !== "dias";
                const cant = esHoras ? Number(it.cantidad_horas) : Number(it.cantidad_dias);
                return (
                  <TableRow key={it.id} className="border-b border-gray-100 last:border-0">
                    <TableCell className="px-5 py-4 font-medium text-gray-800 text-sm">{it.descripcion}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 text-sm">{esHoras ? "Por horas" : `Por días (${it.horas_minimas_diarias} h/día)`}</TableCell>
                    <TableCell className="px-5 py-4 text-right text-gray-800 text-sm tabular-nums">{formatCurrency(Number(it.valor_hora), "CLP")}</TableCell>
                    <TableCell className="px-5 py-4 text-right text-gray-600 text-sm tabular-nums">{cant} {esHoras ? "h" : "d"}</TableCell>
                    <TableCell className="px-5 py-4 text-right font-semibold text-[#253158] text-sm tabular-nums">{formatCurrency(Number(it.subtotal), "CLP")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {/* Móvil */}
        <div className="sm:hidden divide-y divide-gray-100">
          {cotizacion.items.map((it) => {
            const esHoras = it.tipo !== "dias";
            const cant = esHoras ? Number(it.cantidad_horas) : Number(it.cantidad_dias);
            return (
              <div key={it.id} className="px-4 py-3.5 space-y-1">
                <p className="text-sm font-semibold text-gray-800">{it.descripcion}</p>
                <p className="text-xs text-gray-500">{esHoras ? "Por horas" : `Por días (${it.horas_minimas_diarias} h/día)`}</p>
                <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
                  <span>{formatCurrency(Number(it.valor_hora), "CLP")} × {cant} {esHoras ? "h" : "d"}</span>
                  <span className="font-semibold text-[#253158] tabular-nums">{formatCurrency(Number(it.subtotal), "CLP")}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compartir */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-[#253158] mb-3">Compartir cotización</h2>
        <PdfShareActions
          pdfUrl={pdfUrl}
          fileName={pdfFileName}
          title={titulo}
          whatsappMessage={waMensaje}
          emailSubject={emailAsunto}
          emailBody={emailCuerpo}
          emailTo={emailDestino}
        />
      </div>

      <div className="flex justify-start">
        <Link href="/cotizaciones">
          <Button className="bg-white border border-gray-300 text-[#253158] hover:bg-gray-50 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Cotizaciones
          </Button>
        </Link>
      </div>
    </div>
  );
}
