export const dynamic = "force-dynamic";

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { prisma } from "@/lib/prisma";
import { getParteDetalle } from "@/lib/terreno/queries";
import {
  RegistroDocument,
  type RegistroPDFData,
} from "@/lib/pdf/mantencion/registro-template";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !canAccessModule(session, "OPERACION")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const p = await getParteDetalle(id);
  if (!p) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  }

  const equipo = await prisma.mantEquipo.findUnique({
    where: { id: p.equipo_id },
    select: { tipo: true, patente: true },
  });

  const data: RegistroPDFData = {
    responsable: p.operador,
    tipoEquipo: equipo?.tipo ?? p.equipo,
    patente: equipo?.patente ?? p.equipoCodigo,
    odometro: p.odometro,
    horometro: p.horometro,
    areaUso: p.area_uso,
    centroCosto: p.centro_costo,
    tipoMantencion: p.tipo_mantencion,
    combustible: p.combustible_fraccion,
    fechaIngreso: p.fecha,
    fechaSalida: p.fecha_salida,
    nombreResponsable: p.nombre_responsable,
    rutResponsable: p.rut_responsable,
    nombreReceptor: p.nombre_receptor,
    rutReceptor: p.rut_receptor,
    componentes: p.componentes,
    observaciones: p.observaciones,
  };

  let buffer: Buffer;
  try {
    const element = React.createElement(RegistroDocument, {
      data,
    }) as React.ReactElement;
    buffer = await renderToBuffer(element);
  } catch (err) {
    console.error(
      "[registro-pdf] Error generando PDF:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="registro-${id.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
