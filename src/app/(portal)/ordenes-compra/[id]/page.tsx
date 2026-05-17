import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/company-settings";
import { notFound, redirect } from "next/navigation";
import { getPortalSessionFast } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Download, Pencil } from "lucide-react";
import type { EstadoOC, Moneda, Rol } from "@/types";
import OCActions from "./OCActions";
import NuevoOCForm from "../nueva/NuevoOCForm";
import { changeOrderStatus, annulOrder } from "../actions";
import DocumentsSection from "@/components/portal/DocumentsSection";
import PrintPdfButton from "@/components/portal/PrintPdfButton";

const ESTADO_COLORS: Record<EstadoOC, string> = {
  BORRADOR:  "bg-gray-100 text-gray-600",
  EMITIDA:   "bg-blue-100 text-blue-700",
  ENVIADA:   "bg-indigo-100 text-indigo-700",
  APROBADA:  "bg-green-100 text-green-700",
  RECHAZADA: "bg-red-100 text-[#c6352e]",
  ANULADA:   "bg-red-50 text-red-800",
};

const ESTADO_LABELS: Record<EstadoOC, string> = {
  BORRADOR: "Borrador", EMITIDA: "Emitida", ENVIADA: "Enviada",
  APROBADA: "Aprobada", RECHAZADA: "Rechazada", ANULADA: "Anulada",
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}

