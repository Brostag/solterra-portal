export const dynamic = "force-dynamic";

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getCertificadoMantencionDetalle } from "@/lib/terreno/queries";
import {
  CertificadoMantencionDocument,
  type CertificadoPDFData,
} from "@/lib/pdf/mantencion/certificado-template";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !canAccessModule(session, "MANTENCION")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const c = await getCertificadoMantencionDetalle(id);
  if (!c) {
    return NextResponse.json({ error: "Certificado no encontrado" }, { status: 404 });
  }

  const data: CertificadoPDFData = {
    correlativo: c.correlativo,
    ciudad: c.ciudad,
    fecha: c.fecha,
    tipoEquipo: c.tipo_equipo_snapshot,
    marca: c.marca_snapshot,
    patente: c.patente_snapshot,
    horometro: c.horometro_snapshot,
    odometro: c.odometro_snapshot,
    proximaMantencion: c.proxima_mantencion,
    firmaEncargadoB64: c.firma_encargado_b64,
    firmaGerenteB64: c.firma_gerente_b64,
  };

  let buffer: Buffer;
  try {
    const element = React.createElement(CertificadoMantencionDocument, {
      data,
    }) as React.ReactElement;
    buffer = await renderToBuffer(element);
  } catch (err) {
    console.error(
      "[certificado-mant-pdf] Error generando PDF:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-mantencion-${c.correlativo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
