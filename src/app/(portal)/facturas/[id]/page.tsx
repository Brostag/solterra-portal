import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/company-settings";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import type { Moneda } from "@/types";
import FacturaActions from "./FacturaActions";
import PrintButton from "./PrintButton";
import { updateInvoiceStatus, annulInvoice } from "../actions";
import DocumentsSection from "@/components/portal/DocumentsSection";

const estadoColors: Record<string, string> = {
  CREADA: "bg-blue-100 text-blue-700",
  ENVIADA: "bg-yellow-100 text-yellow-700",
  PAGADA: "bg-green-100 text-green-700",
  ANULADA: "bg-red-100 text-red-600",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FacturaDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/facturas">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">
              Factura #{invoice.numero_factura}
            </h1>
            <p className="text-gray-500 text-sm">
              Creada por {invoice.user.nombre} ·{" "}
              {new Date(invoice.fecha_emision).toLocaleDateString("es-CL")}
            </p>
          </div>
          <Badge className={`${estadoColors[invoice.estado]} hover:${estadoColors[invoice.estado]}`}>
            {invoice.estado}
          </Badge>
        </div>

        <div className="flex gap-2">
          <a href={`/api/facturas/${id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </a>
          <PrintButton />
        </div>
      </div>

      {/* Datos empresa y cliente */}
      <div className="bg-white rounded-lg border p-6 grid grid-cols-2 gap-6">
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
        <table className="w-full text-sm">
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
    </div>
  );
}
