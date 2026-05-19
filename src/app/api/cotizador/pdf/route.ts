export const dynamic = "force-dynamic";

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getCompanySettings } from "@/lib/company-settings";
import { calcularCotizacion, type CotizadorInput } from "@/lib/cotizador";
import { CotizadorDocument } from "@/lib/pdf/cotizador-template";

const gastosSchema = z.object({
  combustible: z.number().min(0).default(0),
  operador:    z.number().min(0).default(0),
  traslado:    z.number().min(0).default(0),
  peajes:      z.number().min(0).default(0),
  viaticos:    z.number().min(0).default(0),
  alojamiento: z.number().min(0).default(0),
  mantencion:  z.number().min(0).default(0),
  seguro:      z.number().min(0).default(0),
  otros:       z.number().min(0).default(0),
});

const itemSchema = z.object({
  id:                  z.string().min(1).max(100),
  equipo:              z.string().max(200).default(""),
  tipo:                z.enum(["horas", "dias"]),
  valorHora:           z.number().min(0).max(1_000_000_000),
  horasMinimasDiarias: z.number().int().min(1).max(24),
  cantidadHoras:       z.number().min(0).max(100_000),
  cantidadDias:        z.number().min(0).max(10_000),
});

const inputSchema = z.object({
  items:               z.array(itemSchema).min(1).max(50),
  gastos:              gastosSchema,
  porcentajeDescuento: z.number().min(0).max(100),
  ivaPorcentaje:       z.number().min(0).max(100),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let parsed: z.infer<typeof inputSchema>;
  try {
    parsed = inputSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const input: CotizadorInput = {
    items:               parsed.items,
    gastos:              parsed.gastos,
    porcentajeDescuento: parsed.porcentajeDescuento,
    ivaPorcentaje:       parsed.ivaPorcentaje,
  };
  const result = calcularCotizacion(input);

  const config = await getCompanySettings();

  let buffer: Buffer;
  try {
    const element = React.createElement(CotizadorDocument, {
      data: {
        input,
        result,
        fecha: new Date(),
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
    console.error("[cotizador-pdf] Error generando PDF:", err);
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }

  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="presupuesto-arriendo-solterra-${yyyymmdd}.pdf"`,
      "Cache-Control":       "no-store",
    },
  });
}
