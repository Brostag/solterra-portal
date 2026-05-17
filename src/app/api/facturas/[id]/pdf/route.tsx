export const dynamic = "force-dynamic";

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { InvoiceDocument } from "@/lib/pdf/invoice-template";
import { getCompanySettings } from "@/lib/company-settings";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: { select: { nombre: true, rut: true, email: true, direccion: true } },
      items: {
        include: {
          product: { select: { codigo_interno: true } },
        },
      },
    },
  });

  if (!invoice) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  if (session.rol === "USUARIO" && invoice.user_id !== session.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const config = await getCompanySettings();

  const ivaPercent = config ? Number(config.iva_porcentaje) : 19;

  const invoiceData = {
    numero_factura: invoice.numero_factura,
    fecha_emision: invoice.fecha_emision,
    estado: invoice.estado,
    motivo_anulacion: invoice.motivo_anulacion ?? null,
    moneda: invoice.moneda,
    tipo_cambio: Number(invoice.tipo_cambio),
    fecha_tipo_cambio: invoice.fecha_tipo_cambio,
    subtotal: Number(invoice.subtotal),
    iva: Number(invoice.iva),
    total: Number(invoice.total),
    ivaPercent,
    items: invoice.items.map((i) => ({
      descripcion: i.descripcion,
      cantidad: Number(i.cantidad),
      precio_unitario: Number(i.precio_unitario),
      subtotal: Number(i.subtotal),
      codigo_interno: i.product?.codigo_interno ?? null,
    })),
    client: invoice.client,
    company: {
      razon_social: config?.razon_social ?? "Solterra",
      rut: config?.rut ?? "—",
      giro: config?.giro,
      direccion: config?.direccion,
      email: config?.email,
      telefono: config?.telefono,
      logo_url: config?.logo_url ?? null,
    },
  };

  let buffer: Buffer;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buffer = await renderToBuffer(React.createElement(InvoiceDocument, { invoice: invoiceData }) as React.ReactElement<any>);
  } catch (err) {
    console.error("[pdf] Error generando PDF:", err);
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="factura-${invoice.numero_factura}.pdf"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}