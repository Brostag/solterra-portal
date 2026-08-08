export const dynamic = "force-dynamic";

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getMantencionParaPDF } from "@/lib/terreno/queries";
import { OrdenTrabajoDocument, type OTPDFData } from "@/lib/pdf/mantencion/ot-template";

// Solo caracteres seguros para Content-Disposition: el código de equipo es
// texto libre en MantEquipo.codigo, no un valor validado para nombre de archivo.
function sanitizarNombreArchivo(v: string): string {
  return v.replace(/[^A-Za-z0-9._-]/g, "") || "equipo";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !canAccessModule(session, "MANTENCION")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const m = await getMantencionParaPDF(id);
  if (!m) {
    return NextResponse.json({ error: "Orden de trabajo no encontrada" }, { status: 404 });
  }

  const data: OTPDFData = {
    equipoCodigo: m.equipoCodigo,
    equipoNombre: m.equipoNombre,
    tipoEquipo: m.tipoEquipo,
    marca: m.marca,
    patente: m.patente,
    tipoMantencion: m.tipo,
    estado: m.estado,
    responsable: m.responsable,
    fechaInicio: m.fecha_inicio,
    fechaFin: m.fecha_fin,
    horometroRealizada: m.horometro_realizada,
    costo: m.costo,
    proximaMantencionHorometro: m.proxima_mantencion_horometro,
    proximaMantencionFecha: m.proxima_mantencion_fecha,
    descripcion: m.descripcion,
    trabajosRealizados: m.trabajos_realizados,
    repuestosUsados: m.repuestos_usados,
    observaciones: m.observaciones,
  };

  let buffer: Buffer;
  try {
    const element = React.createElement(OrdenTrabajoDocument, {
      data,
    }) as React.ReactElement;
    buffer = await renderToBuffer(element);
  } catch (err) {
    console.error(
      "[ot-pdf] Error generando PDF:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }

  const codigo = sanitizarNombreArchivo(m.equipoCodigo ?? "equipo");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="orden-trabajo-${codigo}-${id.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
