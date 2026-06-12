import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/company-settings";
import { notFound } from "next/navigation";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import type { Moneda } from "@/types";
import FacturaActions from "./FacturaActions";
import PrintButton from "./PrintButton";
import { updateInvoiceStatus, annulInvoice } from "../actions";
import DocumentsSection from "@/components/portal/DocumentsSection";
import PdfShareActions from "@/components/portal/PdfShareActions";

const ESTADO_LABELS: Record<string, string> = {
  CREADA:  "Creada",
  ENVIADA: "Enviada",
  PAGADA:  "Pagada",
  ANULADA: "Anulada",
};

const ESTADO_COLORS: Record<string, string> = {
  CREADA:  "bg-blue-50 text-blue-600 border border-blue-200",
  ENVIADA: "bg-amber-50 text-amber-600 border border-amber-200",
  PAGADA:  "bg-green-50 text-green-600 border border-green-200",
  ANULADA: "bg-red-50 text-red-500 border border-red-200",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FacturaDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const [invoice, config] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { nombre: true, rut: true, email: true } },
        user: { select: { nombre: true } },
        items: { include: { product: { select: { nombre: true } } } },
      },
    }),
    getCompanySettings(),
  ]);

  if (!invoice) notFound();

  const moneda = invoice.moneda as Moneda;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/facturas">
            <Button variant="ghost" size="sm" className="flex-shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[#253158]">
              Factura #{invoice.numero_factura}
            </h1>
            <p className="text-gray-500 text-sm">
              Creada por {invoice.user.nombre} ·{" "}
              {new Date(invoice.fecha_emision).toLocaleDateString("es-CL")}
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md flex-shrink-0 ${ESTADO_COLORS[invoice.estado]}`}>
            {(ESTADO_LABELS[invoice.estado] ?? invoice.estado).toUpperCase()}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pl-10 sm:pl-0">
          <a href={`/api/facturas/${id}/pdf`} download={`factura-${invoice.numero_factura}.pdf`}>
            <Button size="sm" className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              <FileDown className="h-4 w-4" />
              Descargar PDF
            </Button>
          </a>
          <PrintButton pdfUrl={`/api/facturas/${id}/pdf`} />
        </div>
      </div>

      {/* Datos empresa y cliente */}
      <div className="bg-white rounded-lg border p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Emisor</p>
          <p className="font-semibold text-[#253158]">{config?.razon_social ?? "Solterra"}</p>
          <p className="text-sm text-gray-500">{config?.rut ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Cliente</p>
          <p className="font-semibold text-gray-800">{invoice.client.nombre}</p>
          {invoice.client.rut && <p className="text-sm text-gray-500">RUT: {invoice.client.rut}</p>}
          {invoice.client.email && <p className="text-sm text-gray-500">{invoice.client.email}</p>}
        </div>
      </div>

      {/* Moneda / tipo de cambio */}
      {invoice.moneda !== "CLP" && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-sm text-blue-700">
          Moneda: <strong>{invoice.moneda}</strong> · Tipo de cambio al{" "}
          {new Date(invoice.fecha_tipo_cambio).toLocaleDateString("es-CL")}:{" "}
          <strong>{Number(invoice.tipo_cambio).toLocaleString("es-CL")}</strong>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Móvil: filas expandidas — sm:hidden */}
        <div className="sm:hidden">
          <div className="divide-y divide-gray-100">
            {invoice.items.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <p className="text-sm font-medium text-gray-800">{item.descripcion}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">
                    {Number(item.cantidad)} × {formatCurrency(Number(item.precio_unitario), moneda)}
                  </span>
                  <span className="text-sm font-semibold text-gray-800 tabular-nums">
                    {formatCurrency(Number(item.subtotal), moneda)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t bg-gray-50 divide-y divide-gray-100">
            <div className="flex justify-between px-4 py-2 text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium tabular-nums">{formatCurrency(Number(invoice.subtotal), moneda)}</span>
            </div>
            <div className="flex justify-between px-4 py-2 text-sm">
              <span className="text-gray-500">IVA</span>
              <span className="font-medium tabular-nums">{formatCurrency(Number(invoice.iva), moneda)}</span>
            </div>
            <div className="flex justify-between px-4 py-3 font-bold text-[#253158] bg-[#253158]/5">
              <span>Total</span>
              <span className="tabular-nums text-base">{formatCurrency(Number(invoice.total), moneda)}</span>
            </div>
          </div>
        </div>

        {/* Desktop: tabla — hidden sm:block */}
        <table className="hidden sm:table w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Descripción</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium w-24">Cant.</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium w-32">P. Unitario</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium w-32">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.descripcion}</td>
                <td className="px-4 py-3 text-right text-gray-500">{Number(item.cantidad)}</td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(Number(item.precio_unitario), moneda)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(Number(item.subtotal), moneda)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-gray-500 text-sm">Subtotal</td>
              <td className="px-4 py-2 text-right font-medium">
                {formatCurrency(Number(invoice.subtotal), moneda)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-gray-500 text-sm">IVA</td>
              <td className="px-4 py-2 text-right font-medium">
                {formatCurrency(Number(invoice.iva), moneda)}
              </td>
            </tr>
            <tr className="bg-[#253158]/5">
              <td colSpan={3} className="px-4 py-3 text-right font-bold text-[#253158]">Total</td>
              <td className="px-4 py-3 text-right font-bold text-[#253158] text-base">
                {formatCurrency(Number(invoice.total), moneda)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Motivo anulación */}
      {invoice.estado === "ANULADA" && invoice.motivo_anulacion && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-700">Motivo de anulación</p>
          <p className="text-sm text-red-600 mt-1">{invoice.motivo_anulacion}</p>
        </div>
      )}

      {/* Acciones */}
      {invoice.estado !== "ANULADA" && (
        <FacturaActions
          invoiceId={id}
          currentStatus={invoice.estado as "CREADA" | "ENVIADA" | "PAGADA"}
          userRol={session.rol}
          updateStatus={updateInvoiceStatus}
          annul={annulInvoice}
        />
      )}

      {/* Documentos adjuntos */}
      <DocumentsSection
        invoice_id={id}
        sessionId={session.id}
        sessionRol={session.rol}
      />

      {/* Compartir factura */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-[#253158] mb-3">Compartir factura</h2>
        <PdfShareActions
          pdfUrl={`/api/facturas/${id}/pdf`}
          fileName={`factura-${invoice.numero_factura}.pdf`}
          title={`Factura #${invoice.numero_factura}`}
          whatsappMessage={`Hola, te envío la Factura #${invoice.numero_factura} de Solterra SpA${invoice.client.nombre ? ` para ${invoice.client.nombre}` : ""}. El PDF se descargó en este dispositivo para adjuntarlo si WhatsApp no lo adjunta automáticamente.`}
          emailSubject={`Factura #${invoice.numero_factura} — Solterra SpA`}
          emailBody={`Estimados,\n\nAdjunto la Factura #${invoice.numero_factura}${invoice.client.nombre ? ` (${invoice.client.nombre})` : ""}. Si el archivo no se adjuntó automáticamente, fue descargado para adjuntarlo manualmente.\n\nSaludos,\nSolterra SpA`}
          emailTo={invoice.client.email ?? undefined}
        />
      </div>

      {/* Volver */}
      <div className="flex justify-start">
        <Link href="/facturas">
          <Button className="bg-white border border-gray-300 text-[#253158] hover:bg-gray-50 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Facturas
          </Button>
        </Link>
      </div>
    </div>
  );
}
