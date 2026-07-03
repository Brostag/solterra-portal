export const dynamic = "force-dynamic";

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getCompanySettings } from "@/lib/company-settings";
import { prisma } from "@/lib/prisma";
import {
  calcularCotizacion,
  GASTOS_INICIALES,
  type CotizadorInput,
  type GastosGenerales,
  type TipoCotizacion,
} from "@/lib/cotizador";
import { CotizadorDocument } from "@/lib/pdf/cotizador-template";

// Normaliza el JSON de gastos guardado a la forma fija GastosGenerales (fallback 0).
function normalizarGastos(raw: unknown): GastosGenerales {
  const g = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    combustible: num(g.combustible),
    operador:    num(g.operador),
    traslado:    num(g.traslado),
    peajes:      num(g.peajes),
    viaticos:    num(g.viaticos),
    alojamiento: num(g.alojamiento),
    mantencion:  num(g.mantencion),
    seguro:      num(g.seguro),
    otros:       num(g.otros),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session, "COMERCIAL")) {
    return NextResponse.json({ error: "Sin acceso a este módulo" }, { status: 403 });
  }

  const { id } = await params;
  const [cotizacion, config] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: { items: { orderBy: { orden: "asc" } } },
    }),
    getCompanySettings(),
  ]);
  if (!cotizacion) {
    return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
  }

  // Reconstruye el input desde la DB y re-ejecuta el cálculo (fuente de verdad).
  const input: CotizadorInput = {
    items: cotizacion.items.map((it) => ({
      id: it.id,
      equipo: it.descripcion,
      tipo: (it.tipo === "dias" ? "dias" : "horas") as TipoCotizacion,
      valorHora: Number(it.valor_hora),
      horasMinimasDiarias: it.horas_minimas_diarias,
      cantidadHoras: Number(it.cantidad_horas),
      cantidadDias: Number(it.cantidad_dias),
    })),
    gastos: cotizacion.items.length ? normalizarGastos(cotizacion.gastos) : GASTOS_INICIALES,
    porcentajeDescuento: Number(cotizacion.descuento_porcentaje),
    ivaPorcentaje: Number(cotizacion.iva_porcentaje),
  };
  const result = calcularCotizacion(input);

  const cliente = cotizacion.cliente_nombre_snapshot
    ? {
        nombre: cotizacion.cliente_nombre_snapshot,
        rut: cotizacion.cliente_rut_snapshot,
        giro: cotizacion.cliente_giro_snapshot,
        direccion: cotizacion.cliente_direccion_snapshot,
        email: cotizacion.cliente_email_snapshot,
        telefono: cotizacion.cliente_telefono_snapshot,
      }
    : null;

  let buffer: Buffer;
  try {
    const element = React.createElement(CotizadorDocument, {
      data: {
        input,
        result,
        numero: cotizacion.numero,
        fecha: cotizacion.fecha_emision,
        cliente,
        company: {
          razon_social: config?.razon_social ?? "Solterra",
          rut:          config?.rut ?? "—",
          giro:         config?.giro ?? null,
          direccion:    config?.direccion ?? null,
          email:        config?.email ?? null,
          telefono:     config?.telefono ?? null,
        },
      },
    }) as React.ReactElement;
    buffer = await renderToBuffer(element);
  } catch (err) {
    console.error("[cotizacion-pdf] Error generando PDF:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }

  const safeNum = cotizacion.numero.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="cotizacion-solterra-${safeNum || "s-n"}.pdf"`,
      "Cache-Control":       "no-store",
    },
  });
}
