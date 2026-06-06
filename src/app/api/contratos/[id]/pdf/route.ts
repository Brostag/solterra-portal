export const dynamic = "force-dynamic";

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ContractDocument, type ContractPDFData } from "@/lib/pdf/contract-template";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const contrato = await prisma.contract.findUnique({
    where: { id },
    include: {
      client: true,
      equipos: { orderBy: { orden: "asc" } },
    },
  });
  if (!contrato) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }

  const data: ContractPDFData = {
    numero_contrato: contrato.numero_contrato,
    ciudad_celebracion: contrato.ciudad_celebracion,
    fecha: contrato.fecha_emision,
    vigencia_contrato: contrato.vigencia_contrato,
    cliente: {
      nombre:    contrato.cliente_nombre_snapshot    ?? contrato.client.nombre,
      rut:       contrato.cliente_rut_snapshot       ?? contrato.client.rut,
      direccion: contrato.cliente_direccion_snapshot ?? contrato.client.direccion,
      email:     contrato.cliente_email_snapshot     ?? contrato.client.email,
    },
    representante_cliente: contrato.representante_cliente,
    rut_representante: contrato.rut_representante,
    numero_anexo: contrato.numero_anexo,
    fecha_anexo: contrato.fecha_anexo,
    numero_cotizacion: contrato.numero_cotizacion,
    lugar_operacion: contrato.lugar_operacion,
    forma_pago: contrato.forma_pago,
    correo_notificaciones: contrato.correo_notificaciones,
    moneda: contrato.moneda,
    equipos: contrato.equipos.map((eq) => ({
      descripcion: eq.descripcion,
      marca: eq.marca,
      modelo: eq.modelo,
      patente: eq.patente,
      anio: eq.anio,
      chasis: eq.chasis,
      motor: eq.motor,
      color: eq.color,
      horometro_inicial: eq.horometro_inicial,
      mantenimiento_horas: eq.mantenimiento_horas,
      valor_hora: Number(eq.valor_hora),
      horas_minimas_mensuales: eq.horas_minimas_mensuales,
      tarifa_hora_extra: eq.tarifa_hora_extra != null ? Number(eq.tarifa_hora_extra) : null,
      valor_mensual_estimado: eq.valor_mensual_estimado != null ? Number(eq.valor_mensual_estimado) : null,
    })),
  };

  let buffer: Buffer;
  try {
    const element = React.createElement(ContractDocument, { data }) as React.ReactElement;
    buffer = await renderToBuffer(element);
  } catch (err) {
    console.error("[contrato-pdf] Error generando PDF:", err);
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }

  const safeNum = contrato.numero_contrato.replace(/[^a-zA-Z0-9-]/g, "");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="contrato-arrendamiento-solterra-${safeNum}.pdf"`,
      "Cache-Control":       "no-store",
    },
  });
}
