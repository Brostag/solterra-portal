import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { PurchaseOrderDocument } from "@/lib/pdf/purchase-order-template";
import { getCompanySettings } from "@/lib/company-settings";
import React from "react";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Solo ADMINISTRADOR y SUPERVISOR pueden descargar PDF de OC
  if (session.rol === "USUARIO") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;

  const [oc, config] = await Promise.all([
    prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        proveedor: true,
        items: { orderBy: { orden: "asc" } },
      },
    }),
    getCompanySettings(),
  ]);

  if (!oc) return NextResponse.json({ error: "OC no encontrada" }, { status: 404 });
  if (!config) return NextResponse.json({ error: "Configuracion de empresa no encontrada" }, { status: 500 });

  const ivaPercent = Number(config.iva_porcentaje);

  const data = {
    numero: oc.numero,
    fecha_emision: oc.fecha_emision,
    fecha_envio: oc.fecha_envio,
    estado: oc.estado,
    moneda: oc.moneda,
    tipo_cambio: oc.tipo_cambio ? Number(oc.tipo_cambio) : null,
    condiciones_pago: oc.condiciones_pago,
    observaciones: oc.observaciones,
    subtotal: Number(oc.subtotal),
    descuento_pct: Number(oc.descuento_pct),
    descuento_monto: Number(oc.descuento_monto),
    neto: Number(oc.neto),
    iva_monto: Number(oc.iva_monto),
    total: Number(oc.total),
    ivaPercent,
    motivo_anulacion: oc.motivo_anulacion,
    items: oc.items.map((it) => ({
      descripcion: it.descripcion,
      cantidad: Number(it.cantidad),
      valor_unitario: Number(it.valor_unitario),
      total: Number(it.total),
    })),
    proveedor: {
      nombre: oc.proveedor.nombre,
      rut: oc.proveedor.rut,
      giro: oc.proveedor.giro,
      direccion: oc.proveedor.direccion,
      ciudad: oc.proveedor.ciudad,
      contacto: oc.proveedor.contacto,
      email: oc.proveedor.email,
      telefono: oc.proveedor.telefono,
    },
    company: {
      razon_social: config.razon_social,
      rut: config.rut,
      giro: config.giro,
      direccion: config.direccion,
      email: config.email,
      telefono: config.telefono,
      logo_url: config.logo_url,
    },
  };

  const element = React.createElement(PurchaseOrderDocument, { oc: data });

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(element as ReactElement<DocumentProps>);
  } catch (err) {
    console.error("[pdf] Error generando PDF de OC:", err);
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="orden-compra-${oc.numero}.pdf"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
