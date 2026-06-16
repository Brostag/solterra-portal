export const dynamic = "force-dynamic";

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { prisma } from "@/lib/prisma";
import { getChecklistMantencionDetalle } from "@/lib/terreno/queries";
import {
  ChecklistMantencionDocument,
  type ChecklistPDFData,
} from "@/lib/pdf/mantencion/checklist-template";
import type { ChecklistMantData } from "@/lib/terreno/checklist-mantencion-items";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !canAccessModule(session, "MANTENCION")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const c = await getChecklistMantencionDetalle(id);
  if (!c) {
    return NextResponse.json({ error: "Check list no encontrado" }, { status: 404 });
  }

  const equipo = await prisma.mantEquipo.findUnique({
    where: { id: c.equipo_id },
    select: { tipo: true },
  });

  const data: ChecklistPDFData = {
    correlativo: c.correlativo,
    fecha: c.fecha,
    tipoMantencion: c.tipo_mantencion,
    empresa: c.empresa,
    patente: c.patente_snapshot,
    tipoEquipo: equipo?.tipo ?? c.equipo,
    km: c.km_snapshot,
    horometro: c.horometro_snapshot,
    proximaMantencion: c.proxima_mantencion,
    encargado: c.responsable,
    items: (c.items as ChecklistMantData | null) ?? null,
    observaciones: c.observaciones_generales,
  };

  let buffer: Buffer;
  try {
    const element = React.createElement(ChecklistMantencionDocument, {
      data,
    }) as React.ReactElement;
    buffer = await renderToBuffer(element);
  } catch (err) {
    console.error(
      "[checklist-mant-pdf] Error generando PDF:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="checklist-mantencion-${c.correlativo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