export default async function OCDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { edit } = await searchParams;
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const [oc, config] = await Promise.all([
    prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        proveedor: true,
        creadoPor: { select: { nombre: true } },
        items: { orderBy: { orden: "asc" }, include: { producto: { select: { nombre: true } } } },
      },
    }),
    getCompanySettings(),
  ]);

  if (!oc) notFound();

  const moneda = oc.moneda as Moneda;
  const estado = oc.estado as EstadoOC;
  const ivaPercent = config ? Number(config.iva_porcentaje) : 19;

  // Modo edición: solo en BORRADOR o si es ADMIN
  const canEdit =
    session.rol !== "USUARIO" &&
    (estado === "BORRADOR" || session.rol === "ADMINISTRADOR");

  if (edit === "1" && canEdit) {
    const [suppliers, products] = await Promise.all([
      prisma.supplier.findMany({ where: { activo: true }, select: { id: true, nombre: true, rut: true }, orderBy: { nombre: "asc" } }),
      prisma.product.findMany({ where: { activo: true }, select: { id: true, nombre: true, precio_unitario: true }, orderBy: { nombre: "asc" } }),
    ]);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href={`/ordenes-compra/${id}`}>
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold text-[#253158]">Editar OC {oc.numero}</h1>
        </div>
        <NuevoOCForm
          suppliers={suppliers.map((s) => ({ ...s, rut: s.rut ?? null }))}
          products={products.map((p) => ({ ...p, precio_unitario: Number(p.precio_unitario) }))}
          ivaPercent={ivaPercent}
          mode="edit"
          ocId={id}
          defaultValues={{
            proveedor_id: oc.proveedor_id,
            fecha_envio: oc.fecha_envio ? oc.fecha_envio.toISOString().slice(0, 10) : "",
            moneda: oc.moneda as "CLP" | "USD",
            tipo_cambio: oc.tipo_cambio ? Number(oc.tipo_cambio) : 0,
            condiciones_pago: oc.condiciones_pago ?? "",
            observaciones: oc.observaciones ?? "",
            descuento_pct: Number(oc.descuento_pct),
            items: oc.items.map((it) => ({
              producto_id: it.producto_id ?? null,
              descripcion: it.descripcion,
              cantidad: Number(it.cantidad),
              valor_unitario: Number(it.valor_unitario),
            })),
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/ordenes-compra">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">{oc.numero}</h1>
            <p className="text-gray-500 text-sm">
              Creada por {oc.creadoPor.nombre} ·{" "}
              {new Date(oc.fecha_emision).toLocaleDateString("es-CL")}
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_COLORS[estado]}`}>
            {ESTADO_LABELS[estado]}
          </span>
        </div>

        <div className="flex gap-2">
          {canEdit && estado === "BORRADOR" && (
            <Link href={`/ordenes-compra/${id}?edit=1`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </Link>
          )}
          <a href={`/api/ordenes-compra/${id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </a>
          <PrintPdfButton pdfUrl={`/api/ordenes-compra/${id}/pdf`} />
        </div>
      </div>

      {/* Proveedor + datos */}
      <div className="bg-white rounded-lg border p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Proveedor</p>
          <p className="font-semibold text-[#253158]">{oc.proveedor.nombre}</p>
          {oc.proveedor.rut && <p className="text-sm text-gray-500">RUT: {oc.proveedor.rut}</p>}
          {oc.proveedor.giro && <p className="text-sm text-gray-500">{oc.proveedor.giro}</p>}
          {oc.proveedor.direccion && <p className="text-sm text-gray-500">{oc.proveedor.direccion}</p>}
          {oc.proveedor.ciudad && <p className="text-sm text-gray-500">{oc.proveedor.ciudad}</p>}
          {oc.proveedor.contacto && <p className="text-sm text-gray-500">Contacto: {oc.proveedor.contacto}</p>}
          {oc.proveedor.email && <p className="text-sm text-gray-500">{oc.proveedor.email}</p>}
          {oc.proveedor.telefono && <p className="text-sm text-gray-500">Tel: {oc.proveedor.telefono}</p>}
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Datos de la orden</p>
          <p className="text-sm text-gray-700">
            <span className="text-gray-400">Moneda:</span> {oc.moneda}
          </p>
          {oc.fecha_envio && (
            <p className="text-sm text-gray-700">
              <span className="text-gray-400">Fecha envío:</span>{" "}
              {new Date(oc.fecha_envio).toLocaleDateString("es-CL")}
            </p>
          )}
          {oc.condiciones_pago && (
            <p className="text-sm text-gray-700">
              <span className="text-gray-400">Condiciones de pago:</span> {oc.condiciones_pago}
            </p>
          )}
        </div>
      </div>

      {/* Tipo de cambio */}
      {oc.moneda !== "CLP" && oc.tipo_cambio && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-sm text-blue-700">
          Tipo de cambio: <strong>1 USD = ${Number(oc.tipo_cambio).toLocaleString("es-CL")} CLP</strong>
        </div>
      )}

      {/* Tabla de ítems */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#253158] text-white">
            <tr>
              <th className="text-center px-4 py-3 font-semibold w-24">Cantidad</th>
              <th className="text-left px-4 py-3 font-semibold">Detalle</th>
              <th className="text-right px-4 py-3 font-semibold w-32">Valor Hr / Unit.</th>
              <th className="text-right px-4 py-3 font-semibold w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {oc.items.map((item, i) => (
              <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-3 text-center text-gray-600">{Number(item.cantidad)}</td>
                <td className="px-4 py-3">
                  <p className="text-gray-800">{item.descripcion}</p>
                  {item.producto && (
                    <p className="text-xs text-gray-400 mt-0.5">Catálogo: {item.producto.nombre}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {formatCurrency(Number(item.valor_unitario), moneda)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(Number(item.total), moneda)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-gray-500 text-sm">Subtotal</td>
              <td className="px-4 py-2 text-right font-medium">{formatCurrency(Number(oc.subtotal), moneda)}</td>
            </tr>
            {Number(oc.descuento_pct) > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-gray-500 text-sm">
                  Descuento ({Number(oc.descuento_pct)}%)
                </td>
                <td className="px-4 py-2 text-right font-medium text-[#c6352e]">
                  −{formatCurrency(Number(oc.descuento_monto), moneda)}
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-gray-500 text-sm">Neto</td>
              <td className="px-4 py-2 text-right font-medium">{formatCurrency(Number(oc.neto), moneda)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-gray-500 text-sm">IVA ({ivaPercent}%)</td>
              <td className="px-4 py-2 text-right font-medium">{formatCurrency(Number(oc.iva_monto), moneda)}</td>
            </tr>
            <tr className="bg-[#253158]/5">
              <td colSpan={3} className="px-4 py-3 text-right font-bold text-[#253158]">
                TOTAL {oc.moneda}
              </td>
              <td className="px-4 py-3 text-right font-bold text-[#253158] text-base">
                {formatCurrency(Number(oc.total), moneda)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Observaciones */}
      {oc.observaciones && (
        <div className="bg-gray-50 rounded-lg border p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Observaciones</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{oc.observaciones}</p>
        </div>
      )}

      {/* Motivo anulación */}
      {estado === "ANULADA" && oc.motivo_anulacion && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-700">Motivo de anulación</p>
          <p className="text-sm text-red-600 mt-1">{oc.motivo_anulacion}</p>
        </div>
      )}

      {/* Acciones */}
      {estado !== "ANULADA" && session.rol !== "USUARIO" && (
        <OCActions
          ocId={id}
          estado={estado}
          rol={session.rol as Rol}
          onChangeStatus={changeOrderStatus}
          onAnnul={annulOrder}
        />
      )}

      {/* Documentos adjuntos */}
      <DocumentsSection
        purchase_order_id={id}
        sessionId={session.id}
        sessionRol={session.rol}
      />
    </div>
  );
}
