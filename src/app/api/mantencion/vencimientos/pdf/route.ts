export const dynamic = "force-dynamic";

import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getReporteVencimientos } from "@/lib/terreno/queries";
import {
  VencimientosDocument,
  type VencimientosPDFData,
} from "@/lib/pdf/mantencion/vencimientos-template";

export async function GET() {
  const session = await getSession();
  if (!session || !canAccessModule(session, "MANTENCION")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const equipos = await getReporteVencimientos();
  const data: VencimientosPDFData = { equipos };

  let buffer: Buffer;
  try {
    const element = React.createElement(VencimientosDocument, {
      data,
    }) as React.ReactElement;
    buffer = await renderToBuffer(element);
  } catch (err) {
    console.error(
      "[vencimientos-pdf] Error generando PDF:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-fechas-vencimientos.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
